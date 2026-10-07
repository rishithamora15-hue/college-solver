// First-time setup on a real (empty) database: create the college and its first administrator. Run once, as the owner:
//   npm run setup -- "<College name>" <admin email> <password> "<Admin name>"
// Everything else (branches, syllabus, students, staff, fees, schemes, jobs) is then entered in the app by the administrator.
import { randomUUID } from 'node:crypto';
import pg from 'pg';
import { createLogin } from '../src/server/auth';
import { pgConn } from '../src/server/pgconn';

export async function setupCollege(url: string, i: { college: string; email: string; password: string; name: string }) {
  if (i.college.trim().length < 3 || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(i.email) || i.password.length < 10 || !i.name.trim())
    throw new Error('Give a college name, a valid email, a password of at least 10 characters and the administrator\'s name');
  const c = new pg.Client(pgConn(url));
  await c.connect();
  let login: Awaited<ReturnType<typeof createLogin>> | undefined;
  try {
    await c.query('begin');
    if ((await c.query('select 1 from app_users where lower(email) = lower($1)', [i.email])).rowCount) throw new Error(`${i.email} already has an account`);
    const college = randomUUID(), admin = randomUUID();
    login = await createLogin(i.email.toLowerCase(), i.password); // AUTH_MODE=supabase: the admin is created in Supabase Auth
    await c.query(`insert into colleges (id, name) values ($1, $2)`, [college, i.college.trim()]);
    await c.query('insert into app_users (id, auth_subject, email, display_name, password_hash) values ($1,$2,$3,$4,$5)',
      [admin, login.subject, i.email.toLowerCase(), i.name.trim(), login.hash]);
    await c.query(`insert into memberships (college_id, user_id, role) values ($1, $2, 'admin')`, [college, admin]);
    // Complaint routing needs a scholarship and a fees desk; the administrator can rename or add more under College setup.
    await c.query(`insert into departments (id, college_id, name, handles, contact_label) values ($1,$3,'Scholarship Cell','scholarship','Scholarship Cell'),($2,$3,'Accounts Office','fees','Accounts Office')`,
      [randomUUID(), randomUUID(), college]);
    await c.query('commit');
    return { college, admin };
  } catch (e) {
    await c.query('rollback');
    await login?.undo();
    throw e;
  } finally {
    await c.end();
  }
}

/** Exit 0 when at least one college exists (run.sh uses it to decide whether to print setup instructions). */
async function hasCollege(url: string) {
  const c = new pg.Client(pgConn(url));
  await c.connect();
  try { return !!(await c.query('select 1 from colleges limit 1')).rowCount; } finally { await c.end(); }
}

if (process.argv[1]?.replace(/\\/g, '/').endsWith('scripts/setup.ts')) {
  const [college, email, password, name] = process.argv.slice(2);
  if (college === '--check') hasCollege(process.env.DATABASE_URL ?? '').then((ok) => process.exit(ok ? 0 : 1), () => process.exit(1));
  else setupCollege(process.env.DATABASE_URL ?? '', { college: college ?? '', email: email ?? '', password: password ?? '', name: name ?? '' })
    .then(() => console.log(`Ready. Sign in at /signin (Faculty & Staff) as ${email.toLowerCase()} and open College setup.`))
    .catch((e) => { console.error((e as Error).message); process.exit(1); });
}
