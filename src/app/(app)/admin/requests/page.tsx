import Link from 'next/link';
import { pageActor, q } from '@/server/page';
import { listRequests, REQUEST_KINDS } from '@/server/requests';
import { RequestDecision } from '../../../client';
import { day, Empty, NotFound, Status, when } from '../../../ui';

const FILTERS = [['pending', 'Pending'], ['approved', 'Approved'], ['ready', 'Ready'], ['rejected', 'Rejected'], ['', 'All']] as const;

export default async function AdminRequests({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const a = await pageActor();
  if (!a.roles.includes('admin')) return <NotFound what="Requests" />;
  const sp = await searchParams;
  const status = FILTERS.some(([v]) => v === sp.status) ? sp.status! : 'pending';
  const list = await q(a, (c) => listRequests(c, a, status || null));
  return (
    <>
      <span className="page-eyebrow">Administration office</span><h1>Certificates &amp; leave</h1>
      <nav className="tabs" aria-label="Filter">{FILTERS.map(([v, l]) => <Link key={l} href={`?status=${v}`} aria-current={v === status ? 'page' : undefined}>{l}</Link>)}</nav>
      {!list.length ? <Empty>Nothing here.</Empty> : (
        <div className="request-grid">{list.map((r) => (
          <section className="card" key={r.id}>
            <div className="card-head"><h3>{REQUEST_KINDS[r.kind as keyof typeof REQUEST_KINDS]}</h3><Status s={r.status} /></div>
            <p><Link href={`/admin/students/${r.student_id}`}>{r.display_name}</Link> <span className="muted small">{r.roll_no} · {r.branch} sem {r.current_semester} {r.section}</span></p>
            {r.kind === 'leave' && <p><strong>{day(r.from_date)} to {day(r.to_date)}</strong></p>}
            <p className="muted">{r.reason}</p>
            {r.admin_note && <p className="small">Note: {r.admin_note}</p>}
            <p className="muted small">Sent {when(r.created_at)}{r.decided_at && ` · updated ${when(r.decided_at)}`}</p>
            <RequestDecision id={r.id} status={r.status} kind={r.kind} />
            {['approved', 'ready'].includes(r.status) && ['bonafide', 'study', 'conduct'].includes(r.kind) && <p><Link href={`/requests/${r.id}`}>Print certificate</Link></p>}
          </section>
        ))}</div>
      )}
    </>
  );
}
