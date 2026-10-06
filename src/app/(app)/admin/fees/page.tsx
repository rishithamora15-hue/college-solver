import Link from 'next/link';
import { pageActor, q } from '@/server/page';
import { classOptions, recentPayments } from '@/server/admin';
import { FeeForm } from '../../../client';
import { day, inr, NotFound, targetOptions } from '../../../ui';

export default async function AdminFees() {
  const a = await pageActor();
  if (!a.roles.includes('admin')) return <NotFound what="Fees" />;
  const [classes, pays] = await q(a, async (c) => [await classOptions(c, a), await recentPayments(c, a)] as const);
  return (
    <>
      <span className="page-eyebrow">Administration office</span><h1>Fees &amp; payments</h1>
      <p className="page-lead">Set fees for a class, record payments from a student&apos;s page, and download reports for the accounts team.</p>
      <div className="split">
        <section className="card tone-amber"><h2>Add a fee to a class</h2><FeeForm targets={targetOptions(classes)} /></section>
        <section className="card tone-teal">
          <h2>Reports (open in Excel)</h2>
          <ul className="inline-list">
            <li><a href="/api/v1/admin/export?kind=dues">Outstanding dues by student</a></li>
            <li><a href="/api/v1/admin/export?kind=payments">All payments and receipts</a></li>
            <li><a href="/api/v1/admin/export?kind=students">Student list</a></li>
            <li><a href="/api/v1/admin/export?kind=attendance">Attendance by subject</a></li>
          </ul>
          <p className="muted small">To record a payment, open the student from <Link href="/admin/students">Students</Link>.</p>
        </section>
      </div>
      <section className="card">
        <h2>Recent payments</h2>
        {!pays.length ? <p className="muted">No payments yet.</p> : (
          <div className="scroll"><table>
            <thead><tr><th>Date</th><th>Receipt</th><th>Student</th><th>Type</th><th className="num">Amount</th></tr></thead>
            <tbody>{pays.map((p) => (
              <tr key={p.id}><td>{day(p.posted_at)}</td><td><a href={`/receipts/${p.id}`}>{p.external_ref}</a></td>
                <td><Link href={`/admin/students/${p.student_id}`}>{p.display_name}</Link> <span className="muted small">{p.roll_no}</span></td>
                <td>{p.kind === 'scholarship_credit' ? 'Scholarship credit' : p.mode ?? 'Payment'}</td><td className="num">{inr(p.amount_paise)}</td></tr>
            ))}</tbody>
          </table></div>
        )}
      </section>
    </>
  );
}
