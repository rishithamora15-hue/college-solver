import Link from 'next/link';
import { pageActor, q } from '@/server/page';
import { feeOverview } from '@/server/finance';
import { studentPayments } from '@/server/admin';
import { day, Empty, inr, Source, Status, SectionTabs } from '../../ui';

export default async function Fees() {
  const a = await pageActor();
  if (!a.studentId) return <Empty>Fees are visible to students only.</Empty>;
  const [f, pays] = await q(a, async (c) => [await feeOverview(c, a, a.studentId!), await studentPayments(c, a, a.studentId!)] as const);
  return (
    <>
      <span className="page-eyebrow">Financial support</span><h1>Fees &amp; Scholarships</h1>
      <p className="page-lead">Know what you owe, what has actually been credited and what needs your attention.</p>
      <SectionTabs section="office" current="/fees" />
      {f.stale && <div className="banner warn" role="status">Fee data is older than 7 days and may be out of date.</div>}
      {!f.years.length && <Empty>No fee records found for you.</Empty>}
      {f.years.map((y) => (
        <section className="card" key={y.year}>
          <h2>{y.year}</h2>
          <div className="grid">
            <div><div className="muted">Assessed</div><strong>{inr(y.assessed_paise)}</strong></div>
            <div><div className="muted">Paid by you</div><strong>{inr(y.paid_paise)}</strong></div>
            <div><div className="muted">Scholarship actually credited</div><strong>{inr(y.scholarship_credited_paise)}</strong></div>
            <div><div className="muted">Outstanding (ledger)</div><strong>{y.outstanding_paise < 0 ? `${inr(-y.outstanding_paise)} credit` : inr(y.outstanding_paise)}</strong></div>
          </div>
          {y.expected_uncredited_paise > 0 && (
            <p className="banner info">
              Expected scholarship <strong>not yet received</strong>: {inr(y.expected_uncredited_paise)}. It is not counted as paid.
              If it is credited in full, you would owe {inr(Math.max(0, y.projected_student_remainder_paise))} (projection only).
            </p>
          )}
          <div className="scroll fee-breakdown"><table>
            <caption className="muted" style={{ textAlign: 'left' }}>Breakdown by category</caption>
            <thead><tr><th>Category</th><th className="num">Assessed</th><th className="num">Paid</th><th className="num">Scholarship credited</th><th className="num">Outstanding</th><th>Due</th></tr></thead>
            <tbody>{y.rows.map((r) => (
              <tr key={r.id}><td data-label="Category">{r.category}</td><td data-label="Assessed" className="num">{inr(r.amount_paise)}</td><td data-label="Paid" className="num">{inr(r.paid_paise)}</td><td data-label="Scholarship credit" className="num">{inr(r.scholarship_credited_paise)}</td>
                <td data-label="Outstanding" className="num">{inr(r.outstanding_paise)}</td>
                <td data-label="Due">{day(r.due_at)} {r.outstanding_paise <= 0 ? <Status s="cleared" /> : +new Date(r.due_at) < Date.now() ? <Status s="overdue" /> : null}</td></tr>
            ))}</tbody>
          </table></div>
          <Source ref_={y.rows[0]?.source_ref ?? 'unknown'} at={y.rows[0]?.observed_at} />
        </section>
      ))}
      <section className="card tone-teal">
        <h2>Payments and receipts</h2>
        {!pays.length ? <p className="muted">No payments recorded yet. Pay at the accounts office; your receipt appears here.</p> : (
          <ul className="inline-list">{pays.map((p) => (
            <li key={p.id} className="request-row"><div><strong>{inr(p.amount_paise)}</strong> · {p.kind === 'scholarship_credit' ? 'Scholarship credit' : 'Fee payment'}
              <div className="muted small">{p.external_ref} · {day(p.posted_at)}</div></div>
              <Link className="btn secondary" href={`/receipts/${p.id}`}>Receipt</Link></li>
          ))}</ul>
        )}
        <p className="muted small">Online card/UPI payment needs the college&apos;s payment-gateway account and is not switched on yet.</p>
      </section>
      <h2>Scholarships</h2>
      {!f.cases.length && <Empty>No scholarship applications on record.</Empty>}
      {f.cases.map((k) => (
        <section className="card" key={k.id}>
          <h3>{k.scheme_name} · {k.academic_year}</h3>
          <p>Status: <Status s={k.status} /> · expected {inr(k.expected_paise)} · released {inr(k.released_paise)} · <strong>credited {inr(k.credited_paise)}</strong></p>
          <Link href={`/fees/${k.id}`}>Timeline, documents and help</Link>
        </section>
      ))}
    </>
  );
}
