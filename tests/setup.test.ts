// Real-data path: hosted-database TLS rules, fixture guard, Supabase Data API lockdown, and a brand-new college set up
// entirely through the app (no fixtures): syllabus, staff, students, scholarship case, backlog.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { ID } from '../scripts/seed';
import { seed } from '../scripts/seed';
import { setupCollege } from '../scripts/setup';
import { tx } from '../src/server/db';
import { resolveActor, type Actor } from '../src/server/auth';
import { pgConn } from '../src/server/pgconn';
import { applySetup as apply, setupInput, setupOverview, studentSetupOptions } from '../src/server/setup';
import { addStudents } from '../src/server/admin';
import { studentSubjects } from '../src/server/learn';
import { feeOverview } from '../src/server/finance';
import { actor, owner } from './helpers';

/** Same validation and normalisation the API route applies. */
const applySetup = (c: Parameters<typeof apply>[0], a: Actor, raw: unknown) => apply(c, a, setupInput.parse(raw));
const S = (a: Actor) => ({ collegeId: a.collegeId, userId: a.userId });
const asOwner = async (sql: string, p: unknown[] = []) => { const c = await owner(); try { return (await c.query(sql, p)).rows; } finally { await c.end(); } };
const byEmail = async (email: string) => resolveActor((await asOwner('select auth_subject from app_users where email = $1', [email]))[0].auth_subject);

describe('hosted database connection', () => {
  const PEM = '-----BEGIN CERTIFICATE-----\nMIIB\n-----END CERTIFICATE-----';
  it('local needs nothing; remote needs TLS; a CA is verified and overrides sslmode in the URL', () => {
    const before = process.env.DATABASE_CA_CERT;
    try {
      delete process.env.DATABASE_CA_CERT;
      expect(pgConn('postgres://u:p@localhost:5432/db')).toEqual({ connectionString: 'postgres://u:p@localhost:5432/db' });
      expect(() => pgConn('postgres://u:p@aws-0-ap-south-1.pooler.supabase.com:5432/postgres')).toThrow(/needs TLS/);
      process.env.DATABASE_CA_CERT = PEM;
      const c = pgConn('postgres://u:p@aws-0-ap-south-1.pooler.supabase.com:5432/postgres?sslmode=require');
      expect(c.connectionString).not.toContain('sslmode');
      expect(c.ssl).toEqual({ ca: PEM, rejectUnauthorized: true });
      expect(pgConn('postgres://u:p@localhost:5432/db')).toEqual({ connectionString: 'postgres://u:p@localhost:5432/db' }); // local ignores the hosted CA
    } finally {
      if (before === undefined) delete process.env.DATABASE_CA_CERT; else process.env.DATABASE_CA_CERT = before;
    }
  });
  it('test fixtures refuse any database that is not on this machine', async () => {
    await expect(seed('postgres://u:p@db.example.supabase.co:5432/postgres')).rejects.toThrow(/only for a local test database/);
  });
  it('migration 007 removes Supabase Data API access (anon/authenticated) from every table', async () => {
    const block = readFileSync('db/migrations/007_real_data_setup.sql', 'utf8').match(/do \$\$[\s\S]*?end \$\$;/)![0];
    await asOwner(`do $$ begin if not exists (select 1 from pg_roles where rolname = 'anon') then create role anon nologin; end if; end $$`);
    try {
      await asOwner('grant select on app_users, jobs to anon');
      expect((await asOwner(`select has_table_privilege('anon', 'app_users', 'select') ok`))[0].ok).toBe(true);
      await asOwner(block);
      expect((await asOwner(`select has_table_privilege('anon', 'app_users', 'select') a, has_table_privilege('anon', 'jobs', 'select') b`))[0]).toEqual({ a: false, b: false });
    } finally {
      await asOwner('drop owned by anon; drop role anon');
    }
  });
});

describe('a new college set up through the app, with no fixtures', () => {
  it('admin builds syllabus, staff, students, a scholarship case and a backlog; tenants stay apart', async () => {
    await setupCollege(process.env.DATABASE_URL!, { college: 'Zeta Institute (test)', email: 'office@zeta.test', password: 'Zeta-Office-2026', name: 'Zeta Office' });
    await expect(setupCollege(process.env.DATABASE_URL!, { college: 'Again', email: 'office@zeta.test', password: 'Zeta-Office-2026', name: 'x' })).rejects.toThrow(/already has an account/);
    const admin = (await byEmail('office@zeta.test'))!;
    expect(admin).toMatchObject({ roles: ['admin'], studentId: null });
    const run = (i: any) => tx((c) => applySetup(c, admin, i), S(admin));

    const branch = await run({ kind: 'branch', code: 'ece', name: 'Electronics and Communication', regulation: 'R22' });
    await expect(run({ kind: 'branch', code: 'ECE', name: 'Dup', regulation: 'R22' })).rejects.toMatchObject({ status: 409 });
    const [cur] = (await tx((c) => setupOverview(c, admin), S(admin))).branches[0].curricula;
    const sub1 = await run({ kind: 'subject', curriculum_id: cur.id, semester: '1', code: 'ec101', name: 'Basic Electronics', topics: 'Diodes, Transistors' });
    await run({ kind: 'subject', curriculum_id: cur.id, semester: '2', code: 'EC201', name: 'Signals and Systems', topics: '' });
    await run({ kind: 'topics', curriculum_subject_id: sub1.id, topics: 'Op-amps\nRectifiers' });
    const scheme = await run({ kind: 'scheme', name: 'State post-matric scholarship', policy_version: 'GO-12', policy_text: 'Released in batches after verification.', requirements: 'Income certificate - within 12 months\nBonafide certificate' });
    await run({ kind: 'staff', display_name: 'Prof. Rao', email: 'RAO@zeta.test', role: 'faculty', password: 'Temporary-123' });

    const o = await tx((c) => setupOverview(c, admin), S(admin));
    expect(o.subjects.map((s: any) => [s.semester, s.code, s.topics])).toEqual([[1, 'EC101', 'Diodes, Transistors, Op-amps, Rectifiers'], [2, 'EC201', '']]);
    expect(o.requirements.map((r: any) => r.name).sort()).toEqual(['Bonafide certificate', 'Income certificate']);
    expect(o.departments.map((d: any) => d.handles).sort()).toEqual(['fees', 'scholarship']);
    const rao = (await byEmail('rao@zeta.test'))!;
    expect(rao).toMatchObject({ collegeId: admin.collegeId, roles: ['faculty'] });

    // Only an active admin of this college can manage staff; the database itself enforces it.
    await expect(tx((c) => c.query(`select set_staff_role($1, 'admin', 'active')`, [rao.userId]), S(rao))).rejects.toThrow(/only an active administrator/);
    const adminA = await actor('fin.a');
    await expect(tx((c) => applySetup(c, adminA, { kind: 'staff_status', user_id: rao.userId, role: 'faculty', status: 'revoked' }), S(adminA))).rejects.toMatchObject({ status: 400 });
    await expect(tx((c) => applySetup(c, adminA, { kind: 'subject', curriculum_id: cur.id, semester: 1, code: 'X1', name: 'Cross tenant', topics: '' }), S(adminA))).rejects.toMatchObject({ status: 404 });
    await run({ kind: 'staff_status', user_id: rao.userId, role: 'faculty', status: 'revoked' });
    expect(await byEmail('rao@zeta.test')).toBeNull(); // revoked access disappears immediately

    await tx((c) => addStudents(c, admin, [{ display_name: 'Lakshmi', email: 'lakshmi@zeta.test', roll_no: '26Z01', branch: 'ECE', semester: 2 }]), S(admin));
    const lak = (await byEmail('lakshmi@zeta.test'))!;
    await run({ kind: 'case', student_id: lak.studentId, scheme_id: scheme.id, academic_year: '2026-27', expected_rupees: '25000' });
    await run({ kind: 'backlog', student_id: lak.studentId, curriculum_subject_id: sub1.id, status: 'active' });
    const fees = await tx((c) => feeOverview(c, lak, lak.studentId!), S(lak));
    expect(fees.cases[0]).toMatchObject({ scheme_name: 'State post-matric scholarship', status: 'applied', expected_paise: 2500000 });
    expect((await tx((c) => studentSubjects(c, lak, lak.studentId!), S(lak))).map((s) => [s.code, s.backlog])).toEqual([['EC201', false], ['EC101', true]]);
    expect((await tx((c) => studentSetupOptions(c, admin, lak.studentId!), S(admin))).subjects.find((s: any) => s.code === 'EC101').backlog).toBe('active');
    expect(branch.id).toBeTruthy();
    await expect(tx((c) => applySetup(c, admin, { kind: 'case', student_id: ID.ashaStudent, scheme_id: scheme.id, academic_year: '2026-27', expected_rupees: 1, status: 'applied' }), S(admin))).rejects.toMatchObject({ status: 404 });
  });
});
