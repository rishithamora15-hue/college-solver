// Local development PostgreSQL (real binaries via embedded-postgres). Not used in hosted environments.
import EmbeddedPostgres from 'embedded-postgres';
import { existsSync } from 'node:fs';

export async function startPg(dir: string, port: number, dbs: string[]) {
  const pg = new EmbeddedPostgres({ databaseDir: dir, user: 'postgres', password: 'postgres', port, persistent: true,
    // PG18 io_worker children outlive stop() on Windows and hold the port/shared memory; sync I/O spawns none.
    postgresFlags: ['-c', 'io_method=sync'] });
  if (!existsSync(dir + '/PG_VERSION')) await pg.initialise();
  await pg.start();
  for (const d of dbs) await pg.createDatabase(d).catch(() => {}); // already exists
  return pg;
}

if (process.argv[1]?.endsWith('local-db.ts')) {
  const pg = await startPg('.data/pg', 54329, ['college']);
  console.log('PostgreSQL on postgres://postgres:postgres@localhost:54329/college — Ctrl+C to stop');
  const stop = async () => { await pg.stop(); process.exit(0); };
  process.on('SIGINT', stop);
  process.on('SIGTERM', stop);
}
