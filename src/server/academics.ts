// Academics: classes (subject + section), timetable, attendance, marks/results and class notes.
import { createHash, randomUUID } from 'node:crypto';
import { z } from 'zod';
import { audit, many, one, type Db } from './db';
import type { Actor } from './auth';
import { AppError, notFound } from './http';
import { notify } from './notify';

export const MIN_ATTENDANCE = 75; // usual university rule; shown as a warning, never blocks anything
export const DAYS = ['', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
export const istToday = (offsetDays = 0) => new Date(Date.now() + offsetDays * 86400000).toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });

type Klass = { id: string; section: string; faculty_user_id: string; cs_id: string; semester: number; curriculum_id: string; subject_id: string; code: string; name: string; branch: string; faculty: string };
const CLASS_SQL = `select ta.id, ta.section, ta.faculty_user_id, cs.id cs_id, cs.semester, cs.curriculum_id, cs.subject_id, s.code, s.name, b.code branch, u.display_name faculty
  from teaching_assignments ta
  join curriculum_subjects cs on cs.id = ta.curriculum_subject_id and cs.college_id = ta.college_id
  join subjects s on s.id = cs.subject_id and s.college_id = cs.college_id
  join curricula cu on cu.id = cs.curriculum_id and cu.college_id = cs.college_id
  join branches b on b.id = cu.branch_id and b.college_id = cu.college_id
  join app_users u on u.id = ta.faculty_user_id
  where ta.college_id = $1`;

export async function facultyClasses(c: Db, a: Actor) {
  return many<Klass & { students: number; held: number; avg_pct: number | null; short: number }>(c, `with k as (${CLASS_SQL} and ta.faculty_user_id = $2)
    select k.*, (select count(*) from students st where st.college_id = $1 and st.curriculum_id = k.curriculum_id and st.current_semester = k.semester and st.section = k.section)::int students,
      (select count(*) from attendance_sessions se where se.college_id = $1 and se.assignment_id = k.id)::int held,
      p.avg_pct, coalesce(p.short, 0)::int short
    from k left join lateral (
      select round(avg(pct))::int avg_pct, count(*) filter (where pct < ${MIN_ATTENDANCE}) short from (
        select 100.0 * count(*) filter (where am.present) / count(*) pct from attendance_marks am
        join attendance_sessions se on se.id = am.session_id and se.college_id = am.college_id
        where se.college_id = $1 and se.assignment_id = k.id group by am.student_id) x) p on true
    order by k.semester, k.code, k.section`, [a.collegeId, a.userId]);
}

/** Faculty open only their own classes; the administration office may open any. */
export async function classFor(c: Db, a: Actor, id: string, own = false): Promise<Klass> {
  const k = await one<Klass>(c, `${CLASS_SQL} and ta.id = $2`, [a.collegeId, id]);
  const mine = k?.faculty_user_id === a.userId;
  if (!k || (!mine && (own || !a.roles.includes('admin')))) throw notFound();
  return k;
}

export async function classStudents(c: Db, a: Actor, k: Klass) {
  return many(c, `select id, display_name, roll_no, user_id from students where college_id = $1 and curriculum_id = $2 and current_semester = $3 and section = $4
    order by roll_no nulls last, display_name`, [a.collegeId, k.curriculum_id, k.semester, k.section]);
}

// ---- Attendance

export async function attendanceSheet(c: Db, a: Actor, k: Klass, date: string, period: number) {
  const s = await one(c, 'select id from attendance_sessions where college_id = $1 and assignment_id = $2 and held_on = $3 and period = $4', [a.collegeId, k.id, date, period]);
  const rows = s ? await many(c, 'select student_id, present from attendance_marks where college_id = $1 and session_id = $2', [a.collegeId, s.id]) : [];
  return { marked: !!s, present: rows.filter((r) => r.present).map((r) => r.student_id as string) };
}

export const attendanceInput = z.object({
  assignment_id: z.uuid(), date: z.iso.date(), period: z.number().int().min(1).max(8), present: z.array(z.uuid()).max(500),
}).strict();

export async function saveAttendance(c: Db, a: Actor, i: z.infer<typeof attendanceInput>) {
  const k = await classFor(c, a, i.assignment_id, true);
  if (i.date > istToday()) throw new AppError(400, 'validation', 'Attendance cannot be marked for a future date', { fields: ['date'] });
  if (i.date < istToday(-30)) throw new AppError(400, 'validation', 'Attendance older than 30 days is locked', { fields: ['date'] });
  const roster = await classStudents(c, a, k);
  const ids = new Set(roster.map((s) => s.id));
  if (i.present.some((p) => !ids.has(p))) throw new AppError(400, 'validation', 'A student is not in this class');
  const s = await one(c, `insert into attendance_sessions (college_id, assignment_id, held_on, period, marked_by) values ($1,$2,$3,$4,$5)
    on conflict (assignment_id, held_on, period) do update set marked_by = excluded.marked_by, updated_at = now() returning id`, [a.collegeId, k.id, i.date, i.period, a.userId]);
  const present = new Set(i.present);
  await c.query(`insert into attendance_marks (college_id, session_id, student_id, present) select $1, $2, x.sid, x.p from unnest($3::uuid[], $4::bool[]) x(sid, p)
    on conflict (session_id, student_id) do update set present = excluded.present`, [a.collegeId, s.id, roster.map((r) => r.id), roster.map((r) => present.has(r.id))]);
  await audit(c, { collegeId: a.collegeId, actor: a.userId, action: 'attendance.mark', target: `${k.id}:${i.date}:${i.period}`, result: 'ok' });
  return { present: present.size, total: roster.length };
}

export async function classAttendance(c: Db, a: Actor, k: Klass) {
  return many(c, `select st.id, st.display_name, st.roll_no, count(am.*)::int held, count(am.*) filter (where am.present)::int attended
    from students st
    left join attendance_sessions se on se.college_id = st.college_id and se.assignment_id = $5
    left join attendance_marks am on am.session_id = se.id and am.student_id = st.id and am.college_id = st.college_id
    where st.college_id = $1 and st.curriculum_id = $2 and st.current_semester = $3 and st.section = $4
    group by st.id order by st.roll_no nulls last, st.display_name`, [a.collegeId, k.curriculum_id, k.semester, k.section, k.id]);
}

export async function studentAttendance(c: Db, a: Actor, studentId: string) {
  return many(c, `select s.code, s.name, count(*)::int held, count(*) filter (where am.present)::int attended,
      max(se.held_on) filter (where not am.present) last_absent
    from attendance_marks am
    join attendance_sessions se on se.id = am.session_id and se.college_id = am.college_id
    join teaching_assignments ta on ta.id = se.assignment_id and ta.college_id = se.college_id
    join curriculum_subjects cs on cs.id = ta.curriculum_subject_id and cs.college_id = ta.college_id
    join subjects s on s.id = cs.subject_id and s.college_id = cs.college_id
    where am.college_id = $1 and am.student_id = $2 group by s.code, s.name order by s.code`, [a.collegeId, studentId]);
}

// ---- Marks and results

export async function createAssessment(c: Db, a: Actor, assignmentId: string, name: string, maxMarks: number) {
  const k = await classFor(c, a, assignmentId, true);
  const r = await one(c, `insert into assessments (college_id, assignment_id, name, max_marks) values ($1,$2,$3,$4) on conflict (assignment_id, name) do nothing returning id`,
    [a.collegeId, k.id, name, maxMarks]);
  if (!r) throw new AppError(409, 'duplicate', 'An assessment with this name already exists');
  return { id: r.id as string };
}

export async function classAssessments(c: Db, a: Actor, k: Klass) {
  const list = await many(c, 'select id, name, max_marks, published from assessments where college_id = $1 and assignment_id = $2 order by created_at', [a.collegeId, k.id]);
  const rows = await many(c, 'select assessment_id, student_id, marks from marks where college_id = $1 and assessment_id = any($2::uuid[])', [a.collegeId, list.map((x) => x.id)]);
  return list.map((x) => ({ ...x, marks: Object.fromEntries(rows.filter((r) => r.assessment_id === x.id).map((r) => [r.student_id, r.marks])) as Record<string, number | null> }));
}

export const marksInput = z.object({
  marks: z.array(z.object({ student_id: z.uuid(), marks: z.number().min(0).max(1000).multipleOf(0.5).nullable() })).max(500),
  published: z.boolean().optional(),
}).strict();

/** Saves marks (null = absent). Publishing makes them visible to students and notifies them once. */
export async function saveMarks(c: Db, a: Actor, assessmentId: string, i: z.infer<typeof marksInput>) {
  const as = await one(c, 'select * from assessments where college_id = $1 and id = $2 for update', [a.collegeId, assessmentId]);
  if (!as) throw notFound();
  const k = await classFor(c, a, as.assignment_id, true);
  const roster = await classStudents(c, a, k);
  const ids = new Set(roster.map((s) => s.id));
  for (const m of i.marks) {
    if (!ids.has(m.student_id)) throw new AppError(400, 'validation', 'A student is not in this class');
    if (m.marks !== null && m.marks > as.max_marks) throw new AppError(400, 'validation', `Marks cannot exceed ${as.max_marks}`);
  }
  await c.query(`insert into marks (college_id, assessment_id, student_id, marks) select $1, $2, x.sid, x.m from unnest($3::uuid[], $4::numeric[]) x(sid, m)
    on conflict (assessment_id, student_id) do update set marks = excluded.marks`, [a.collegeId, as.id, i.marks.map((m) => m.student_id), i.marks.map((m) => m.marks)]);
  if (i.published !== undefined && i.published !== as.published) {
    await c.query('update assessments set published = $3 where college_id = $1 and id = $2', [a.collegeId, as.id, i.published]);
    if (i.published) for (const s of roster)
      await notify(c, a.collegeId, s.user_id, `marks:${as.id}`, `Marks published: ${k.code} ${as.name}`, 'Open Academics to see your results.', a.displayName);
  }
  await audit(c, { collegeId: a.collegeId, actor: a.userId, action: 'marks.save', target: as.id, result: 'ok' });
  return { saved: i.marks.length, published: i.published ?? as.published };
}

const GRADES: [number, string, number][] = [[90, 'O', 10], [80, 'A+', 9], [70, 'A', 8], [60, 'B+', 7], [50, 'B', 6], [40, 'C', 5], [0, 'F', 0]];
export const grade = (pct: number) => GRADES.find(([min]) => pct >= min)!.slice(1) as [string, number];

/**
 * Grade card from PUBLISHED assessments of the student's current class. Absent counts as 0.
 * ponytail: SGPA is an unweighted mean of grade points; weight by credits once subjects carry credits.
 */
export async function studentResults(c: Db, a: Actor, studentId: string) {
  const rows = await many(c, `select s.code, s.name, x.name assessment, x.max_marks, m.marks, u.display_name faculty
    from students st
    join curriculum_subjects cs on cs.curriculum_id = st.curriculum_id and cs.semester = st.current_semester and cs.college_id = st.college_id
    join teaching_assignments ta on ta.curriculum_subject_id = cs.id and ta.section = st.section and ta.college_id = cs.college_id
    join assessments x on x.assignment_id = ta.id and x.college_id = ta.college_id and x.published
    join subjects s on s.id = cs.subject_id and s.college_id = cs.college_id
    join app_users u on u.id = ta.faculty_user_id
    left join marks m on m.assessment_id = x.id and m.student_id = st.id and m.college_id = st.college_id
    where st.college_id = $1 and st.id = $2 order by s.code, x.created_at`, [a.collegeId, studentId]);
  const subjects = [...new Set(rows.map((r) => r.code))].map((code) => {
    const mine = rows.filter((r) => r.code === code);
    const got = mine.reduce((t, r) => t + (r.marks ?? 0), 0), max = mine.reduce((t, r) => t + r.max_marks, 0);
    const pct = max ? (100 * got) / max : 0;
    const [letter, points] = grade(pct);
    return { code, name: mine[0].name, faculty: mine[0].faculty, items: mine, got, max, pct: Math.round(pct), letter, points };
  });
  const sgpa = subjects.length ? Math.round((subjects.reduce((t, s) => t + s.points, 0) / subjects.length) * 100) / 100 : null;
  return { subjects, sgpa };
}

// ---- Timetable

export async function studentTimetable(c: Db, a: Actor, studentId: string) {
  return many(c, `select ts.day, ts.period, to_char(ts.starts_at, 'HH24:MI') starts, to_char(ts.ends_at, 'HH24:MI') ends, ts.room, s.code, s.name, u.display_name faculty
    from students st
    join curriculum_subjects cs on cs.curriculum_id = st.curriculum_id and cs.semester = st.current_semester and cs.college_id = st.college_id
    join teaching_assignments ta on ta.curriculum_subject_id = cs.id and ta.section = st.section and ta.college_id = cs.college_id
    join timetable_slots ts on ts.assignment_id = ta.id and ts.college_id = ta.college_id
    join subjects s on s.id = cs.subject_id and s.college_id = cs.college_id
    join app_users u on u.id = ta.faculty_user_id
    where st.college_id = $1 and st.id = $2 order by ts.day, ts.period`, [a.collegeId, studentId]);
}

/** All slots (admin) or one teacher's slots, with class labels. */
export async function slots(c: Db, a: Actor, facultyOnly: boolean) {
  return many(c, `with k as (${CLASS_SQL} and ($2::uuid is null or ta.faculty_user_id = $2))
    select ts.id, ts.day, ts.period, to_char(ts.starts_at, 'HH24:MI') starts, to_char(ts.ends_at, 'HH24:MI') ends, ts.room,
      k.id assignment_id, k.code, k.name, k.branch, k.semester, k.section, k.faculty
    from timetable_slots ts join k on k.id = ts.assignment_id where ts.college_id = $1 order by ts.day, ts.period, k.branch, k.semester, k.section`,
  [a.collegeId, facultyOnly ? a.userId : null]);
}

export const slotInput = z.object({
  assignment_id: z.uuid(), day: z.number().int().min(1).max(6), period: z.number().int().min(1).max(8),
  starts_at: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/), ends_at: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/), room: z.string().trim().max(40).default(''),
}).strict().refine((s) => s.ends_at > s.starts_at, { message: 'End time must be after start time', path: ['ends_at'] });

/** Refuses clashes: the same class or the same teacher in one period. */
export async function addSlot(c: Db, a: Actor, i: z.infer<typeof slotInput>) {
  const k = await classFor(c, a, i.assignment_id);
  const clash = await one(c, `select s.code from timetable_slots ts
    join teaching_assignments ta on ta.id = ts.assignment_id and ta.college_id = ts.college_id
    join curriculum_subjects cs on cs.id = ta.curriculum_subject_id and cs.college_id = ta.college_id
    join subjects s on s.id = cs.subject_id and s.college_id = cs.college_id
    where ts.college_id = $1 and ts.day = $2 and ts.period = $3
      and ((cs.curriculum_id = $4 and cs.semester = $5 and ta.section = $6) or ta.faculty_user_id = $7) limit 1`,
  [a.collegeId, i.day, i.period, k.curriculum_id, k.semester, k.section, k.faculty_user_id]);
  if (clash) throw new AppError(409, 'clash', `${DAYS[i.day]} period ${i.period} clashes with ${clash.code} (same class or same teacher)`);
  await c.query(`insert into timetable_slots (college_id, assignment_id, day, period, starts_at, ends_at, room) values ($1,$2,$3,$4,$5,$6,$7)`,
    [a.collegeId, k.id, i.day, i.period, i.starts_at, i.ends_at, i.room]);
  return { ok: true };
}
export async function removeSlot(c: Db, a: Actor, id: string) {
  const r = await c.query('delete from timetable_slots where college_id = $1 and id = $2', [a.collegeId, id]);
  if (!r.rowCount) throw notFound();
  return { ok: true };
}

// ---- Teaching assignments (administration office)

export async function allClasses(c: Db, a: Actor) {
  return many<Klass>(c, `${CLASS_SQL} order by b.code, cs.semester, ta.section, s.code`, [a.collegeId]);
}
export async function facultyList(c: Db, a: Actor) {
  return many(c, `select u.id, u.display_name, u.email from memberships m join app_users u on u.id = m.user_id
    where m.college_id = $1 and m.role = 'faculty' and m.status = 'active' order by u.display_name`, [a.collegeId]);
}
export async function subjectOptions(c: Db, a: Actor) {
  return many(c, `select cs.id, cs.semester, s.code, s.name, b.code branch from curriculum_subjects cs
    join subjects s on s.id = cs.subject_id and s.college_id = cs.college_id
    join curricula cu on cu.id = cs.curriculum_id and cu.college_id = cs.college_id
    join branches b on b.id = cu.branch_id and b.college_id = cu.college_id
    where cs.college_id = $1 order by b.code, cs.semester, s.code`, [a.collegeId]);
}
export const assignInput = z.object({ faculty_user_id: z.uuid(), curriculum_subject_id: z.uuid(), section: z.string().trim().toUpperCase().regex(/^[A-Z]$/) }).strict();
export async function assignTeacher(c: Db, a: Actor, i: z.infer<typeof assignInput>) {
  if (!(await one(c, `select 1 from memberships where college_id = $1 and user_id = $2 and role = 'faculty' and status = 'active'`, [a.collegeId, i.faculty_user_id])))
    throw new AppError(400, 'validation', 'Choose an active faculty member', { fields: ['faculty_user_id'] });
  await c.query(`insert into teaching_assignments (college_id, faculty_user_id, curriculum_subject_id, section) values ($1,$2,$3,$4)
    on conflict (curriculum_subject_id, section) do update set faculty_user_id = excluded.faculty_user_id`, [a.collegeId, i.faculty_user_id, i.curriculum_subject_id, i.section]);
  await audit(c, { collegeId: a.collegeId, actor: a.userId, action: 'teaching.assign', target: `${i.curriculum_subject_id}:${i.section}`, result: 'ok' });
  return { ok: true };
}

// ---- Class notes and previous papers uploaded by the teacher

export async function classNotes(c: Db, a: Actor, k: Klass) {
  return many(c, `select id, kind, title, exam_year, mime, source from documents where college_id = $1 and curriculum_id = $2 and subject_id = $3 and status = 'published'
    order by kind, exam_year desc nulls last, title`, [a.collegeId, k.curriculum_id, k.subject_id]);
}

/** Splits text into tutor-citable chunks of about 1200 characters, on paragraph and then sentence boundaries. */
export function chunkText(text: string) {
  const units = text.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean).flatMap((p) => (p.length <= 1200 ? [p] : p.split(/(?<=[.?!])\s+/)));
  const parts: string[] = [];
  for (const u of units) {
    if (parts.length && parts[parts.length - 1].length + u.length < 1200) parts[parts.length - 1] += '\n\n' + u;
    else parts.push(u.slice(0, 4000));
  }
  return parts;
}

/** Text of each PDF page (untrusted input; the bundled pdf.js has no eval code path). Scanned, encrypted or broken PDFs give [] (download-only). */
export async function pdfPages(bytes: Buffer): Promise<string[]> {
  try {
    const { extractText } = await import('unpdf');
    return ((await extractText(new Uint8Array(bytes), { mergePages: false })).text as string[]).slice(0, 300);
  } catch { return []; }
}

/** Text notes and text-based PDFs are split into sections the AI tutor can cite, with real page numbers for PDFs. */
export async function addNote(c: Db, a: Actor, assignmentId: string, i: { title: string; kind: 'material' | 'paper'; exam_year: number | null; mime: string; bytes: Buffer }) {
  const k = await classFor(c, a, assignmentId, true);
  const id = randomUUID();
  await c.query(`insert into documents (id, college_id, curriculum_id, subject_id, kind, title, revision, exam_year, source, license, status, mime, bytes, content_hash)
    values ($1,$2,$3,$4,$5,$6,'rev-1',$7,$8,'College internal','published',$9,$10,$11)`,
  [id, a.collegeId, k.curriculum_id, k.subject_id, i.kind, i.title, i.exam_year, `Uploaded by ${a.displayName}`, i.mime, i.bytes, createHash('sha256').update(i.bytes).digest('hex')]);
  const chunks: [number, string][] = i.mime === 'text/plain' ? chunkText(i.bytes.toString('utf8')).map((b, n) => [n + 1, b])
    : i.mime === 'application/pdf' ? (await pdfPages(i.bytes)).flatMap((t, p) => chunkText(t).map((b): [number, string] => [p + 1, b])) : [];
  for (const [page, body] of chunks)
    await c.query(`insert into document_chunks (college_id, document_id, curriculum_id, subject_id, page, section, body) values ($1,$2,$3,$4,$5,$6,$7)`,
      [a.collegeId, id, k.curriculum_id, k.subject_id, page, body.split('\n')[0].slice(0, 80), body]);
  for (const s of await classStudents(c, a, k))
    await notify(c, a.collegeId, s.user_id, `note:${id}`, `New ${i.kind === 'paper' ? 'question paper' : 'notes'}: ${k.code} ${i.title}`, 'Open Learn to read or download it.', a.displayName);
  await audit(c, { collegeId: a.collegeId, actor: a.userId, action: 'note.upload', target: id, result: 'ok' });
  return { id, searchable_sections: chunks.length };
}
