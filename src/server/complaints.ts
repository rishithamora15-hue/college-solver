import { audit, flagEnabled, many, one, type Db } from './db';
import type { Actor } from './auth';
import { AppError, notFound, sha256 } from './http';
import { scholarshipDetail } from './finance';
import { enqueue } from './queue';

/** Manual draft: works with AI disabled. Department comes from the approved directory, never from user/model text. */
export async function manualDraft(c: Db, a: Actor, studentId: string, caseId: string, issue: string) {
  const d = await scholarshipDetail(c, a, studentId, caseId);
  const dept = await one(c, `select id from departments where college_id = $1 and handles = 'scholarship' order by name limit 1`, [a.collegeId]);
  if (!dept) throw new AppError(409, 'no_department', 'No approved department is configured');
  return one(c, `insert into complaint_drafts (college_id, student_id, case_id, case_version, department_id, subject, body)
    values ($1,$2,$3,$4,$5,$6,$7) returning id`, [a.collegeId, studentId, caseId, d.kase.version, dept.id,
    `Scholarship ${d.kase.academic_year}: ${d.kase.status}, not credited`.slice(0, 150),
    `Dear Scholarship Cell,\n\n${issue || 'My scholarship has not been credited to my fee account.'}\n\nThank you.`.slice(0, 3000)]);
}

export async function getDraft(c: Db, a: Actor, studentId: string, draftId: string) {
  const d = await one(c, `select cd.*, dp.name department, dp.contact_label from complaint_drafts cd join departments dp on dp.id = cd.department_id and dp.college_id = cd.college_id
    where cd.college_id = $1 and cd.student_id = $2 and cd.id = $3`, [a.collegeId, studentId, draftId]);
  if (!d) throw notFound();
  return d;
}

/**
 * Explicit, reviewed submission. One transaction: complaint + event + notification job (outbox) + audit.
 * Approval is bound to actor, tenant, draft, final content and the case version the student reviewed.
 */
export async function submitComplaint(c: Db, a: Actor, studentId: string, i: { draft_id: string; subject: string; body: string; case_version: number }) {
  if (!(await flagEnabled(c, 'complaints'))) throw new AppError(503, 'capability_disabled', 'Complaint submission is temporarily disabled');
  const d = await getDraft(c, a, studentId, i.draft_id);
  const kase = await one(c, 'select version from scholarship_cases where college_id = $1 and id = $2 for share', [a.collegeId, d.case_id]);
  if (!kase || kase.version !== i.case_version) throw new AppError(409, 'stale_review', 'The scholarship record changed. Review the draft again.');
  const seq = (await one(c, "select nextval('complaint_receipt_seq') n")).n;
  const receipt = `CMP-${new Date().getUTCFullYear()}-${String(seq).padStart(6, '0')}`;
  const cm = await one(c, `insert into complaints (college_id, student_id, case_id, department_id, draft_id, receipt_no, status, subject, body, content_hash)
    values ($1,$2,$3,$4,$5,$6,'submitted',$7,$8,$9) returning id, receipt_no, status, created_at`,
    [a.collegeId, studentId, d.case_id, d.department_id, d.id, receipt, i.subject, i.body, sha256(i.subject + '\n' + i.body)]);
  await c.query(`insert into complaint_events (college_id, complaint_id, actor_user_id, actor_role, status, note) values ($1,$2,$3,'student','submitted','Submitted by student')`, [a.collegeId, cm.id, a.userId]);
  await enqueue(c, { collegeId: a.collegeId, kind: 'complaint_notify', payload: { complaint_id: cm.id }, dedupKey: `complaint_notify:${cm.id}` });
  await audit(c, { collegeId: a.collegeId, actor: a.userId, action: 'complaint.submit', target: cm.id, result: 'ok' });
  return { complaint_id: cm.id, receipt_no: cm.receipt_no, status: cm.status, created_at: cm.created_at, department: d.department };
}

const STAFF_NEXT: Record<string, string[]> = {
  submitted: ['assigned', 'in_progress'], assigned: ['in_progress', 'awaiting_student', 'resolved'], in_progress: ['awaiting_student', 'resolved'],
  awaiting_student: ['in_progress', 'resolved'], reopened: ['assigned', 'in_progress'], resolved: ['verified_closed'], verified_closed: [],
};
const STUDENT_NEXT: Record<string, string[]> = { awaiting_student: ['in_progress'], resolved: ['reopened', 'verified_closed'], verified_closed: ['reopened'] };

/**
 * Status change with optimistic concurrency. `resolved` = staff claims resolution.
 * `verified_closed` needs a basis: source_credit_receipt (deterministically checked against the ledger) or attributed student_confirmation.
 */
export async function addEvent(c: Db, a: Actor, id: string, i: { status: string; note: string; expected_version: number; verification_basis?: 'source_credit_receipt' | 'student_confirmation' }) {
  const staff = a.roles.includes('finance_staff');
  const cm = await one(c, `select * from complaints where college_id = $1 and id = $2 for update`, [a.collegeId, id]);
  if (!cm || (!staff && cm.student_id !== a.studentId)) throw notFound();
  if (cm.version !== i.expected_version) throw new AppError(409, 'version_conflict', 'Complaint changed; reload');
  const allowed = (staff ? STAFF_NEXT : STUDENT_NEXT)[cm.status] ?? [];
  if (!allowed.includes(i.status)) throw new AppError(409, 'bad_transition', `Cannot move from ${cm.status} to ${i.status}`);
  let basis: string | null = null;
  if (i.status === 'verified_closed') {
    if (staff && i.verification_basis !== 'source_credit_receipt') throw new AppError(400, 'basis_required', 'Staff verification requires a source credit receipt');
    if (!staff) basis = 'student_confirmation';
    if (staff) {
      const credit = await one(c, `select external_ref from payments where college_id = $1 and scholarship_case_id = $2 and kind = 'scholarship_credit' and status = 'settled' order by posted_at desc limit 1`, [a.collegeId, cm.case_id]);
      if (!credit) throw new AppError(409, 'no_credit_receipt', 'No settled scholarship credit exists in the ledger for this case');
      basis = `source_credit_receipt:${credit.external_ref}`;
    }
  }
  await c.query('update complaints set status = $3, version = version + 1 where college_id = $1 and id = $2', [a.collegeId, id, i.status]);
  await c.query(`insert into complaint_events (college_id, complaint_id, actor_user_id, actor_role, status, note, verification_basis) values ($1,$2,$3,$4,$5,$6,$7)`,
    [a.collegeId, id, a.userId, staff ? 'finance_staff' : 'student', i.status, i.note.slice(0, 2000), basis]);
  await enqueue(c, { collegeId: a.collegeId, kind: 'complaint_notify', payload: { complaint_id: id, status: i.status }, dedupKey: `complaint_notify:${id}:v${cm.version + 1}` });
  await audit(c, { collegeId: a.collegeId, actor: a.userId, action: `complaint.${i.status}`, target: id, result: 'ok' });
  return { status: i.status, version: cm.version + 1 };
}

export async function complaintView(c: Db, a: Actor, id: string) {
  const staff = a.roles.includes('finance_staff');
  const cm = await one(c, `select cm.*, dp.name department from complaints cm join departments dp on dp.id = cm.department_id and dp.college_id = cm.college_id
    where cm.college_id = $1 and cm.id = $2 and ($3 or cm.student_id = $4)`, [a.collegeId, id, staff, a.studentId]);
  if (!cm) throw notFound();
  const events = await many(c, 'select status, note, actor_role, verification_basis, created_at from complaint_events where college_id = $1 and complaint_id = $2 order by created_at, id', [a.collegeId, id]);
  return { ...cm, events };
}

export async function listComplaints(c: Db, a: Actor) {
  const staff = a.roles.includes('finance_staff');
  return many(c, `select cm.id, cm.receipt_no, cm.status, cm.subject, cm.created_at, st.display_name student from complaints cm
    join students st on st.id = cm.student_id and st.college_id = cm.college_id
    where cm.college_id = $1 and ($2 or cm.student_id = $3) order by cm.created_at desc limit 100`, [a.collegeId, staff, a.studentId]);
}
