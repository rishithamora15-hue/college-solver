// Separately runnable worker process: `npm run worker`. Safe to run N replicas.
import { hostname } from 'node:os';
import { randomUUID } from 'node:crypto';
import { env } from '../server/env';
import { many, tx } from '../server/db';
import { claim, enqueue, fail, fenced, heartbeat, LEASE_S, LeaseLost, sanitize, type Job } from '../server/queue';
import { executeRun, markRunFailed } from '../server/runs';
import { complaintNotify, reminderSweep } from '../server/notify';

const workerId = `${hostname()}:${process.pid}:${randomUUID().slice(0, 8)}`;
const log = (o: Record<string, unknown>) => console.log(JSON.stringify({ t: new Date().toISOString(), worker: workerId, ...o }));

export const HANDLERS: Record<string, (job: Job, signal: AbortSignal) => Promise<unknown>> = {
  ai_run: executeRun,
  complaint_notify: (job) => fenced(job, (c) => complaintNotify(c, job.college_id!, job.payload), 'succeeded'),
  reminder_sweep: async (job) => {
    const colleges = await tx((c) => many(c, 'select id from colleges'));
    for (const col of colleges) await enqueue_(col.id, job.payload.day);
    return fenced(job, async () => {}, 'succeeded');
  },
  reminder_college: (job) => fenced(job, (c) => reminderSweep(c, job.college_id!, job.payload.day), 'succeeded'),
  // Probe used by deployment smoke tests and recovery tests: optional sleep, then one idempotent effect.
  probe: async (job, signal) => {
    if (job.payload.sleep_ms) await new Promise((r, j) => { const t = setTimeout(r, job.payload.sleep_ms); signal.addEventListener('abort', () => { clearTimeout(t); j(new LeaseLost('aborted')); }); });
    return fenced(job, (c) => c.query(`insert into audit_events (college_id, actor_user_id, action, target, result) values (null, null, 'probe.effect', $1, $2)`, [job.payload.key, workerId]), 'succeeded');
  },
};
const enqueue_ = (collegeId: string, day: string) =>
  tx((c) => enqueue(c, { collegeId, kind: 'reminder_college', payload: { day }, dedupKey: `reminder_college:${collegeId}:${day}` }), { collegeId });

export async function runJob(job: Job) {
  const ac = new AbortController();
  const hb = setInterval(async () => {
    try { if (!(await heartbeat(job))) ac.abort(); } catch { /* transient db error: lease may expire and be recovered */ }
  }, (LEASE_S * 1000) / 4);
  const t0 = Date.now();
  try {
    if (job.attempt > job.max_attempts) throw new Error('max_attempts_exceeded');
    const h = HANDLERS[job.kind];
    if (!h) throw new Error(`unknown job kind ${job.kind}`);
    await h(job, ac.signal);
    log({ msg: 'job_done', job: job.id, kind: job.kind, attempt: job.attempt, ms: Date.now() - t0 });
  } catch (e) {
    if (e instanceof LeaseLost) { log({ msg: 'lease_lost', job: job.id }); return; }
    log({ msg: 'job_error', job: job.id, kind: job.kind, attempt: job.attempt, err: String((e as Error).message).slice(0, 200) });
    await fail(job, e, job.kind === 'ai_run' ? (c) => markRunFailed(c, job.payload.run_id, sanitize(e)).then(() => {}) : undefined);
  } finally {
    clearInterval(hb);
  }
}

export const enqueueDailySweep = (day = new Date().toISOString().slice(0, 10)) =>
  tx((c) => enqueue(c, { collegeId: null, kind: 'reminder_sweep', payload: { day }, dedupKey: `reminder_sweep:${day}` }));

/**
 * Serverless mode (Vercel has no long-running worker): after an API request, run due jobs until none are left or the
 * budget is spent. Leases make drains in many instances at once safe; a drain cut off mid-job is recovered by the next
 * one when its lease expires. Retries (2 s, 4 s backoff) are picked up by the page's own polling requests.
 */
let draining = 0;
export async function drain(budgetMs = 45_000) {
  if (draining >= env().WORKER_CONCURRENCY) return;
  draining++;
  try {
    const end = Date.now() + budgetMs;
    let job: Job | null;
    while (Date.now() < end && (job = await claim(workerId))) await runJob(job);
  } catch (e) {
    log({ msg: 'drain_error', err: (e as Error).message });
  } finally {
    draining--;
  }
}

export async function main() {
  env(); // fail fast on bad config
  const concurrency = env().WORKER_CONCURRENCY;
  let active = 0, stopping = false, lastSweep = '';
  const stop = () => { stopping = true; log({ msg: 'stopping' }); };
  process.on('SIGTERM', stop);
  process.on('SIGINT', stop);
  log({ msg: 'worker_started', concurrency });
  while (!stopping) {
    const day = new Date().toISOString().slice(0, 10);
    if (day !== lastSweep) {
      await enqueueDailySweep(day).catch(() => {});
      lastSweep = day;
    }
    if (active >= concurrency) { await sleep(200); continue; }
    let job: Job | null = null;
    try { job = await claim(workerId); } catch (e) { log({ msg: 'claim_error', err: (e as Error).message }); await sleep(2000); continue; }
    if (!job) { await sleep(1000); continue; }
    active++;
    runJob(job).finally(() => active--);
  }
  while (active > 0) await sleep(200); // drain; unfinished leases expire and are recovered elsewhere
  log({ msg: 'worker_stopped' });
  process.exit(0);
}
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

if (process.argv[1]?.replace(/\\/g, '/').endsWith('worker/main.ts')) main();
