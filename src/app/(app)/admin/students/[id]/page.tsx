import Link from 'next/link';
import { isUuid } from '@/server/http';
import { orNull, pageActor, q } from '@/server/page';
import { ADMIN_CASE_STATUSES, studentFile } from '@/server/admin';
import { CaseStatusForm, CreditForm, DocState, FeeEdit, FeeForm, NoticeForm, PaymentForm, QuickForm, StudentEdit } from '../../../../client';
import { studentSetupOptions } from '@/server/setup';
import { MIN_ATTENDANCE } from '@/server/academics';
import { REQUEST_KINDS } from '@/server/requests';
import { day, initials, inr, NotFound, Status, when } from '../../../../ui';

export default async function StudentFile({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const a = await pageActor();
  if (!a.roles.includes('admin')) return <NotFound what="This student" />;
  const f = isUuid(id) ? await orNull(q(a, async (c) => ({ ...await studentFile(c, a, id), opts: await studentSetupOptions(c, a, id) }))) : null;
  if (!f) return <NotFound what="This student" />;
  const { opts } = f;
  const { st, fees, docs, notices, payments, uploads, attendance, requests } = f;
  const owed = fees.years.reduce((t, y) => t + Math.max(0, y.rows.reduce((s, r) => s + Math.max(0, r.outstanding_paise), 0)), 0);
  return (
    <>
      <Link href="/admin" className="back-link">← Dashboard</Link>
      <section className="profile-head entry-rise">
        <span className="avatar xl" aria-hidden="true">{initials(st.display_name)}</span>
        <div>
          <h1>{st.display_name}</h1>
          <p className="muted">Roll {st.roll_no ?? '—'} · {st.branch} semester {st.current_semester} section {st.section} · {st.email} · {st.phone ? `+91 ${st.phone}` : 'no mobile number'}</p>
        </div>
      </section>
      <section className="card"><h2>Record</h2><StudentEdit id={st.id} semester={st.current_semester} section={st.section} cgpa={st.cgpa} phone={st.phone ?? ''} /></section>

      <div className="split">
        <section className="card tone-violet">
          <h2>Send a notice</h2>
          <p className="muted">It pops up on the student&apos;s screen within seconds.</p>
          <NoticeForm studentId={st.id} name={st.display_name} />
        </section>
        <section className="card tone-amber">
          <h2>Fees</h2>
          {!fees.years.length ? <p className="muted">No fee records.</p> : fees.years.map((y) => (
            <div key={y.year} className="fee-mini">
              <strong>{y.year}</strong>
              <ul className="fee-lines">{y.rows.map((r) => (
                <li key={r.id}><span>{r.category} · due {day(r.due_at)}</span><span>{inr(r.amount_paise)} <FeeEdit id={r.id} amount={r.amount_paise} due={new Date(r.due_at).toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' })} /></span></li>
              ))}</ul>
              <dl>
                <div><dt>Assessed</dt><dd>{inr(y.assessed_paise)}</dd></div>
                <div><dt>Paid</dt><dd>{inr(y.paid_paise)}</dd></div>
                <div><dt>Scholarship credited</dt><dd>{inr(y.scholarship_credited_paise)}</dd></div>
                <div><dt>Outstanding</dt><dd className={y.outstanding_paise > 0 ? 'bad' : 'ok'}>{inr(y.outstanding_paise)}</dd></div>
              </dl>
            </div>
          ))}
        </section>
      </div>

      <div className="split">
        <section className="card tone-teal">
          <h2>Record a payment</h2>
          <p className="muted">Outstanding <strong>{inr(owed)}</strong>. Applied to the oldest dues first; a receipt is created and the student is notified.</p>
          <PaymentForm studentId={st.id} owed={owed} />
          {payments.length > 0 && <><h4>Payments</h4><ul className="inline-list">{payments.map((p) => (
            <li key={p.id}><a href={`/receipts/${p.id}`}>{p.external_ref}</a> · {inr(p.amount_paise)} · {p.kind === 'scholarship_credit' ? 'scholarship' : p.mode ?? 'ledger'} · {day(p.posted_at)}</li>
          ))}</ul></>}
        </section>
        <section className="card tone-amber"><h2>Add a fee for this student</h2><FeeForm targets={[[`student:${st.id}`, st.display_name]]} /></section>
      </div>
      <div className="split">
        <section className="card tone-sky">
          <h2>Attendance</h2>
          {!attendance.length ? <p className="muted">No attendance yet.</p> : <ul className="inline-list">{attendance.map((s) => { const pct = Math.round((100 * s.attended) / s.held); return (
            <li key={s.code}>{s.code} {s.name}: <strong className={pct < MIN_ATTENDANCE ? 'bad' : 'ok'}>{pct}%</strong> <span className="muted small">({s.attended}/{s.held})</span></li>
          ); })}</ul>}
        </section>
        <section className="card tone-violet">
          <h2>Requests</h2>
          {!requests.length ? <p className="muted">No requests.</p> : <ul className="inline-list">{requests.slice(0, 6).map((r) => (
            <li key={r.id}>{REQUEST_KINDS[r.kind as keyof typeof REQUEST_KINDS]} <Status s={r.status} /> <span className="muted small">{day(r.created_at)}</span></li>
          ))}</ul>}
          <a href="/admin/requests">All requests →</a>
        </section>
      </div>
      <h2 className="section-title">Scholarships</h2>
      <div className="split">
        <section className="card tone-teal">
          <h3>Open a scholarship application</h3>
          {!opts.schemes.length ? <p className="muted">Add a scheme under <Link href="/admin/setup?tab=scholarships">College setup</Link> first.</p> : (
            <QuickForm kind="case" extra={{ student_id: st.id }} submit="Open application" done="Application opened. The student sees it under Fees." fields={[
              { name: 'scheme_id', label: 'Scheme', type: 'select', options: opts.schemes.map((s: any) => [s.id, s.name]) },
              { name: 'academic_year', label: 'Academic year', placeholder: '2026-27' }, { name: 'expected_rupees', label: 'Expected amount (INR)', type: 'number' },
              { name: 'status', label: 'Current status', type: 'select', options: [['applied', 'Applied'], ['under_verification', 'Under verification'], ['approved', 'Approved'], ['needs_documents', 'Needs documents'], ['not_applied', 'Not applied yet']] }]} />
          )}
        </section>
        <section className="card">
          <h3>Backlogs</h3>
          <p className="muted">A subject with an active backlog stays open to the student in Learn, even from earlier semesters.</p>
          {opts.subjects.some((s: any) => s.backlog) && <ul className="inline-list">{opts.subjects.filter((s: any) => s.backlog).map((s: any) => (
            <li key={s.id} className="request-row"><span>Sem {s.semester} · {s.code} {s.name} <Status s={s.backlog} /></span>
              <QuickForm compact kind="backlog" extra={{ student_id: st.id, curriculum_subject_id: s.id, status: s.backlog === 'active' ? 'cleared' : 'active' }} submit={s.backlog === 'active' ? 'Mark cleared' : 'Mark active'} done="Saved." /></li>
          ))}</ul>}
          {opts.subjects.length > 0 ? <QuickForm kind="backlog" extra={{ student_id: st.id, status: 'active' }} submit="Add backlog" done="Backlog added." fields={[
            { name: 'curriculum_subject_id', label: 'Subject', type: 'select', options: opts.subjects.map((s: any) => [s.id, `Sem ${s.semester} · ${s.code} ${s.name}`]) }]} />
            : <p className="muted">No syllabus subjects for this student's branch yet.</p>}
        </section>
      </div>
      {!fees.cases.length && <p className="muted">No scholarship applications yet.</p>}
      {fees.cases.map((k) => (
        <section className="card tone-teal" key={k.id}>
          <div className="card-head"><h3>{k.scheme_name} · {k.academic_year}</h3><Status s={k.status} /></div>
          <p className="muted">Expected {inr(k.expected_paise)} · released {inr(k.released_paise)} · credited {inr(k.credited_paise)}</p>
          {k.status === 'credited' ? <p className="muted">Credited in the ledger. Status is final.</p> : <>
            <CaseStatusForm caseId={k.id} status={k.status} options={ADMIN_CASE_STATUSES} />
            {['approved', 'released'].includes(k.status) && <><h4>Money received from the authority?</h4><CreditForm caseId={k.id} room={k.expected_paise - k.credited_paise} /></>}
          </>}
          <h4>Documents</h4>
          <ul className="doc-list">{docs.filter((d) => d.case_id === k.id).map((d) => (
            <li key={d.id}><div><strong>{d.name}</strong><small className="muted">{d.description}
              {uploads[d.id] && <> · <a href={`/api/v1/uploads/${uploads[d.id].id}`}>view upload ({uploads[d.id].filename})</a></>}</small></div>
              <DocState studentId={st.id} reqId={d.id} state={d.state} /></li>
          ))}</ul>
        </section>
      ))}

      <section className="card">
        <h2>Notice history</h2>
        {!notices.length ? <p className="muted">Nothing sent yet.</p> : (
          <ul className="inline-list">{notices.map((n, i) => (
            <li key={i}><strong>{n.title}</strong> <span className="muted small">· {n.sender ?? 'system'} · {when(n.created_at)} · {n.read_at ? 'seen' : 'not seen yet'}</span></li>
          ))}</ul>
        )}
      </section>
    </>
  );
}
