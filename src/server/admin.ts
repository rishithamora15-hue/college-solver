// Administration office: fees, scholarships, document verification and notices to students.
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { audit, many, one, type Db } from './db';
import { hashPassword, type Actor } from './auth';
import { AppError, notFound } from './http';
import { feeOverview, rupeesToPaise } from './finance';
import { notify } from './notify';
import { studentAttendance } from './academics';
import { latestUploads, myRequests } from './requests';

/** 'credited' is never set by hand: it follows from a settled scholarship credit in the ledger. */
export const ADMIN_CASE_STATUSES = ['applied', 'under_verification', 'needs_documents', 'approved', 'released', 'rejected'] as const;
export const DOC_STATES = ['missing', 'submitted', 'accepted', 'rejected'] as const;
export const senderFor = (a: Actor) => (a.roles.includes('admin') ? 'Administration office' : 'Placement cell');

export async function adminStats(c: Db, a: Actor) {
  return (await one(c, `select
      (select count(*) from students where college_id = $1)::int students,
      (select count(*) from student_documents where college_id = $1 and state = 'submitted')::int docs_to_verify,
      (select count(*) from scholarship_cases sc where college_id = $1 and status in ('approved','released') and not exists (
        select 1 from payments p where p.scholarship_case_id = sc.id and p.college_id = sc.college_id and p.kind = 'scholarship_credit' and p.status = 'settled'))::int awaiting_credit,
      (select count(*) from complaints where college_id = $1 and status <> 'verified_closed')::int open_complaints,
      (select count(*) from service_requests where college_id = $1 and status = 'pending')::int pending_requests,
      (select coalesce(sum(amount_paise), 0) from payments where college_id = $1 and kind = 'student_payment' and status = 'settled'
        and posted_at >= date_trunc('day', now() at time zone 'Asia/Kolkata') at time zone 'Asia/Kolkata')::bigint collected_today`, [a.collegeId]))!;
}

/** Students with a scholarship document that is not yet verified: submitted ones first (they need a decision). */
export async function pendingDocuments(c: Db, a: Actor) {
  return many(c, `select st.id student_id, st.display_name, st.roll_no, r.id requirement_id, r.name doc, coalesce(sd.state, 'missing') state
    from scholarship_cases sc
    join students st on st.id = sc.student_id and st.college_id = sc.college_id
    join document_requirements r on r.scheme_id = sc.scheme_id and r.college_id = sc.college_id
    left join student_documents sd on sd.requirement_id = r.id and sd.student_id = st.id and sd.college_id = st.college_id
    where sc.college_id = $1 and sc.status not in ('credited','rejected','cancelled')
      and (sd.state is null or sd.state in ('missing','submitted','rejected','expired') or sd.expires_at < now())
    order by coalesce(sd.state, 'missing') = 'submitted' desc, st.display_name, r.name limit 50`, [a.collegeId]);
}

/** Students by search term (roll / mobile / email / name) and/or class "curriculum:semester:section". */
export async function listStudents(c: Db, a: Actor, f: { q?: string; cls?: string }) {
  const term = (f.q ?? '').trim().slice(0, 80);
  const phone = term.replace(/[\s-]/g, '').replace(/^(\+91|91)(?=\d{10}$)/, '');
  const [cur, sem, sec] = (f.cls ?? '').split(':');
  return many(c, `select st.id, st.display_name, st.roll_no, st.phone, st.current_semester, st.section, st.cgpa, u.email, b.code branch
    from students st join app_users u on u.id = st.user_id
    join curricula cu on cu.id = st.curriculum_id and cu.college_id = st.college_id
    join branches b on b.id = cu.branch_id and b.college_id = cu.college_id
    where st.college_id = $1 and ($4 = '' or upper(st.roll_no) like upper($2) || '%' escape '\\' or st.phone = $3 or lower(u.email) = lower($4)
      or st.display_name ilike '%' || $2 || '%' escape '\\')
      and ($5::uuid is null or (st.curriculum_id = $5 and st.current_semester = $6 and ($7 = '*' or st.section = $7)))
    order by b.code, st.current_semester, st.section, st.roll_no nulls last limit 300`,
  [a.collegeId, term.replace(/[\\%_]/g, '\\$&'), phone, term, cur && /^[0-9a-f-]{36}$/i.test(cur) ? cur : null, Number(sem) || 0, sec || '*']);
}
export const findStudents = (c: Db, a: Actor, q: string) => listStudents(c, a, { q });

/** Classes that have students, for targeting fees and notices. */
export async function classOptions(c: Db, a: Actor) {
  return many(c, `select distinct cu.id curriculum_id, b.code branch, st.current_semester semester, st.section from students st
    join curricula cu on cu.id = st.curriculum_id and cu.college_id = st.college_id join branches b on b.id = cu.branch_id and b.college_id = cu.college_id
    where st.college_id = $1 order by b.code, st.current_semester, st.section`, [a.collegeId]);
}
export async function branchCodes(c: Db, a: Actor) {
  return (await many(c, 'select distinct code from branches where college_id = $1 order by code', [a.collegeId])).map((r) => r.code as string);
}

/** "all" | "class:<curriculum>:<semester>:<section|*>" | "student:<id>" -> students. */
async function resolveTarget(c: Db, a: Actor, target: string) {
  const [kind, x, sem, sec] = target.split(':');
  if (kind === 'all') return many(c, 'select id, user_id from students where college_id = $1', [a.collegeId]);
  if (kind === 'student' && /^[0-9a-f-]{36}$/i.test(x)) return many(c, 'select id, user_id from students where college_id = $1 and id = $2', [a.collegeId, x]);
  if (kind === 'class' && /^[0-9a-f-]{36}$/i.test(x) && Number(sem) >= 1)
    return many(c, `select id, user_id from students where college_id = $1 and curriculum_id = $2 and current_semester = $3 and ($4 = '*' or section = $4)`, [a.collegeId, x, Number(sem), sec || '*']);
  throw new AppError(400, 'validation', 'Choose who this is for', { fields: ['target'] });
}

export async function studentFile(c: Db, a: Actor, id: string) {
  const st = await one(c, `select st.id, st.display_name, st.roll_no, st.phone, st.current_semester, st.section, st.cgpa, st.user_id, u.email, b.code branch
    from students st join app_users u on u.id = st.user_id
    join curricula cu on cu.id = st.curriculum_id and cu.college_id = st.college_id join branches b on b.id = cu.branch_id and b.college_id = cu.college_id
    where st.college_id = $1 and st.id = $2`, [a.collegeId, id]);
  if (!st) throw notFound();
  const fees = await feeOverview(c, a, id);
  const docs = await many(c, `select sc.id case_id, r.id, r.name, r.description, coalesce(sd.state, 'missing') state, sd.updated_at
    from scholarship_cases sc join document_requirements r on r.scheme_id = sc.scheme_id and r.college_id = sc.college_id
    left join student_documents sd on sd.requirement_id = r.id and sd.student_id = sc.student_id and sd.college_id = sc.college_id
    where sc.college_id = $1 and sc.student_id = $2 order by r.name`, [a.collegeId, id]);
  const notices = await many(c, `select title, body, sender, created_at, read_at from notifications
    where college_id = $1 and user_id = $2 order by created_at desc limit 8`, [a.collegeId, st.user_id]);
  const [payments, uploads, attendance, requests] = [await studentPayments(c, a, id), await latestUploads(c, a, id), await studentAttendance(c, a, id), await myRequests(c, a, id)];
  return { st, fees, docs, notices, payments, uploads, attendance, requests };
}

export async function recentNotices(c: Db, a: Actor) {
  return many(c, `select n.title, n.created_at, n.read_at, st.id student_id, st.display_name, st.roll_no from notifications n
    join students st on st.user_id = n.user_id and st.college_id = n.college_id
    where n.college_id = $1 and n.sender is not null order by n.created_at desc limit 8`, [a.collegeId]);
}

async function studentUser(c: Db, a: Actor, studentId: string) {
  const st = await one(c, 'select user_id from students where college_id = $1 and id = $2', [a.collegeId, studentId]);
  if (!st) throw notFound();
  return st.user_id as string;
}

/** A notice pops up on the student's screen (in-app; no SMS or email is sent). */
export async function sendNotice(c: Db, a: Actor, studentId: string, title: string, body: string) {
  const userId = await studentUser(c, a, studentId);
  await notify(c, a.collegeId, userId, `notice:${randomUUID()}`, title, body, senderFor(a));
  await audit(c, { collegeId: a.collegeId, actor: a.userId, action: 'notice.send', target: studentId, result: 'ok' });
}

const DOC_NOTICE: Record<string, [string, string] | undefined> = {
  missing: ['Document verification pending', 'Submit this document to the administration office so your scholarship is not held up.'],
  accepted: ['Document verified', 'The administration office accepted this document.'],
  rejected: ['Document rejected', 'Please resubmit a valid copy to the administration office.'],
};

export async function setDocumentState(c: Db, a: Actor, studentId: string, requirementId: string, state: (typeof DOC_STATES)[number]) {
  const userId = await studentUser(c, a, studentId);
  const req = await one(c, 'select name from document_requirements where college_id = $1 and id = $2', [a.collegeId, requirementId]);
  if (!req) throw notFound();
  await c.query(`insert into student_documents (college_id, student_id, requirement_id, state, updated_at) values ($1,$2,$3,$4,now())
    on conflict (student_id, requirement_id) do update set state = excluded.state, updated_at = now()`, [a.collegeId, studentId, requirementId, state]);
  const n = DOC_NOTICE[state];
  if (n) await notify(c, a.collegeId, userId, `doc:${requirementId}:${randomUUID()}`, `${n[0]}: ${req.name}`, n[1], senderFor(a));
  await audit(c, { collegeId: a.collegeId, actor: a.userId, action: `document.${state}`, target: `${studentId}:${requirementId}`, result: 'ok' });
  return { state };
}

export async function setCaseStatus(c: Db, a: Actor, caseId: string, status: (typeof ADMIN_CASE_STATUSES)[number], note: string) {
  const k = await one(c, `update scholarship_cases sc set status = $3, version = version + 1, observed_at = now(), source_ref = 'administration-office'
    from students st where sc.college_id = $1 and sc.id = $2 and st.id = sc.student_id and st.college_id = sc.college_id
    returning sc.version, st.user_id`, [a.collegeId, caseId, status]);
  if (!k) throw notFound();
  await c.query(`insert into scholarship_case_events (college_id, case_id, status, note, source_ref, occurred_at) values ($1,$2,$3,$4,'administration-office',now())`,
    [a.collegeId, caseId, status, note]);
  await notify(c, a.collegeId, k.user_id, `case:${caseId}:v${k.version}`, `Scholarship update: ${status.replaceAll('_', ' ')}`,
    note || 'Open Fees & Scholarships to see the timeline.', senderFor(a));
  await audit(c, { collegeId: a.collegeId, actor: a.userId, action: `scholarship.${status}`, target: caseId, result: 'ok' });
  return { status, version: k.version };
}

// ---- Student records

const phoneField = z.string().transform((s) => s.replace(/[\s-]/g, '').replace(/^(\+91|91)(?=\d{10}$)/, '')).pipe(z.string().regex(/^([6-9]\d{9})?$/, 'Enter a 10-digit mobile number'));
export const studentRow = z.object({
  display_name: z.string().trim().min(1).max(80), email: z.email().max(200).transform((e) => e.toLowerCase()),
  roll_no: z.string().trim().toUpperCase().regex(/^[A-Z0-9-]{3,20}$/, 'Roll number: 3-20 letters/digits'),
  phone: phoneField.optional(), branch: z.string().trim().toUpperCase().min(1).max(10),
  semester: z.coerce.number().int().min(1).max(8), section: z.string().trim().toUpperCase().regex(/^[A-Z]$/).default('A'),
}).strict();

/**
 * Adds students (one, or up to 500 from a spreadsheet). All-or-nothing: any bad row -> nothing is saved and every problem is listed.
 * Each student signs in with their college email and roll number.
 */
export async function addStudents(c: Db, a: Actor, raw: unknown[]) {
  if (!raw.length || raw.length > 500) throw new AppError(400, 'validation', 'Upload between 1 and 500 students at a time');
  const cur = Object.fromEntries((await many(c, `select distinct on (b.code) b.code, cu.id from curricula cu join branches b on b.id = cu.branch_id and b.college_id = cu.college_id
    where cu.college_id = $1 order by b.code, cu.version desc`, [a.collegeId])).map((r) => [r.code, r.id]));
  const problems: string[] = [];
  const rows = raw.map((r, n) => {
    const p = studentRow.safeParse(r);
    if (!p.success) { problems.push(`Row ${n + 1}: ${p.error.issues.map((i) => `${i.path.join('.')} ${i.message}`.trim()).join('; ')}`); return null; }
    if (!cur[p.data.branch]) problems.push(`Row ${n + 1}: unknown branch ${p.data.branch} (known: ${Object.keys(cur).join(', ')})`);
    return p.data;
  }).filter((r): r is z.infer<typeof studentRow> => !!r);
  const dup = (k: 'email' | 'roll_no') => rows.map((r) => r[k]).filter((v, i, all) => all.indexOf(v) !== i);
  for (const v of [...dup('email'), ...dup('roll_no')]) problems.push(`${v} appears twice in the upload`);
  if (rows.length) {
    for (const r of await many(c, 'select email from app_users where email = any($1::text[])', [rows.map((r) => r.email)])) problems.push(`${r.email} already has an account`);
    for (const r of await many(c, 'select roll_no from students where college_id = $1 and upper(roll_no) = any($2::text[])', [a.collegeId, rows.map((r) => r.roll_no)])) problems.push(`Roll number ${r.roll_no} already exists`);
  }
  if (problems.length) throw new AppError(400, 'rows_invalid', 'Nothing was saved. Fix these and try again.', { problems: problems.slice(0, 50) });
  const hashes = await Promise.all(rows.map((r) => hashPassword(r.roll_no)));
  for (const [n, r] of rows.entries()) {
    const uid = randomUUID();
    await c.query('insert into app_users (id, auth_subject, email, display_name, password_hash) values ($1,$2,$3,$4,$5)', [uid, 'local:' + randomUUID(), r.email, r.display_name, hashes[n]]);
    await c.query('select admit_student($1)', [uid]); // memberships are not writable by the runtime role; see migration 004
    await c.query(`insert into students (id, college_id, user_id, curriculum_id, current_semester, display_name, roll_no, phone, section) values ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      [randomUUID(), a.collegeId, uid, cur[r.branch], r.semester, r.display_name, r.roll_no, r.phone || null, r.section]);
  }
  await audit(c, { collegeId: a.collegeId, actor: a.userId, action: 'students.add', target: String(rows.length), result: 'ok' });
  return { added: rows.length };
}

export const studentUpdate = z.object({
  current_semester: z.number().int().min(1).max(8).optional(), section: z.string().trim().toUpperCase().regex(/^[A-Z]$/).optional(),
  cgpa: z.number().min(0).max(10).multipleOf(0.01).nullable().optional(), phone: phoneField.optional(),
}).strict();
export async function updateStudent(c: Db, a: Actor, id: string, i: z.infer<typeof studentUpdate>) {
  const r = await c.query(`update students set current_semester = coalesce($3, current_semester), section = coalesce($4, section),
      cgpa = case when $5 then $6 else cgpa end, phone = case when $7 then nullif($8, '') else phone end
    where college_id = $1 and id = $2`, [a.collegeId, id, i.current_semester ?? null, i.section ?? null, i.cgpa !== undefined, i.cgpa ?? null, i.phone !== undefined, i.phone ?? null]);
  if (!r.rowCount) throw notFound();
  await audit(c, { collegeId: a.collegeId, actor: a.userId, action: 'student.update', target: id, result: 'ok' });
  return { ok: true };
}

// ---- Fees, payments and receipts

const CATEGORIES = ['tuition', 'transport', 'hostel', 'exam', 'other'] as const;
export const feeInput = z.object({
  target: z.string().max(120), academic_year: z.string().regex(/^\d{4}-\d{2}$/, 'Use a year like 2025-26'), category: z.enum(CATEGORIES),
  amount: rupeesToPaise, due: z.iso.date(),
}).strict();

/** Adds a fee to one student or a whole class; each student is notified. */
export async function addFee(c: Db, a: Actor, i: z.infer<typeof feeInput>) {
  const students = await resolveTarget(c, a, i.target);
  if (!students.length) throw new AppError(400, 'validation', 'No students match', { fields: ['target'] });
  const due = new Date(`${i.due}T23:59:00+05:30`);
  for (const s of students) {
    const id = randomUUID();
    await c.query(`insert into fee_assessments (id, college_id, student_id, academic_year, category, amount_paise, due_at, policy_version, source_ref, observed_at)
      values ($1,$2,$3,$4,$5,$6,$7,'office-entered','administration-office',now())`, [id, a.collegeId, s.id, i.academic_year, i.category, i.amount, due]);
    await notify(c, a.collegeId, s.user_id, `fee:${id}`, `New fee: ${i.category} ${i.academic_year}`, `INR ${(i.amount / 100).toLocaleString('en-IN')} due ${due.toDateString()}.`, 'Administration office');
  }
  await audit(c, { collegeId: a.collegeId, actor: a.userId, action: 'fee.add', target: i.target, result: String(students.length) });
  return { count: students.length };
}

const allocated = async (c: Db, a: Actor, feeId: string) =>
  Number((await one(c, `select coalesce(sum(case when p.kind = 'refund' then -pa.amount_paise else pa.amount_paise end), 0)::bigint n from payment_allocations pa
    join payments p on p.id = pa.payment_id and p.college_id = pa.college_id where pa.college_id = $1 and pa.assessment_id = $2 and p.status = 'settled'`, [a.collegeId, feeId]))!.n);

export const feeEdit = z.object({ amount: rupeesToPaise, due: z.iso.date() }).strict();
export async function editFee(c: Db, a: Actor, feeId: string, i: z.infer<typeof feeEdit>) {
  const f = await one(c, 'select id from fee_assessments where college_id = $1 and id = $2 for update', [a.collegeId, feeId]);
  if (!f) throw notFound();
  const paid = await allocated(c, a, feeId);
  if (i.amount < paid) throw new AppError(409, 'below_paid', `Amount cannot be less than INR ${(paid / 100).toLocaleString('en-IN')} already paid`);
  await c.query(`update fee_assessments set amount_paise = $3, due_at = $4, observed_at = now(), source_ref = 'administration-office' where college_id = $1 and id = $2`,
    [a.collegeId, feeId, i.amount, new Date(`${i.due}T23:59:00+05:30`)]);
  await audit(c, { collegeId: a.collegeId, actor: a.userId, action: 'fee.edit', target: feeId, result: 'ok' });
  return { ok: true };
}

/** Outstanding fee rows of a student, oldest due first (optionally one academic year). */
async function outstandingRows(c: Db, a: Actor, studentId: string, year?: string) {
  const fees = await feeOverview(c, a, studentId);
  return fees.years.filter((y) => !year || y.year === year).flatMap((y) => y.rows).sort((x, y) => +new Date(x.due_at) - +new Date(y.due_at));
}
async function nextRef(c: Db, prefix: string) {
  const n = (await one(c, "select nextval('receipt_seq') n"))!.n;
  return `${prefix}-${new Date().getUTCFullYear()}-${String(n).padStart(6, '0')}`;
}

export const paymentInput = z.object({
  amount: rupeesToPaise, mode: z.enum(['cash', 'upi', 'card', 'bank_transfer', 'cheque', 'dd']), reference: z.string().trim().max(60).default(''),
}).strict();

/** Office-recorded payment with a receipt number. Applied to the oldest dues first; never more than what is owed. */
export async function recordPayment(c: Db, a: Actor, studentId: string, i: z.infer<typeof paymentInput>) {
  const st = await one(c, 'select user_id from students where college_id = $1 and id = $2 for update', [a.collegeId, studentId]);
  if (!st) throw notFound();
  if (['upi', 'card', 'bank_transfer', 'cheque', 'dd'].includes(i.mode) && !i.reference) throw new AppError(400, 'validation', 'Enter the transaction / cheque reference', { fields: ['reference'] });
  const rows = (await outstandingRows(c, a, studentId)).filter((r) => r.outstanding_paise > 0);
  const owed = rows.reduce((t, r) => t + r.outstanding_paise, 0);
  if (i.amount > owed) throw new AppError(409, 'overpayment', `Amount is more than the outstanding INR ${(owed / 100).toLocaleString('en-IN')}`);
  const receipt = await nextRef(c, 'RCPT');
  const id = randomUUID();
  await c.query(`insert into payments (id, college_id, student_id, kind, status, source, external_ref, amount_paise, posted_at, mode, reference, recorded_by)
    values ($1,$2,$3,'student_payment','settled','admin-office',$4,$5,now(),$6,$7,$8)`, [id, a.collegeId, studentId, receipt, i.amount, i.mode, i.reference || null, a.userId]);
  let left = i.amount;
  for (const r of rows) {
    if (!left) break;
    const take = Math.min(left, r.outstanding_paise);
    await c.query('insert into payment_allocations (college_id, payment_id, assessment_id, amount_paise) values ($1,$2,$3,$4)', [a.collegeId, id, r.id, take]);
    left -= take;
  }
  await notify(c, a.collegeId, st.user_id, `payment:${id}`, `Payment received: INR ${(i.amount / 100).toLocaleString('en-IN')}`, `Receipt ${receipt}. Open Fees to view or print it.`, 'Administration office');
  await audit(c, { collegeId: a.collegeId, actor: a.userId, action: 'payment.record', target: id, result: receipt });
  return { payment_id: id, receipt };
}

export const creditInput = z.object({ amount: rupeesToPaise, reference: z.string().trim().min(2).max(60) }).strict();

/**
 * Records money actually received from the sanctioning authority into the student's fee ledger.
 * This is the ONLY way a case becomes "credited".
 */
export async function recordScholarshipCredit(c: Db, a: Actor, caseId: string, i: z.infer<typeof creditInput>) {
  const k = await one(c, `select sc.*, st.user_id,
      coalesce((select sum(p.amount_paise) from payments p where p.scholarship_case_id = sc.id and p.college_id = sc.college_id and p.kind = 'scholarship_credit' and p.status = 'settled'), 0)::bigint credited
    from scholarship_cases sc join students st on st.id = sc.student_id and st.college_id = sc.college_id where sc.college_id = $1 and sc.id = $2 for update of sc`, [a.collegeId, caseId]);
  if (!k) throw notFound();
  const room = Number(k.expected_paise) - Number(k.credited);
  if (i.amount > room) throw new AppError(409, 'over_credit', `Only INR ${(room / 100).toLocaleString('en-IN')} of this scholarship is still uncredited`);
  const rows = await outstandingRows(c, a, k.student_id, k.academic_year);
  if (!rows.length) throw new AppError(409, 'no_fees', `No fee is assessed for ${k.academic_year} to credit against`);
  const ref = await nextRef(c, 'SCH');
  const id = randomUUID();
  await c.query(`insert into payments (id, college_id, student_id, kind, status, source, external_ref, amount_paise, scholarship_case_id, posted_at, reference, recorded_by)
    values ($1,$2,$3,'scholarship_credit','settled','admin-office',$4,$5,$6,now(),$7,$8)`, [id, a.collegeId, k.student_id, ref, i.amount, caseId, i.reference, a.userId]);
  let left = i.amount;
  for (const [n, r] of rows.entries()) {
    const take = n === rows.length - 1 ? left : Math.min(left, Math.max(0, r.outstanding_paise)); // any excess sits on the last row as a credit balance
    if (take > 0) await c.query('insert into payment_allocations (college_id, payment_id, assessment_id, amount_paise) values ($1,$2,$3,$4)', [a.collegeId, id, r.id, take]);
    left -= take;
  }
  const full = i.amount === room;
  const v = await one(c, `update scholarship_cases set status = $3, released_paise = greatest(released_paise, $4), version = version + 1, observed_at = now(), source_ref = 'administration-office'
    where college_id = $1 and id = $2 returning version`, [a.collegeId, caseId, full ? 'credited' : k.status, Number(k.credited) + i.amount]);
  await c.query(`insert into scholarship_case_events (college_id, case_id, status, note, source_ref, occurred_at) values ($1,$2,$3,$4,'administration-office',now())`,
    [a.collegeId, caseId, full ? 'credited' : k.status, `Credited INR ${(i.amount / 100).toLocaleString('en-IN')} (${ref})`]);
  await notify(c, a.collegeId, k.user_id, `case:${caseId}:v${v!.version}`, `Scholarship credited: INR ${(i.amount / 100).toLocaleString('en-IN')}`, 'It now reduces your fee balance.', 'Administration office');
  await audit(c, { collegeId: a.collegeId, actor: a.userId, action: 'scholarship.credit', target: caseId, result: ref });
  return { payment_id: id, reference: ref, status: full ? 'credited' : k.status };
}

export async function studentPayments(c: Db, a: Actor, studentId: string) {
  return many(c, `select id, kind, external_ref, amount_paise, mode, posted_at from payments
    where college_id = $1 and student_id = $2 and status = 'settled' order by posted_at desc limit 50`, [a.collegeId, studentId]);
}
export async function recentPayments(c: Db, a: Actor) {
  return many(c, `select p.id, p.kind, p.external_ref, p.amount_paise, p.mode, p.posted_at, st.id student_id, st.display_name, st.roll_no
    from payments p join students st on st.id = p.student_id and st.college_id = p.college_id
    where p.college_id = $1 and p.status = 'settled' order by p.posted_at desc limit 30`, [a.collegeId]);
}

/** Printable receipt: the student it belongs to, or the office. */
export async function receipt(c: Db, a: Actor, paymentId: string) {
  const p = await one(c, `select p.*, st.display_name, st.roll_no, st.current_semester, st.section, b.code branch, co.name college, u.display_name recorded_by_name
    from payments p join students st on st.id = p.student_id and st.college_id = p.college_id
    join curricula cu on cu.id = st.curriculum_id and cu.college_id = st.college_id join branches b on b.id = cu.branch_id and b.college_id = cu.college_id
    join colleges co on co.id = p.college_id left join app_users u on u.id = p.recorded_by
    where p.college_id = $1 and p.id = $2`, [a.collegeId, paymentId]);
  if (!p || (!a.roles.includes('admin') && p.student_id !== a.studentId)) throw notFound();
  const lines = await many(c, `select fa.academic_year, fa.category, pa.amount_paise from payment_allocations pa
    join fee_assessments fa on fa.id = pa.assessment_id and fa.college_id = pa.college_id where pa.college_id = $1 and pa.payment_id = $2 order by fa.academic_year, fa.category`, [a.collegeId, paymentId]);
  return { p, lines };
}

// ---- Notices to many students

export const broadcastInput = z.object({ target: z.string().max(120), title: z.string().trim().min(3).max(120), body: z.string().trim().max(1000).default('') }).strict();
export async function broadcast(c: Db, a: Actor, i: z.infer<typeof broadcastInput>) {
  const students = await resolveTarget(c, a, i.target);
  const key = `broadcast:${randomUUID()}`;
  for (const s of students) await notify(c, a.collegeId, s.user_id, key, i.title, i.body, 'Administration office');
  await audit(c, { collegeId: a.collegeId, actor: a.userId, action: 'notice.broadcast', target: i.target, result: String(students.length) });
  return { sent: students.length };
}
export async function broadcastHistory(c: Db, a: Actor) {
  return many(c, `select event_key, min(title) title, min(created_at) created_at, count(*)::int sent, count(read_at)::int seen from notifications
    where college_id = $1 and event_key like 'broadcast:%' group by event_key order by min(created_at) desc limit 20`, [a.collegeId]);
}

// ---- Exports (CSV opens in Excel)

export const EXPORTS = ['students', 'dues', 'payments', 'attendance'] as const;
export async function exportRows(c: Db, a: Actor, kind: (typeof EXPORTS)[number]): Promise<unknown[][]> {
  const rupees = (p: number) => (Number(p) / 100).toFixed(2);
  if (kind === 'students')
    return [['Roll number', 'Name', 'Email', 'Mobile', 'Branch', 'Semester', 'Section', 'CGPA'],
      ...(await listStudents(c, a, {})).map((s) => [s.roll_no, s.display_name, s.email, s.phone, s.branch, s.current_semester, s.section, s.cgpa])];
  if (kind === 'payments')
    return [['Date', 'Receipt', 'Roll number', 'Name', 'Type', 'Mode', 'Amount (INR)'],
      ...(await many(c, `select p.posted_at, p.external_ref, st.roll_no, st.display_name, p.kind, p.mode, p.amount_paise from payments p
        join students st on st.id = p.student_id and st.college_id = p.college_id where p.college_id = $1 and p.status = 'settled' order by p.posted_at desc`, [a.collegeId]))
        .map((r) => [r.posted_at, r.external_ref, r.roll_no, r.display_name, r.kind, r.mode, rupees(r.amount_paise)])];
  if (kind === 'attendance')
    return [['Roll number', 'Name', 'Subject', 'Classes held', 'Attended', 'Percent'],
      ...(await many(c, `select st.roll_no, st.display_name, s.code, count(*)::int held, count(*) filter (where am.present)::int attended
        from attendance_marks am join students st on st.id = am.student_id and st.college_id = am.college_id
        join attendance_sessions se on se.id = am.session_id and se.college_id = am.college_id
        join teaching_assignments ta on ta.id = se.assignment_id and ta.college_id = se.college_id
        join curriculum_subjects cs on cs.id = ta.curriculum_subject_id and cs.college_id = ta.college_id
        join subjects s on s.id = cs.subject_id and s.college_id = cs.college_id
        where am.college_id = $1 group by st.roll_no, st.display_name, s.code order by st.roll_no, s.code`, [a.collegeId]))
        .map((r) => [r.roll_no, r.display_name, r.code, r.held, r.attended, Math.round((100 * r.attended) / r.held)])];
  const rows: unknown[][] = [['Roll number', 'Name', 'Year', 'Category', 'Assessed', 'Paid', 'Scholarship credited', 'Outstanding', 'Due date']];
  for (const s of await listStudents(c, a, {}))
    for (const y of (await feeOverview(c, a, s.id)).years)
      for (const r of y.rows.filter((r) => r.outstanding_paise > 0))
        rows.push([s.roll_no, s.display_name, r.academic_year, r.category, rupees(r.amount_paise), rupees(r.paid_paise), rupees(r.scholarship_credited_paise), rupees(r.outstanding_paise), r.due_at]);
  return rows;
}
