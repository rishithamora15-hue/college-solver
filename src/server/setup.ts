// College setup by the administration office: branches and syllabus, scholarship schemes, departments, staff accounts,
// and per-student scholarship cases and backlogs. Everything a real college needs before students can use the app.
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { audit, many, one, type Db } from './db';
import { createLogin, type Actor } from './auth';
import { AppError, notFound } from './http';

const text = (max: number, min = 1) => z.string().trim().min(min).max(max);
const lines = (max: number) => z.string().max(max * 200).transform((s) => s.split(/\r?\n|,/).map((x) => x.trim()).filter(Boolean)).pipe(z.array(z.string().max(120)).max(max));
const code = z.string().trim().toUpperCase().regex(/^[A-Z0-9-]{2,12}$/, 'Use 2-12 letters, digits or -');

export const setupInput = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('branch'), code: code, name: text(120, 2), regulation: text(30, 2) }).strict(),
  z.object({ kind: z.literal('regulation'), branch_id: z.uuid(), regulation: text(30, 2) }).strict(),
  z.object({ kind: z.literal('subject'), curriculum_id: z.uuid(), semester: z.coerce.number().int().min(1).max(8), code: code, name: text(120, 2), topics: lines(40).default([]) }).strict(),
  z.object({ kind: z.literal('topics'), curriculum_subject_id: z.uuid(), topics: lines(40) }).strict(),
  z.object({ kind: z.literal('scheme'), name: text(160, 3), policy_version: text(40), policy_text: text(8000, 10), requirements: lines(20).default([]) }).strict(),
  z.object({ kind: z.literal('requirement'), scheme_id: z.uuid(), name: text(120, 2), description: text(300).default('') }).strict(),
  z.object({ kind: z.literal('department'), name: text(120, 2), handles: z.enum(['scholarship', 'fees']), contact_label: text(160, 2) }).strict(),
  z.object({ kind: z.literal('staff'), display_name: text(80), email: z.email().max(200).transform((e) => e.toLowerCase()), role: z.enum(['admin', 'placement', 'faculty']),
    password: z.string().min(10, 'Temporary password: at least 10 characters').max(200) }).strict(),
  z.object({ kind: z.literal('staff_status'), user_id: z.uuid(), role: z.enum(['admin', 'placement', 'faculty']), status: z.enum(['active', 'revoked']) }).strict(),
  z.object({ kind: z.literal('case'), student_id: z.uuid(), scheme_id: z.uuid(), academic_year: z.string().regex(/^\d{4}-\d{2}$/, 'Academic year like 2026-27'),
    expected_rupees: z.coerce.number().int().min(0).max(10_000_000), status: z.enum(['not_applied', 'applied', 'under_verification', 'approved', 'needs_documents']).default('applied') }).strict(),
  z.object({ kind: z.literal('backlog'), student_id: z.uuid(), curriculum_subject_id: z.uuid(), status: z.enum(['active', 'cleared']) }).strict(),
]);
export type SetupInput = z.infer<typeof setupInput>;

const conflict = (msg: string) => new AppError(409, 'exists', msg);
const owned = async (c: Db, a: Actor, table: string, id: string) => { if (!(await one(c, `select 1 from ${table} where college_id = $1 and id = $2`, [a.collegeId, id]))) throw notFound(); };

async function addTopics(c: Db, a: Actor, csId: string, names: string[]) {
  const start = (await one(c, 'select coalesce(max(position), -1) + 1 n from topics where college_id = $1 and curriculum_subject_id = $2', [a.collegeId, csId])).n;
  for (const [i, n] of names.entries()) await c.query('insert into topics (id, college_id, curriculum_subject_id, name, position) values ($1,$2,$3,$4,$5)', [randomUUID(), a.collegeId, csId, n, start + i]);
}

/** One entry point; every branch re-checks that referenced rows belong to the actor's college. */
export async function applySetup(c: Db, a: Actor, i: SetupInput): Promise<{ id: string }> {
  const id = randomUUID();
  switch (i.kind) {
    case 'branch': {
      if (await one(c, 'select 1 from branches where college_id = $1 and upper(code) = $2', [a.collegeId, i.code])) throw conflict(`Branch ${i.code} already exists`);
      await c.query('insert into branches (id, college_id, code, name) values ($1,$2,$3,$4)', [id, a.collegeId, i.code, i.name]);
      await c.query('insert into curricula (id, college_id, branch_id, regulation, version) values ($1,$2,$3,$4,1)', [randomUUID(), a.collegeId, id, i.regulation]);
      break;
    }
    case 'regulation': {
      await owned(c, a, 'branches', i.branch_id);
      // New students of this branch join the newest regulation (highest version); existing students keep theirs.
      await c.query(`insert into curricula (id, college_id, branch_id, regulation, version)
        select $1, $2, $3, $4, coalesce(max(version), 0) + 1 from curricula where college_id = $2 and branch_id = $3`, [id, a.collegeId, i.branch_id, i.regulation]);
      break;
    }
    case 'subject': {
      await owned(c, a, 'curricula', i.curriculum_id);
      const s = await one(c, 'select id from subjects where college_id = $1 and upper(code) = $2', [a.collegeId, i.code])
        ?? await one(c, 'insert into subjects (id, college_id, code, name) values ($1,$2,$3,$4) returning id', [randomUUID(), a.collegeId, i.code, i.name]);
      if (await one(c, 'select 1 from curriculum_subjects where curriculum_id = $1 and subject_id = $2', [i.curriculum_id, s.id])) throw conflict(`${i.code} is already in this syllabus`);
      await c.query('insert into curriculum_subjects (id, college_id, curriculum_id, subject_id, semester) values ($1,$2,$3,$4,$5)', [id, a.collegeId, i.curriculum_id, s.id, i.semester]);
      await addTopics(c, a, id, i.topics);
      break;
    }
    case 'topics': await owned(c, a, 'curriculum_subjects', i.curriculum_subject_id); await addTopics(c, a, i.curriculum_subject_id, i.topics); break;
    case 'scheme': {
      await c.query('insert into schemes (id, college_id, name, policy_text, policy_version) values ($1,$2,$3,$4,$5)', [id, a.collegeId, i.name, i.policy_text, i.policy_version]);
      for (const r of i.requirements) {
        const [name, ...rest] = r.split(/\s+[-–:]\s+/);
        await c.query('insert into document_requirements (id, college_id, scheme_id, name, description) values ($1,$2,$3,$4,$5)', [randomUUID(), a.collegeId, id, name, rest.join(' - ')]);
      }
      break;
    }
    case 'requirement':
      await owned(c, a, 'schemes', i.scheme_id);
      await c.query('insert into document_requirements (id, college_id, scheme_id, name, description) values ($1,$2,$3,$4,$5)', [id, a.collegeId, i.scheme_id, i.name, i.description]);
      break;
    case 'department':
      await c.query('insert into departments (id, college_id, name, handles, contact_label) values ($1,$2,$3,$4,$5)', [id, a.collegeId, i.name, i.handles, i.contact_label]);
      break;
    case 'staff': {
      if (await one(c, 'select 1 from app_users where lower(email) = $1', [i.email])) throw conflict(`${i.email} already has an account`);
      const login = await createLogin(i.email, i.password);
      try {
        await c.query('insert into app_users (id, auth_subject, email, display_name, password_hash) values ($1,$2,$3,$4,$5)', [id, login.subject, i.email, i.display_name, login.hash]);
        await c.query('select set_staff_role($1, $2, $3)', [id, i.role, 'active']); // the database checks the caller is an active admin here
      } catch (e) { await login.undo(); throw e; }
      break;
    }
    case 'staff_status':
      await c.query('select set_staff_role($1, $2, $3)', [i.user_id, i.role, i.status]).catch((e) => { throw new AppError(400, 'staff_change_refused', (e as Error).message); });
      break;
    case 'case': {
      await owned(c, a, 'students', i.student_id); await owned(c, a, 'schemes', i.scheme_id);
      await c.query(`insert into scholarship_cases (id, college_id, student_id, scheme_id, academic_year, status, expected_paise, released_paise, source_ref, observed_at, version)
        values ($1,$2,$3,$4,$5,$6,$7,0,$8,now(),1)`, [id, a.collegeId, i.student_id, i.scheme_id, i.academic_year, i.status, i.expected_rupees * 100, `Entered by ${a.displayName}`]);
      await c.query(`insert into scholarship_case_events (college_id, case_id, status, note, source_ref, occurred_at) values ($1,$2,$3,'Case opened',$4,now())`, [a.collegeId, id, i.status, `Entered by ${a.displayName}`]);
      break;
    }
    case 'backlog': {
      await owned(c, a, 'students', i.student_id); await owned(c, a, 'curriculum_subjects', i.curriculum_subject_id);
      await c.query(`insert into backlogs (college_id, student_id, curriculum_subject_id, status) values ($1,$2,$3,$4)
        on conflict (student_id, curriculum_subject_id) do update set status = excluded.status`, [a.collegeId, i.student_id, i.curriculum_subject_id, i.status]);
      break;
    }
  }
  await audit(c, { collegeId: a.collegeId, actor: a.userId, action: `setup.${i.kind}`, target: 'student_id' in i ? i.student_id : id, result: 'ok' });
  return { id };
}

export async function setupOverview(c: Db, a: Actor) {
  const [branches, subjects, schemes, requirements, departments, staff] = [
    await many(c, `select b.id, b.code, b.name, coalesce(json_agg(json_build_object('id', cu.id, 'regulation', cu.regulation, 'version', cu.version,
        'students', (select count(*) from students s where s.curriculum_id = cu.id)) order by cu.version) filter (where cu.id is not null), '[]') curricula
      from branches b left join curricula cu on cu.branch_id = b.id and cu.college_id = b.college_id where b.college_id = $1 group by b.id order by b.code`, [a.collegeId]),
    await many(c, `select cs.id, cs.curriculum_id, cs.semester, s.code, s.name,
        coalesce((select string_agg(t.name, ', ' order by t.position) from topics t where t.curriculum_subject_id = cs.id), '') topics
      from curriculum_subjects cs join subjects s on s.id = cs.subject_id and s.college_id = cs.college_id where cs.college_id = $1 order by cs.semester, s.code`, [a.collegeId]),
    await many(c, 'select id, name, policy_version from schemes where college_id = $1 order by name', [a.collegeId]),
    await many(c, 'select id, scheme_id, name, description from document_requirements where college_id = $1 order by name', [a.collegeId]),
    await many(c, 'select id, name, handles, contact_label from departments where college_id = $1 order by handles, name', [a.collegeId]),
    await many(c, `select u.id, u.display_name, u.email, m.role, m.status from memberships m join app_users u on u.id = m.user_id
      where m.college_id = $1 and m.role <> 'student' order by m.status, m.role, u.display_name`, [a.collegeId]),
  ];
  return { branches, subjects, schemes, requirements, departments, staff };
}

/** For the student file: schemes to open a case under, and this student's syllabus subjects with backlog state. */
export async function studentSetupOptions(c: Db, a: Actor, studentId: string) {
  return {
    schemes: await many(c, 'select id, name from schemes where college_id = $1 order by name', [a.collegeId]),
    subjects: await many(c, `select cs.id, cs.semester, s.code, s.name, bl.status backlog from students st
      join curriculum_subjects cs on cs.curriculum_id = st.curriculum_id and cs.college_id = st.college_id
      join subjects s on s.id = cs.subject_id and s.college_id = cs.college_id
      left join backlogs bl on bl.student_id = st.id and bl.curriculum_subject_id = cs.id
      where st.college_id = $1 and st.id = $2 and cs.semester <= st.current_semester order by cs.semester, s.code`, [a.collegeId, studentId]),
  };
}
