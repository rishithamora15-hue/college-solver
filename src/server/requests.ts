// Student requests (certificates, leave) and online scholarship-document uploads.
import { z } from 'zod';
import { audit, many, one, type Db } from './db';
import type { Actor } from './auth';
import { AppError, notFound } from './http';
import { notify } from './notify';
import { istToday } from './academics';

export const REQUEST_KINDS = {
  bonafide: 'Bonafide certificate', study: 'Study certificate', conduct: 'Conduct certificate',
  transfer: 'Transfer certificate (TC)', other_certificate: 'Other certificate', leave: 'Leave',
} as const;
type Kind = keyof typeof REQUEST_KINDS;
/** Certificates the app can print once approved; a TC is issued by the office in person. */
export const PRINTABLE: Kind[] = ['bonafide', 'study', 'conduct'];

export const requestInput = z.object({
  kind: z.enum(Object.keys(REQUEST_KINDS) as [Kind, ...Kind[]]), reason: z.string().trim().min(5).max(1000),
  from_date: z.iso.date().optional(), to_date: z.iso.date().optional(),
}).strict().refine((r) => r.kind !== 'leave' || (r.from_date && r.to_date && r.to_date >= r.from_date), { message: 'Choose leave dates (to on or after from)', path: ['to_date'] });

export async function createRequest(c: Db, a: Actor, studentId: string, i: z.infer<typeof requestInput>) {
  if (i.kind === 'leave' && i.from_date! < istToday(-7)) throw new AppError(400, 'validation', 'Leave can be requested at most 7 days back', { fields: ['from_date'] });
  const open = await one(c, `select 1 from service_requests where college_id = $1 and student_id = $2 and kind = $3 and status = 'pending' and kind <> 'leave'`, [a.collegeId, studentId, i.kind]);
  if (open) throw new AppError(409, 'duplicate', `You already have a pending ${REQUEST_KINDS[i.kind].toLowerCase()} request`);
  const r = await one(c, `insert into service_requests (college_id, student_id, kind, reason, from_date, to_date) values ($1,$2,$3,$4,$5,$6) returning id`,
    [a.collegeId, studentId, i.kind, i.reason, i.kind === 'leave' ? i.from_date : null, i.kind === 'leave' ? i.to_date : null]);
  for (const s of await many(c, `select user_id from memberships where college_id = $1 and role = 'admin' and status = 'active'`, [a.collegeId]))
    await notify(c, a.collegeId, s.user_id, `request:${r.id}`, `New request: ${REQUEST_KINDS[i.kind]}`, `From ${a.displayName}. Open Requests to decide.`);
  return { id: r.id as string };
}

const VIEW = `select r.*, st.display_name, st.roll_no, st.current_semester, st.section, st.user_id, b.code branch, b.name branch_name, co.name college
  from service_requests r join students st on st.id = r.student_id and st.college_id = r.college_id
  join curricula cu on cu.id = st.curriculum_id and cu.college_id = st.college_id
  join branches b on b.id = cu.branch_id and b.college_id = cu.college_id
  join colleges co on co.id = r.college_id where r.college_id = $1`;

export const myRequests = (c: Db, a: Actor, studentId: string) => many(c, `${VIEW} and r.student_id = $2 order by r.created_at desc limit 50`, [a.collegeId, studentId]);
export const listRequests = (c: Db, a: Actor, status: string | null) =>
  many(c, `${VIEW} and ($2::text is null or r.status = $2) order by r.status = 'pending' desc, r.created_at desc limit 200`, [a.collegeId, status]);

/** Student sees own; the office sees all. */
export async function requestView(c: Db, a: Actor, id: string) {
  const r = await one(c, `${VIEW} and r.id = $2`, [a.collegeId, id]);
  if (!r || (!a.roles.includes('admin') && r.student_id !== a.studentId)) throw notFound();
  return r;
}

const NEXT: Record<string, string[]> = { pending: ['approved', 'rejected'], approved: ['ready'] };
export const decideInput = z.object({ status: z.enum(['approved', 'rejected', 'ready']), note: z.string().trim().max(500).default('') }).strict();

export async function decideRequest(c: Db, a: Actor, id: string, i: z.infer<typeof decideInput>) {
  const r = await one(c, 'select * from service_requests where college_id = $1 and id = $2 for update', [a.collegeId, id]);
  if (!r) throw notFound();
  if (!(NEXT[r.status] ?? []).includes(i.status) || (i.status === 'ready' && r.kind === 'leave')) throw new AppError(409, 'bad_transition', `Cannot move from ${r.status} to ${i.status}`);
  await c.query(`update service_requests set status = $3, admin_note = case when $4 = '' then admin_note else $4 end, decided_by = $5, decided_at = now()
    where college_id = $1 and id = $2`, [a.collegeId, id, i.status, i.note, a.userId]);
  const st = await one(c, 'select user_id from students where college_id = $1 and id = $2', [a.collegeId, r.student_id]);
  const label = REQUEST_KINDS[r.kind as Kind];
  const msg = i.status === 'ready' ? 'Ready for collection at the administration office.' : i.note || (i.status === 'approved' && PRINTABLE.includes(r.kind) ? 'You can print it from Requests.' : 'Open Requests for details.');
  await notify(c, a.collegeId, st!.user_id, `request:${id}:${i.status}`, `${label} ${i.status === 'ready' ? 'is ready' : i.status}`, msg, 'Administration office');
  await audit(c, { collegeId: a.collegeId, actor: a.userId, action: `request.${i.status}`, target: id, result: 'ok' });
  return { status: i.status };
}

// ---- Online scholarship documents

export const UPLOAD_MAX = 2 * 1024 * 1024;
export const UPLOAD_TYPES = ['application/pdf', 'image/jpeg', 'image/png'];

/** Only for a requirement of the student's own scholarship scheme. Marks it "submitted" for the office to verify. */
export async function uploadDocument(c: Db, a: Actor, studentId: string, requirementId: string, f: { name: string; mime: string; bytes: Buffer }) {
  const req = await one(c, `select r.name from document_requirements r join scholarship_cases sc on sc.scheme_id = r.scheme_id and sc.college_id = r.college_id
    where r.college_id = $1 and r.id = $2 and sc.student_id = $3 limit 1`, [a.collegeId, requirementId, studentId]);
  if (!req) throw notFound();
  const up = await one(c, `insert into document_uploads (college_id, student_id, requirement_id, filename, mime, bytes) values ($1,$2,$3,$4,$5,$6) returning id`,
    [a.collegeId, studentId, requirementId, f.name, f.mime, f.bytes]);
  await c.query(`insert into student_documents (college_id, student_id, requirement_id, state, updated_at) values ($1,$2,$3,'submitted',now())
    on conflict (student_id, requirement_id) do update set state = 'submitted', updated_at = now()`, [a.collegeId, studentId, requirementId]);
  await audit(c, { collegeId: a.collegeId, actor: a.userId, action: 'document.upload', target: `${studentId}:${requirementId}`, result: 'ok' });
  return { id: up.id as string, state: 'submitted' };
}

export async function latestUploads(c: Db, a: Actor, studentId: string) {
  const rows = await many(c, `select distinct on (requirement_id) id, requirement_id, filename, uploaded_at from document_uploads
    where college_id = $1 and student_id = $2 order by requirement_id, uploaded_at desc`, [a.collegeId, studentId]);
  return Object.fromEntries(rows.map((r) => [r.requirement_id, r])) as Record<string, { id: string; filename: string; uploaded_at: Date }>;
}

export async function uploadFile(c: Db, a: Actor, id: string) {
  const f = await one(c, 'select student_id, filename, mime, bytes from document_uploads where college_id = $1 and id = $2', [a.collegeId, id]);
  if (!f || (!a.roles.includes('admin') && f.student_id !== a.studentId)) throw notFound();
  return f;
}
