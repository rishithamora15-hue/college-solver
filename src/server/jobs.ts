import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { audit, many, one, type Db } from './db';
import type { Actor } from './auth';
import { AppError, notFound } from './http';
import { notify } from './notify';

export const STALE_LISTING_MS = 14 * 86400000;
export type JobFilter = { category?: 'it' | 'non_it'; campus_type?: 'campus' | 'off_campus'; level?: 'fresher' | 'internship'; include_expired?: boolean };

// ---- Eligibility: one rule set, used for students' view, application tracking, placement counts and nudges.

export type Profile = { id: string; display_name: string; roll_no: string | null; user_id: string; cgpa: number | null; backlogs: number; branch: string };
type Rules = { min_cgpa: number | null; max_backlogs: number | null; branches: string[] | null };

export function ineligibility(j: Rules, p: Profile): string[] {
  const why: string[] = [];
  if (j.min_cgpa != null && (p.cgpa ?? 0) < j.min_cgpa) why.push(`CGPA ${j.min_cgpa}+ required`);
  if (j.max_backlogs != null && p.backlogs > j.max_backlogs) why.push(j.max_backlogs === 0 ? 'No active backlogs allowed' : `At most ${j.max_backlogs} active backlogs`);
  if (j.branches?.length && !j.branches.includes(p.branch)) why.push(`Open to ${j.branches.join(', ')} only`);
  return why;
}

export async function profiles(c: Db, a: Actor, studentId?: string): Promise<Profile[]> {
  return many(c, `select st.id, st.display_name, st.roll_no, st.user_id, st.cgpa, b.code branch,
      (select count(*) from backlogs bl where bl.student_id = st.id and bl.college_id = st.college_id and bl.status = 'active')::int backlogs
    from students st join curricula cu on cu.id = st.curriculum_id and cu.college_id = st.college_id
    join branches b on b.id = cu.branch_id and b.college_id = cu.college_id
    where st.college_id = $1 and ($2::uuid is null or st.id = $2) order by st.roll_no nulls last, st.display_name`, [a.collegeId, studentId ?? null]);
}

export async function listJobs(c: Db, a: Actor, f: JobFilter) {
  return many(c, `select id, company, role, category, campus_type, level, location, deadline_at, verified_at, is_fictional, min_cgpa, max_backlogs, branches,
      deadline_at < now() expired, verified_at < now() - interval '14 days' stale
    from opportunities where college_id = $1 and status = 'published'
      and ($2::text is null or category = $2) and ($3::text is null or campus_type = $3) and ($4::text is null or level = $4)
      and ($5 or deadline_at >= now())
    order by deadline_at limit 100`, [a.collegeId, f.category ?? null, f.campus_type ?? null, f.level ?? null, !!f.include_expired]);
}

export async function jobDetail(c: Db, a: Actor, id: string, studentId: string | null) {
  const j = await one(c, `select *, deadline_at < now() expired, verified_at < now() - interval '14 days' stale
    from opportunities where college_id = $1 and id = $2 and status = 'published'`, [a.collegeId, id]);
  if (!j) throw notFound();
  const tracking = studentId ? await one(c, 'select state, stage, updated_at, stage_updated_at from application_tracking where college_id = $1 and student_id = $2 and opportunity_id = $3', [a.collegeId, studentId, id]) : null;
  const why = studentId ? ineligibility(j, (await profiles(c, a, studentId))[0]) : [];
  return { ...j, tracking, why };
}

/** Records what the STUDENT did/reported. Opening a link is never recorded as an application. Ineligible students cannot apply. */
export async function track(c: Db, a: Actor, studentId: string, id: string, state: 'link_opened' | 'reported_applied' | 'reported_not_applied') {
  const j = await jobDetail(c, a, id, studentId);
  if (state !== 'reported_not_applied' && j.why.length) throw new AppError(409, 'not_eligible', `Not eligible: ${j.why.join('; ')}`);
  if (state === 'link_opened' && j.tracking && j.tracking.state !== 'link_opened') return { state: j.tracking.state, apply_url: j.apply_url }; // never downgrade a report
  await c.query(`insert into application_tracking (college_id, student_id, opportunity_id, state) values ($1,$2,$3,$4)
    on conflict (student_id, opportunity_id) do update set state = excluded.state, updated_at = now()`, [a.collegeId, studentId, id, state]);
  return { state, apply_url: j.apply_url };
}

// ---- Placement cell: post drives, monitor who applied / opened but did not apply / has not looked, run interview rounds.

const optNum = (max: number, int = false) => z.preprocess((v) => (v === '' || v === null ? undefined : Number(v)), (int ? z.number().int() : z.number()).min(0).max(max).optional());
export const jobInput = z.object({
  company: z.string().trim().min(2).max(120), role: z.string().trim().min(2).max(120),
  category: z.enum(['it', 'non_it']), campus_type: z.enum(['campus', 'off_campus']), level: z.enum(['fresher', 'internship']),
  location: z.string().trim().min(2).max(120), jd: z.string().trim().min(20).max(8000), eligibility: z.string().trim().min(2).max(500),
  salary_text: z.string().trim().max(120).optional(),
  apply_url: z.url().max(500).refine((u) => u.startsWith('https://'), 'Use an https:// link'),
  deadline: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  min_cgpa: optNum(10), max_backlogs: optNum(20, true),
  branches: z.array(z.string().trim().toUpperCase().regex(/^[A-Z]{2,10}$/)).max(20).optional(),
  notify_students: z.boolean().default(true),
}).strict();

export async function placementBoard(c: Db, a: Actor) {
  const people = await profiles(c, a);
  const jobs = await many(c, `select o.id, o.company, o.role, o.category, o.campus_type, o.level, o.status, o.deadline_at, o.deadline_at < now() expired,
      o.min_cgpa, o.max_backlogs, o.branches,
      count(t.*) filter (where t.state = 'reported_applied')::int applied,
      count(t.*) filter (where t.state = 'link_opened')::int opened,
      count(t.*) filter (where t.state = 'reported_not_applied')::int declined,
      count(t.*) filter (where t.stage in ('selected','offer_accepted'))::int selected
    from opportunities o left join application_tracking t on t.opportunity_id = o.id and t.college_id = o.college_id
    where o.college_id = $1 group by o.id order by o.status = 'published' desc, o.deadline_at < now(), o.deadline_at limit 200`, [a.collegeId]);
  return { total: people.length, jobs: jobs.map((j) => ({ ...j, eligible: people.filter((p) => !ineligibility(j, p).length).length })) };
}

export async function jobStudents(c: Db, a: Actor, id: string) {
  const j = await one(c, `select *, deadline_at < now() expired from opportunities where college_id = $1 and id = $2`, [a.collegeId, id]);
  if (!j) throw notFound();
  const track = await many(c, 'select student_id, state, stage, updated_at from application_tracking where college_id = $1 and opportunity_id = $2', [a.collegeId, id]);
  const students = (await profiles(c, a)).map((p) => {
    const t = track.find((x) => x.student_id === p.id);
    return { ...p, state: (t?.state ?? null) as string | null, stage: (t?.stage ?? null) as string | null, updated_at: t?.updated_at ?? null, why: ineligibility(j, p) };
  });
  return { j, students };
}

export async function createJob(c: Db, a: Actor, i: z.infer<typeof jobInput>) {
  const deadline = new Date(`${i.deadline}T23:59:00+05:30`);
  if (!(deadline > new Date())) throw new AppError(400, 'validation', 'Deadline must be in the future', { fields: ['deadline'] });
  const id = randomUUID();
  const branches = i.branches?.length ? i.branches : null;
  await c.query(`insert into opportunities (id, college_id, company, role, category, campus_type, level, location, jd, eligibility, salary_text,
      source_url, apply_url, deadline_at, verified_at, status, is_fictional, min_cgpa, max_backlogs, branches)
      values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$12,$13,now(),'published',false,$14,$15,$16)`,
  [id, a.collegeId, i.company, i.role, i.category, i.campus_type, i.level, i.location, i.jd, i.eligibility, i.salary_text || null, i.apply_url, deadline,
    i.min_cgpa ?? null, i.max_backlogs ?? null, branches]);
  if (i.notify_students) {
    const rules = { min_cgpa: i.min_cgpa ?? null, max_backlogs: i.max_backlogs ?? null, branches };
    for (const s of (await profiles(c, a)).filter((p) => !ineligibility(rules, p).length))
      await notify(c, a.collegeId, s.user_id, `job:${id}:new`, `New drive: ${i.company} — ${i.role}`, `Apply before ${deadline.toDateString()}. Open Jobs to see the role.`, 'Placement cell');
  }
  await audit(c, { collegeId: a.collegeId, actor: a.userId, action: 'job.create', target: id, result: 'ok' });
  return { id };
}

export async function setJobStatus(c: Db, a: Actor, id: string, status: 'published' | 'withdrawn') {
  const r = await c.query('update opportunities set status = $3 where college_id = $1 and id = $2', [a.collegeId, id, status]);
  if (!r.rowCount) throw notFound();
  await audit(c, { collegeId: a.collegeId, actor: a.userId, action: `job.${status}`, target: id, result: 'ok' });
  return { status };
}

/** Reminds eligible students in a group about a drive. At most one nudge per student per drive per day. */
export async function nudge(c: Db, a: Actor, id: string, group: 'opened' | 'none') {
  const { j, students } = await jobStudents(c, a, id);
  if (j.status !== 'published' || j.expired) throw new AppError(409, 'closed', 'This drive is closed');
  const day = new Date().toISOString().slice(0, 10);
  let sent = 0;
  for (const s of students.filter((s) => !s.why.length && (group === 'opened' ? s.state === 'link_opened' : !s.state)))
    if (await notify(c, a.collegeId, s.user_id, `nudge:${id}:${s.id}:${day}`,
      group === 'opened' ? `Finish your application: ${j.company}` : `Don't miss: ${j.company} — ${j.role}`,
      `Deadline ${new Date(j.deadline_at).toDateString()}. Open Jobs to apply.`, 'Placement cell')) sent++;
  return { sent };
}

export const STAGES = { shortlisted: 'Shortlisted', interview: 'Interview', selected: 'Selected', offer_accepted: 'Offer accepted', rejected: 'Not selected' } as const;
export type Stage = keyof typeof STAGES;

/** Interview rounds, only for students who reported applying. The student is notified at each step. */
export async function setStage(c: Db, a: Actor, jobId: string, studentId: string, stage: Stage | null) {
  const t = await one(c, `select t.state, o.company, o.role, st.user_id from application_tracking t
    join opportunities o on o.id = t.opportunity_id and o.college_id = t.college_id join students st on st.id = t.student_id and st.college_id = t.college_id
    where t.college_id = $1 and t.opportunity_id = $2 and t.student_id = $3 for update of t`, [a.collegeId, jobId, studentId]);
  if (!t || t.state !== 'reported_applied') throw new AppError(409, 'not_applied', 'Only students who applied can move through rounds');
  await c.query('update application_tracking set stage = $4, stage_updated_at = now() where college_id = $1 and opportunity_id = $2 and student_id = $3', [a.collegeId, jobId, studentId, stage]);
  if (stage) await notify(c, a.collegeId, t.user_id, `stage:${jobId}:${stage}`, `${t.company}: ${STAGES[stage]}`,
    stage === 'selected' ? `Congratulations! You were selected for ${t.role}.` : `Update on your application for ${t.role}.`, 'Placement cell');
  await audit(c, { collegeId: a.collegeId, actor: a.userId, action: `job.stage.${stage ?? 'clear'}`, target: `${jobId}:${studentId}`, result: 'ok' });
  return { stage };
}

export async function placementStats(c: Db, a: Actor) {
  const people = await profiles(c, a);
  const placed = new Set((await many(c, `select distinct student_id from application_tracking where college_id = $1 and stage in ('selected','offer_accepted')`, [a.collegeId])).map((r) => r.student_id));
  const branches = [...new Set(people.map((p) => p.branch))].map((b) => {
    const all = people.filter((p) => p.branch === b);
    return { branch: b, students: all.length, placed: all.filter((p) => placed.has(p.id)).length };
  });
  const companies = await many(c, `select o.company, count(*) filter (where t.state = 'reported_applied')::int applied,
      count(*) filter (where t.stage in ('shortlisted','interview'))::int in_process,
      count(*) filter (where t.stage in ('selected','offer_accepted'))::int selected, count(*) filter (where t.stage = 'rejected')::int rejected
    from opportunities o join application_tracking t on t.opportunity_id = o.id and t.college_id = o.college_id
    where o.college_id = $1 group by o.company order by selected desc, applied desc`, [a.collegeId]);
  return { students: people.length, placed: placed.size, branches, companies };
}

export async function exportApplications(c: Db, a: Actor, jobId: string | null) {
  const rows = await many(c, `select o.company, o.role, st.roll_no, st.display_name, b.code branch, st.cgpa, t.state, t.stage, t.updated_at
    from application_tracking t join opportunities o on o.id = t.opportunity_id and o.college_id = t.college_id
    join students st on st.id = t.student_id and st.college_id = t.college_id
    join curricula cu on cu.id = st.curriculum_id and cu.college_id = st.college_id join branches b on b.id = cu.branch_id and b.college_id = cu.college_id
    where t.college_id = $1 and ($2::uuid is null or o.id = $2) order by o.company, st.roll_no`, [a.collegeId, jobId]);
  const label: Record<string, string> = { reported_applied: 'Applied', link_opened: 'Opened, not applied', reported_not_applied: 'Not applying' };
  return [['Company', 'Role', 'Roll number', 'Name', 'Branch', 'CGPA', 'Status', 'Round', 'Updated'],
    ...rows.map((r) => [r.company, r.role, r.roll_no, r.display_name, r.branch, r.cgpa, label[r.state] ?? r.state, r.stage ? STAGES[r.stage as Stage] : '', r.updated_at])];
}
