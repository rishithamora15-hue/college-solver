// Create or update a sign-in. Run as the database owner:
//   npm run user:add -- admin     <email> <password> "<display name>"
//   npm run user:add -- placement <email> <password> "<display name>"
//   npm run user:add -- faculty   <email> <password> "<display name>"
//   npm run user:add -- student   <college email> <roll number> "<display name>"   (student row must already exist with that roll number)
// Uses the first college unless COLLEGE_ID is set.
import { randomUUID } from 'node:crypto';
import pg from 'pg';
import { createLogin, setLoginPassword } from '../src/server/auth';
import type { AppError } from '../src/server/errors';
import { pgConn } from '../src/server/pgconn';

const [role, email, password, name] = process.argv.slice(2);
if (!['admin', 'placement', 'faculty', 'student'].includes(role) || !email?.includes('@') || !password) {
  console.error('usage: npm run user:add -- <admin|placement|faculty|student> <email> <password|roll number> "<display name>"');
  process.exit(1);
}
const c = new pg.Client(pgConn());
await c.connect();
let login: Awaited<ReturnType<typeof createLogin>> | undefined;
try {
  await c.query('begin');
  const college = process.env.COLLEGE_ID ?? (await c.query('select id from colleges order by name limit 1')).rows[0]?.id;
  if (!college) throw new Error('No college exists yet');
  const secret = role === 'student' ? password.trim().toUpperCase() : password;
  let user = (await c.query('select id, auth_subject from app_users where email = $1', [email.toLowerCase()])).rows[0];
  if (user) {
    let hash: string | null;
    try {
      hash = await setLoginPassword(user.auth_subject, secret);
    } catch (e) {
      if ((e as AppError).code !== 'login_missing') throw e;
      // Deleted in the Supabase dashboard: recreate the sign-in and point the existing user (and their data) at it.
      login = await createLogin(email.toLowerCase(), secret);
      await c.query('update app_users set auth_subject = $2 where id = $1', [user.id, login.subject]);
      hash = login.hash;
    }
    await c.query(`update app_users set password_hash = $2, display_name = coalesce(nullif($3, ''), display_name) where id = $1`,
      [user.id, hash, name ?? '']);
  } else {
    login = await createLogin(email.toLowerCase(), secret);
    user = (await c.query('insert into app_users (id, auth_subject, email, display_name, password_hash) values ($1, $2, $3, $4, $5) returning id',
      [randomUUID(), login.subject, email.toLowerCase(), name ?? email, login.hash])).rows[0];
  }
  if (role === 'student') {
    const st = await c.query('update students set user_id = $3 where college_id = $1 and upper(roll_no) = $2 returning id', [college, secret, user.id]);
    if (!st.rowCount) throw new Error(`No student with roll number ${secret} in this college`);
  }
  await c.query(`insert into memberships (college_id, user_id, role) values ($1, $2, $3) on conflict (college_id, user_id, role) do update set status = 'active'`, [college, user.id, role]);
  await c.query('commit');
  console.log(`${role} sign-in ready: ${email.toLowerCase()}`);
} catch (e) {
  await c.query('rollback');
  await login?.undo();
  console.error((e as Error).message);
  process.exitCode = 1;
} finally {
  await c.end();
}
