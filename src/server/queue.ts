// PostgreSQL durable queue. Delivery is AT-LEAST-ONCE; effects are made idempotent with unique keys
// and fenced by lease_generation so an expired/stale worker can never finalize.
import { one, tx, type Db } from './db';

export type Job = {
  id: string; college_id: string | null; kind: string; payload: any;
  attempt: number; max_attempts: number; lease_generation: number;
};
export class TransientError extends Error {}
export class LeaseLost extends Error {}

export const LEASE_S = Number(process.env.WORKER_LEASE_S ?? 60);

/** Same transaction as the domain intent => the job table is the transactional outbox. */
export async function enqueue(c: Db, j: { collegeId: string | null; kind: string; payload: unknown; dedupKey: string; runAt?: Date; maxAttempts?: number }) {
  const r = await one(c, `insert into jobs (college_id, kind, payload, dedup_key, run_at, max_attempts)
    values ($1,$2,$3,$4,coalesce($5, now()),$6) on conflict (dedup_key) do nothing returning id`,
    [j.collegeId, j.kind, JSON.stringify(j.payload), j.dedupKey, j.runAt ?? null, j.maxAttempts ?? 3]);
  return r?.id as string | undefined;
}

/** Short claim transaction. Also recovers expired leases (crashed worker). */
export async function claim(workerId: string, leaseS = LEASE_S): Promise<Job | null> {
  return (await tx((c) => one<Job>(c, `
    update jobs set state = 'running', attempt = attempt + 1, lease_generation = lease_generation + 1,
      locked_until = now() + make_interval(secs => $2), worker_id = $1, updated_at = now()
    where id = (
      select id from jobs
      where (state = 'queued' and run_at <= now()) or (state = 'running' and locked_until < now())
      order by run_at for update skip locked limit 1)
    returning id, college_id, kind, payload, attempt, max_attempts, lease_generation`, [workerId, leaseS]))) ?? null;
}

export async function heartbeat(job: Job, leaseS = LEASE_S): Promise<boolean> {
  const r = await tx((c) => one(c, `update jobs set locked_until = now() + make_interval(secs => $3), updated_at = now()
    where id = $1 and lease_generation = $2 and state = 'running' returning 1`, [job.id, job.lease_generation, leaseS]));
  return !!r;
}

/** Run fn only while this worker still holds the lease (row-locked compare on lease_generation). */
export async function fenced<T>(job: Job, fn: (c: Db) => Promise<T>, finalState?: 'succeeded' | 'cancelled'): Promise<T> {
  return tx(async (c) => {
    const held = await one(c, `select 1 from jobs where id = $1 and lease_generation = $2 and state = 'running' and locked_until > now() for update`, [job.id, job.lease_generation]);
    if (!held) throw new LeaseLost(`lease lost for job ${job.id}`);
    const r = await fn(c);
    if (finalState) await c.query(`update jobs set state = $2, locked_until = null, updated_at = now() where id = $1`, [job.id, finalState]);
    return r;
  }, { collegeId: job.college_id ?? '' });
}

export const sanitize = (e: unknown) => String((e as Error)?.message ?? e).replace(/sk-[\w-]+/g, '[redacted]').slice(0, 300);

/** Transient => requeue with exponential backoff + jitter until max_attempts; otherwise dead-letter. */
export async function fail(job: Job, err: unknown, onDead?: (c: Db) => Promise<void>) {
  const transient = err instanceof TransientError && job.attempt < job.max_attempts;
  const delayS = 2 ** job.attempt + Math.random();
  try {
    await fenced(job, async (c) => {
      if (!transient && onDead) await onDead(c);
      await c.query(`update jobs set state = $2, run_at = now() + make_interval(secs => $3), locked_until = null, last_error = $4, updated_at = now() where id = $1`,
        [job.id, transient ? 'queued' : 'dead', delayS, sanitize(err)]);
    });
  } catch (e) {
    if (!(e instanceof LeaseLost)) throw e; // another worker owns it now; nothing to record
  }
}

/** Operator action: retry a dead job as a fresh attempt series, preserving last_error history in audit. */
export async function retryDead(c: Db, jobId: string) {
  return one(c, `update jobs set state = 'queued', attempt = 0, run_at = now(), updated_at = now() where id = $1 and state = 'dead' returning id`, [jobId]);
}
