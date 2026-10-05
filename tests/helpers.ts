import pg from 'pg';
import { resolveActor, type Actor } from '../src/server/auth';
import { claim, type Job } from '../src/server/queue';
import { runJob } from '../src/worker/main';

export const owner = () => { const c = new pg.Client({ connectionString: process.env.DATABASE_URL }); return c.connect().then(() => c); };
export const actor = async (h: string) => (await resolveActor('demo:' + h)) as Actor;

/** Process queued jobs in-process (same code path as the worker) until none remain claimable. */
export async function drain(max = 50) {
  const done: Job[] = [];
  for (let i = 0; i < max; i++) {
    const j = await claim('test-worker');
    if (!j) break;
    await runJob(j);
    done.push(j);
  }
  return done;
}
