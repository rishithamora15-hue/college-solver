import { rmSync } from 'node:fs';
import { startPg } from '../scripts/local-db';
import { migrate } from '../scripts/migrate';
import { seed } from '../scripts/seed';

export default async function () {
  rmSync('.data/pg-test', { recursive: true, force: true });
  const pg = await startPg('.data/pg-test', 54330, ['college_test']);
  const url = 'postgres://postgres:postgres@localhost:54330/college_test';
  await migrate(url);
  await seed(url);
  return async () => { await pg.stop(); };
}
