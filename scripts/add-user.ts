// Create or update a sign-in. Run as the database owner:
//   npm run user:add -- admin     <email> <password> "<display name>"
//   npm run user:add -- placement <email> <password> "<display name>"
//   npm run user:add -- faculty   <email> <password> "<display name>"
//   npm run user:add -- student   <college email> <roll number> "<display name>"   (student row must already exist with that roll number)
// Uses the first college unless COLLEGE_ID is set.
import { randomUUID } from 'node:crypto';
import pg from 'pg';
import { hashPassword } from '../src/server/auth';

const [role, email, password, name] = process.argv.slice(2);
if (!['admin', 'placement', 'faculty', 'student'].includes(role) || !email?.includes('@') || !password) {
  console.error('usage: npm run user:add -- <admin|placement|faculty|student> <email> <password|roll number> "<display name>"');
  process.exit(1);
}
const c = new pg.Client({ connectionString: process.env.DATABASE_URL });
await c.connect();
try {
  await c.query('begin');
  const college = process.env.COLLEGE_ID ?? (await c.query('select id from colleges order by name limit 1')).rows[0]?.id;
  if (!college) throw new Error('No college exists yet');
  const secret = role === 'student' ? password.trim().toUpperCase() : password;
  const user = (await c.query(`insert into app_users (id, auth_subject, email, display_name, password_hash) values ($1, $2, $3, $4, $5)
    on conflict (email) do update set password_hash = excluded.password_hash, display_name = coalesce(nullif($4, ''), app_users.display_name) returning id`,
  [randomUUID(), 'local:' + randomUUID(), email.toLowerCase(), name ?? email, await hashPassword(secret)])).rows[0];
  if (role === 'student') {
    const st = await c.query('update students set user_id = $3 where college_id = $1 and upper(roll_no) = $2 returning id', [college, secret, user.id]);
    if (!st.rowCount) throw new Error(`No student with roll number ${secret} in this college`);
  }
  await c.query(`insert into memberships (college_id, user_id, role) values ($1, $2, $3) on conflict (college_id, user_id, role) do update set status = 'active'`, [college, user.id, role]);
  await c.query('commit');
  console.log(`${role} sign-in ready: ${email.toLowerCase()}`);
} catch (e) {
  await c.query('rollback');
  console.error((e as Error).message);
  process.exitCode = 1;
} finally {
  await c.end();
}
