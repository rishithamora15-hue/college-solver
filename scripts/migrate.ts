// Controlled release step: applies db/migrations/*.sql in order, each in its own transaction, as the owner role.
import { readdirSync, readFileSync } from 'node:fs';
import pg from 'pg';

export async function migrate(url = process.env.DATABASE_URL) {
  const c = new pg.Client({ connectionString: url });
  await c.connect();
  try {
    await c.query('create table if not exists schema_migrations (name text primary key, applied_at timestamptz not null default now())');
    const done = new Set((await c.query('select name from schema_migrations')).rows.map((r) => r.name));
    for (const f of readdirSync('db/migrations').filter((f) => f.endsWith('.sql')).sort()) {
      if (done.has(f)) continue;
      await c.query('begin');
      try {
        await c.query(readFileSync(`db/migrations/${f}`, 'utf8'));
        await c.query('insert into schema_migrations (name) values ($1)', [f]);
        await c.query('commit');
        console.log('applied', f);
      } catch (e) {
        await c.query('rollback');
        throw e;
      }
    }
  } finally {
    await c.end();
  }
}

if (process.argv[1]?.endsWith('migrate.ts')) migrate().catch((e) => { console.error(e.message); process.exit(1); });
