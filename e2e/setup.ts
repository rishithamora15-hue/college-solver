import { spawn } from 'node:child_process';
import { rmSync } from 'node:fs';
import { startPg } from '../scripts/local-db';
import { migrate } from '../scripts/migrate';
import { seed } from '../scripts/seed';
import { E2E_ENV } from '../playwright.config';

/** Fresh DB + synthetic seed + a real worker process (same code as production worker). */
export default async function () {
  rmSync('.data/pg-e2e', { recursive: true, force: true });
  const pg = await startPg('.data/pg-e2e', 54331, ['college_e2e']);
  await migrate(E2E_ENV.DATABASE_URL);
  await seed(E2E_ENV.DATABASE_URL);
  const worker = spawn(process.execPath, ['node_modules/tsx/dist/cli.mjs', 'src/worker/main.ts'], { env: { ...process.env, ...E2E_ENV }, stdio: 'inherit' });
  return async () => {
    worker.kill();
    await new Promise((r) => (worker.exitCode !== null ? r(null) : worker.once('exit', r)));
    await pg.stop();
  };
}
