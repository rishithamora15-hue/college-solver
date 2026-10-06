import Link from 'next/link';
import { pageActor, q } from '@/server/page';
import { myRequests, PRINTABLE, REQUEST_KINDS } from '@/server/requests';
import { RequestForm } from '../../client';
import { day, Empty, Status, when } from '../../ui';

export default async function Requests() {
  const a = await pageActor();
  if (!a.studentId) return <Empty>Requests are for students.</Empty>;
  const sid = a.studentId;
  const list = await q(a, (c) => myRequests(c, a, sid));
  return (
    <>
      <span className="page-eyebrow">Student services</span><h1>Certificates and leave.</h1>
      <p className="page-lead">Ask the administration office for a certificate or apply for leave. You get a notification when it is decided.</p>
      <section className="card tone-violet"><h2>New request</h2><RequestForm /></section>
      <section className="card">
        <h2>Your requests</h2>
        {!list.length ? <p className="muted">No requests yet.</p> : (
          <ul className="inline-list">{list.map((r) => (
            <li key={r.id} className="request-row">
              <div><strong>{REQUEST_KINDS[r.kind as keyof typeof REQUEST_KINDS]}</strong> <Status s={r.status} />
                <div className="muted small">{r.kind === 'leave' ? `${day(r.from_date)} to ${day(r.to_date)} · ` : ''}{r.reason} · sent {when(r.created_at)}</div>
                {r.admin_note && <div className="small">Office: {r.admin_note}</div>}</div>
              {['approved', 'ready'].includes(r.status) && PRINTABLE.includes(r.kind) && <Link className="btn secondary" href={`/requests/${r.id}`}>View certificate</Link>}
            </li>
          ))}</ul>
        )}
      </section>
    </>
  );
}
