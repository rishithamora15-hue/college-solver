// In-app notifications only (no external email on Tuesday). Unique (college, user, event_key, channel) = dedup.
import { flagEnabled, many, one, type Db } from './db';

export async function notify(c: Db, collegeId: string, userId: string, eventKey: string, title: string, body: string) {
  const r = await c.query(`insert into notifications (college_id, user_id, event_key, title, body, state) values ($1,$2,$3,$4,$5,'delivered')
    on conflict (college_id, user_id, event_key, channel) do nothing`, [collegeId, userId, eventKey, title, body]);
  return r.rowCount === 1;
}

export async function complaintNotify(c: Db, collegeId: string, p: { complaint_id: string; status?: string }) {
  const cm = await one(c, 'select cm.id, cm.receipt_no, cm.status, st.user_id from complaints cm join students st on st.id = cm.student_id and st.college_id = cm.college_id where cm.college_id = $1 and cm.id = $2', [collegeId, p.complaint_id]);
  if (!cm) return;
  const status = p.status ?? 'submitted';
  await notify(c, collegeId, cm.user_id, `complaint:${cm.id}:${status}`, `Complaint ${cm.receipt_no}: ${status.replace('_', ' ')}`, 'Open the complaint to see its timeline.');
  if (status === 'submitted' || status === 'reopened')
    for (const s of await many(c, `select user_id from memberships where college_id = $1 and role = 'finance_staff' and status = 'active'`, [collegeId]))
      await notify(c, collegeId, s.user_id, `complaint:${cm.id}:${status}:staff`, `New complaint ${cm.receipt_no}`, 'A student complaint needs handling.');
}

/**
 * Reminder sweep for one college. State is rechecked at send time, so paid fees, credited/closed cases and
 * disabled preferences produce no reminder. Event keys are per item per day => repeated sweeps never duplicate.
 */
export async function reminderSweep(c: Db, collegeId: string, day: string) {
  if (!(await flagEnabled(c, 'reminders'))) return 0;
  let sent = 0;
  const fees = await many(c, `select st.user_id, fa.id, fa.category, fa.academic_year, fa.due_at,
      fa.amount_paise - coalesce((select sum(case when p.kind = 'refund' then -pa.amount_paise else pa.amount_paise end) from payment_allocations pa
        join payments p on p.id = pa.payment_id and p.college_id = pa.college_id where pa.assessment_id = fa.id and p.status = 'settled'), 0) outstanding
    from fee_assessments fa join students st on st.id = fa.student_id and st.college_id = fa.college_id
    left join notification_preferences np on np.college_id = st.college_id and np.user_id = st.user_id
    where fa.college_id = $1 and fa.due_at between now() and now() + interval '14 days' and coalesce(np.reminders_enabled, true)`, [collegeId]);
  for (const f of fees) if (Number(f.outstanding) > 0 &&
    await notify(c, collegeId, f.user_id, `reminder:fee:${f.id}:${day}`, `Fee due ${new Date(f.due_at).toDateString()}`, `${f.academic_year} ${f.category}: INR ${(Number(f.outstanding) / 100).toLocaleString('en-IN')} outstanding.`)) sent++;
  const docs = await many(c, `select st.user_id, r.id, r.name, sc.id case_id from scholarship_cases sc
    join students st on st.id = sc.student_id and st.college_id = sc.college_id
    join document_requirements r on r.scheme_id = sc.scheme_id and r.college_id = sc.college_id
    left join student_documents sd on sd.requirement_id = r.id and sd.student_id = st.id and sd.college_id = st.college_id
    left join notification_preferences np on np.college_id = st.college_id and np.user_id = st.user_id
    where sc.college_id = $1 and sc.status not in ('credited','rejected','cancelled')
      and (sd.state is null or sd.state in ('missing','rejected','expired') or sd.expires_at < now())
      and coalesce(np.reminders_enabled, true)
      and not exists (select 1 from complaints cm where cm.case_id = sc.id and cm.college_id = sc.college_id and cm.status = 'verified_closed')`, [collegeId]);
  for (const d of docs) if (await notify(c, collegeId, d.user_id, `reminder:doc:${d.id}:${day}`, `Scholarship document needed: ${d.name}`, 'Submit it to the college office to avoid release delays.')) sent++;
  return sent;
}
