import Link from 'next/link';
import { pageActor, q } from '@/server/page';
import { adminStats, pendingDocuments, recentNotices } from '@/server/admin';
import { DocState } from '../../client';
import { Empty, inr, NotFound, Stat, Status, when } from '../../ui';

export default async function AdminHome() {
  const a = await pageActor();
  if (!a.roles.includes('admin')) return <NotFound what="The administration dashboard" />;
  const [stats, pending, recent] = await q(a, async (c) => [await adminStats(c, a), await pendingDocuments(c, a), await recentNotices(c, a)] as const);
  return (
    <>
      <section className="hero hero-admin entry-rise">
        <div>
          <span className="page-eyebrow">Administration office · {a.collegeName}</span>
          <h1>Find a student, help them in seconds.</h1>
          <p>Search by roll number or mobile number, verify documents, update scholarships and send a notice that pops up on the student&apos;s screen.</p>
          <form className="hero-search" method="get" action="/admin/students" role="search">
            <label htmlFor="q" className="sr-only">Roll number, mobile number, email or name</label>
            <input id="q" name="q" placeholder="Roll number, mobile number, email or name" required />
            <button>Find student</button>
          </form>
        </div>
      </section>

      <div className="stat-grid">
        <Stat tone="violet" label="Students" value={stats.students} />
        <Stat tone="amber" label="Documents to verify" value={stats.docs_to_verify} />
        <Stat tone="teal" label="Scholarships awaiting credit" value={stats.awaiting_credit} />
        <Stat tone="rose" label="Open complaints" value={stats.open_complaints} href="/complaints" />
        <Stat tone="sky" label="Pending requests" value={stats.pending_requests} href="/admin/requests" />
        <Stat tone="teal" label="Collected today" value={inr(stats.collected_today)} href="/admin/fees" />
      </div>

      <div className="split">
        <section className="card">
          <h2>Scholarship documents pending</h2>
          {!pending.length ? <p className="muted">Every scholarship document is verified.</p> : (
            <div className="scroll"><table>
              <thead><tr><th>Student</th><th>Document</th><th>Status</th><th>Action</th></tr></thead>
              <tbody>{pending.map((d) => (
                <tr key={`${d.student_id}:${d.requirement_id}`}>
                  <td><Link href={`/admin/students/${d.student_id}`}>{d.display_name}</Link><div className="muted small">{d.roll_no}</div></td>
                  <td>{d.doc}</td><td><Status s={d.state} /></td>
                  <td><DocState compact studentId={d.student_id} reqId={d.requirement_id} state={d.state} /></td>
                </tr>
              ))}</tbody>
            </table></div>
          )}
        </section>
        <section className="card">
          <h2>Recent notices</h2>
          {!recent.length ? <Empty>No notices sent yet. Find a student to send one.</Empty> : (
            <ul className="inline-list">{recent.map((n, i) => (
              <li key={i}><strong>{n.title}</strong><div className="muted small">
                to <Link href={`/admin/students/${n.student_id}`}>{n.display_name}</Link> · {when(n.created_at)} · {n.read_at ? 'seen' : 'not seen yet'}
              </div></li>
            ))}</ul>
          )}
        </section>
      </div>
    </>
  );
}
