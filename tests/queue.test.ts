// Real PostgreSQL + real worker processes. Lease = 2 s in tests (WORKER_LEASE_S).
import { spawn, type ChildProcess } from 'node:child_process';
import { afterAll, describe, expect, it } from 'vitest';
import { one, tx } from '../src/server/db';
import { claim, enqueue, fail, fenced, LeaseLost, retryDead, TransientError } from '../src/server/queue';
import { owner } from './helpers';

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const procs: ChildProcess[] = [];
const startWorker = () => {
  const p = spawn(process.execPath, ['--import', 'tsx', 'src/worker/main.ts'], { env: { ...process.env, NODE_ENV: 'test' }, stdio: ['ignore', 'ignore', 'pipe'] });
  p.stderr!.on('data', (d) => process.stderr.write('[worker] ' + d));
  procs.push(p);
  return p;
};
const kill = (p: ChildProcess) => new Promise<void>((r) => { if (p.exitCode !== null || p.signalCode) return r(); p.once('exit', () => r()); p.kill('SIGKILL'); });
afterAll(async () => { for (const p of procs) if (p.exitCode === null) await kill(p); });

const probe = (key: string, sleep_ms = 0) => tx((c) => enqueue(c, { collegeId: null, kind: 'probe', payload: { key, sleep_ms }, dedupKey: `probe:${key}` }));
const effects = async (key: string) => { const c = await owner(); try { return (await c.query("select count(*)::int n from audit_events where action = 'probe.effect' and target = $1", [key])).rows[0].n; } finally { await c.end(); } };
const jobState = async (key: string) => { const c = await owner(); try { return (await c.query('select state, attempt, lease_generation from jobs where dedup_key = $1', [`probe:${key}`])).rows[0]; } finally { await c.end(); } };
const until = async (fn: () => Promise<boolean>, ms = 30000) => { const t = Date.now(); while (Date.now() - t < ms) { if (await fn()) return; await sleep(250); } throw new Error('timeout'); };

describe('durable queue', () => {
  it('duplicate request (same dedup key) creates one job', async () => {
    const a = await probe('dup');
    const b = await probe('dup');
    expect(a).toBeTruthy();
    expect(b).toBeUndefined();
  });

  it('serverless drain (Vercel) runs every due job to completion, once, with no worker process', async () => {
    const { drain } = await import('../src/worker/main');
    await probe('drain-a'); await probe('drain-b');
    await Promise.all([drain(), drain()]); // two requests' drains at once
    for (const k of ['drain-a', 'drain-b']) {
      expect(await effects(k)).toBe(1);
      expect((await jobState(k)).state).toBe('succeeded');
    }
  });

  it('concurrent claimers never claim the same job twice (SKIP LOCKED)', async () => {
    for (let i = 0; i < 6; i++) await probe(`cc${i}`);
    const claims = (await Promise.all(Array.from({ length: 12 }, (_, i) => claim(`w${i}`)))).filter(Boolean);
    const ids = claims.map((j) => j!.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const j of claims) await fenced(j!, async () => {}, 'succeeded');
  });

  it('expired lease is recovered; the stale worker cannot finalize (fencing)', async () => {
    await drainProbes();
    await probe('lease');
    const first = await claim('stale-worker', 1);
    expect(first?.payload.key).toBe('lease');
    await sleep(1500);
    const second = await claim('fresh-worker', 5);
    expect(second?.id).toBe(first!.id);
    expect(second!.lease_generation).toBe(first!.lease_generation + 1);
    await expect(fenced(first!, async () => {}, 'succeeded')).rejects.toBeInstanceOf(LeaseLost);
    await fenced(second!, async () => {}, 'succeeded');
    expect((await jobState('lease')).state).toBe('succeeded');
  });

  it('transient errors retry with backoff; exhausted retries dead-letter; operator can retry', async () => {
    await drainProbes();
    await probe('flaky');
    for (let i = 0; i < 3; i++) {
      const c = await owner(); await c.query("update jobs set run_at = now() where dedup_key = 'probe:flaky'"); await c.end();
      const j = await claim('w', 5);
      expect(j?.attempt).toBe(i + 1);
      await fail(j!, new TransientError('503'));
    }
    const s = await jobState('flaky');
    expect(s).toMatchObject({ state: 'dead', attempt: 3 });
    const c = await owner();
    const id = (await c.query("select id from jobs where dedup_key = 'probe:flaky'")).rows[0].id;
    await c.end();
    expect(await tx((cc) => retryDead(cc, id))).toBeTruthy();
    expect((await jobState('flaky')).state).toBe('queued');
    await tx((cc) => cc.query("update jobs set state = 'cancelled' where id = $1", [id]));
  });

  it('permanent errors dead-letter immediately', async () => {
    await drainProbes();
    await probe('perm');
    const j = await claim('w', 5);
    await fail(j!, new Error('validation'));
    expect(await jobState('perm')).toMatchObject({ state: 'dead', attempt: 1 });
  });

  it('worker process killed mid-job: another worker recovers it, exactly one durable effect', async () => {
    await drainProbes();
    await probe('crash', 4000);
    const w1 = startWorker();
    await until(async () => (await jobState('crash')).state === 'running');
    await kill(w1);
    const w2 = startWorker();
    await until(async () => (await jobState('crash')).state === 'succeeded', 40000);
    await kill(w2);
    const s = await jobState('crash');
    expect(s.attempt).toBe(2);
    expect(await effects('crash')).toBe(1);
  }, 90000);

  it('two worker processes share a batch: every job done once, effects not duplicated', async () => {
    const keys = Array.from({ length: 8 }, (_, i) => `pair${i}`);
    for (const k of keys) await probe(k, 300);
    const [a, b] = [startWorker(), startWorker()];
    await until(async () => (await Promise.all(keys.map(jobState))).every((s) => s.state === 'succeeded'), 40000);
    await Promise.all([kill(a), kill(b)]);
    for (const k of keys) expect(await effects(k)).toBe(1);
    const c = await owner();
    const workers = (await c.query("select count(distinct target) n, count(distinct result) w from audit_events where action = 'probe.effect' and target like 'pair%'")).rows[0];
    await c.end();
    expect(Number(workers.n)).toBe(8);
    expect(Number(workers.w)).toBe(2); // both processes did work
  }, 90000);
});

async function drainProbes() {
  const c = await owner();
  await c.query("update jobs set state = 'cancelled' where state in ('queued','running')");
  await c.end();
}
