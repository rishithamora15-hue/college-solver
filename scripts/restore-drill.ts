// Local backup/restore rehearsal (cold physical copy). Hosted DB backups are the provider's; rehearse those separately.
import { cpSync, rmSync } from 'node:fs';
import pg from 'pg';
import { startPg } from './local-db';
import { migrate } from './migrate';
import { seed } from './seed';

const RECON = `select (select count(*) from colleges) colleges, (select count(*) from students) students,
  (select count(*) from complaints) complaints, (select coalesce(sum(amount_paise),0) from fee_assessments) assessed_paise,
  (select coalesce(sum(amount_paise),0) from payments where status = 'settled') settled_paise,
  (select count(*) from documents) docs, (select md5(string_agg(content_hash, ',' order by id)) from documents) docs_md5,
  (select count(*) from pg_policies) rls_policies`;
const query = async (port: number, sql: string) => {
  const c = new pg.Client({ connectionString: `postgres://postgres:postgres@localhost:${port}/college_drill` });
  await c.connect();
  try { const r: any = await c.query(sql); return Array.isArray(r) ? r.at(-1).rows : r.rows; } finally { await c.end(); }
};

rmSync('.data/pg-drill', { recursive: true, force: true });
rmSync('.data/pg-drill-restore', { recursive: true, force: true });
const src = await startPg('.data/pg-drill', 54332, ['college_drill']);
await migrate('postgres://postgres:postgres@localhost:54332/college_drill');
await seed('postgres://postgres:postgres@localhost:54332/college_drill');
const before = (await query(54332, RECON))[0];
await src.stop();

const t0 = Date.now();
cpSync('.data/pg-drill', '.data/pg-drill-restore', { recursive: true }); // backup artifact
const dst = await startPg('.data/pg-drill-restore', 54333, []);
const after = (await query(54333, RECON))[0];
const rls = (await query(54333, 'set role app_rw; select count(*)::int n from students'))[0].n;
const ms = Date.now() - t0;
await dst.stop();

const match = JSON.stringify(before) === JSON.stringify(after);
console.log(JSON.stringify({ before, after, match, restore_ms: ms, app_rw_rows_without_tenant: rls }, null, 1));
process.exit(match ? 0 : 1);
