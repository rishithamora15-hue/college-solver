import pg from 'pg';
import { env } from './env';

// int8 (bigint paise) -> number: exact up to 2^53 paise.
pg.types.setTypeParser(20, Number);
// numeric (CGPA, marks) -> number: small decimals only; money never uses numeric.
pg.types.setTypeParser(1700, parseFloat);

export type Db = pg.PoolClient;
export type Scope = { collegeId: string; userId?: string };

let pool: pg.Pool | undefined;
export function getPool() {
  if (!pool) {
    pool = new pg.Pool({ connectionString: env().DATABASE_URL, max: 10, connectionTimeoutMillis: 5000 });
    pool.on('error', (e) => console.error(JSON.stringify({ level: 'error', msg: 'pg_pool_error', err: e.message })));
  }
  return pool;
}

/**
 * Runtime transaction. Always drops to least-privilege role app_rw so RLS applies;
 * scope pins tenant (and user) for the transaction only.
 */
export async function tx<T>(fn: (c: Db) => Promise<T>, scope?: Scope): Promise<T> {
  const c = await getPool().connect();
  try {
    await c.query('begin');
    await c.query('set local role app_rw');
    await c.query("select set_config('app.college_id', $1, true), set_config('app.user_id', $2, true)", [
      scope?.collegeId ?? '',
      scope?.userId ?? '',
    ]);
    const r = await fn(c);
    await c.query('commit');
    return r;
  } catch (e) {
    await c.query('rollback').catch(() => {});
    throw e;
  } finally {
    c.release();
  }
}

export async function one<T = any>(c: Db, sql: string, params: unknown[] = []): Promise<T | undefined> {
  return (await c.query(sql, params)).rows[0];
}
export async function many<T = any>(c: Db, sql: string, params: unknown[] = []): Promise<T[]> {
  return (await c.query(sql, params)).rows;
}

export async function audit(c: Db, a: { collegeId: string | null; actor: string | null; action: string; target: string; result: string }) {
  await c.query('insert into audit_events (college_id, actor_user_id, action, target, result) values ($1,$2,$3,$4,$5)', [
    a.collegeId, a.actor, a.action, a.target, a.result,
  ]);
}

export async function flagEnabled(c: Db, name: string) {
  return (await one<{ enabled: boolean }>(c, 'select enabled from feature_flags where name = $1', [name]))?.enabled === true;
}
