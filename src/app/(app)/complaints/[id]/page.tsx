import { pageActor, q, orNull } from '@/server/page';
import { isUuid } from '@/server/http';
import { complaintView, STAFF_NEXT, STUDENT_NEXT } from '@/server/complaints';
import { EventForm } from '../../../client';
import { NotFound, Status, when } from '../../../ui';

export default async function Complaint({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ receipt?: string }> }) {
  const { id } = await params;
  const sp = await searchParams;
  const a = await pageActor();
  const cm = isUuid(id) ? await orNull(q(a, (c) => complaintView(c, a, id))) : null;
  if (!cm) return <NotFound what="This complaint" />;
  const staff = a.roles.includes('admin');
  return (
    <>
      <span className="page-eyebrow">Scholarship support / tracked case</span><h1>Complaint {cm.receipt_no}</h1>
      <p className="page-lead">A record of what was submitted, who is handling it and what has been verified.</p>
      {sp.receipt && <div className="banner info" role="status">Saved. Your receipt number is <strong>{cm.receipt_no}</strong>. It is recorded with {cm.department}; no external email was sent.</div>}
      <section className="card">
        <p>Status: <Status s={cm.status} /> · Department: {cm.department} · Submitted {when(cm.created_at)}</p>
        {cm.status === 'resolved' && <p className="banner warn">Staff report this as resolved. It is not verified until a ledger credit receipt exists or the student confirms.</p>}
        <h2>{cm.subject}</h2>
        <p style={{ whiteSpace: 'pre-wrap' }}>{cm.body}</p>
      </section>
      <section className="card">
        <h2>Timeline</h2>
        <ol className="timeline">{cm.events.map((e: any, i: number) => (
          <li key={i}><Status s={e.status} /> by {e.actor_role === 'admin' ? 'administration office' : e.actor_role.replace('_', ' ')} · {when(e.created_at)}{e.note && <> — {e.note}</>}
            {e.verification_basis && <div className="muted">Verification basis: {e.verification_basis.startsWith('source_credit_receipt') ? `ledger credit receipt ${e.verification_basis.split(':')[1]}` : 'confirmation by student (does not change the ledger)'}</div>}
          </li>
        ))}</ol>
      </section>
      <EventForm id={cm.id} version={cm.version} staff={staff} options={(staff ? STAFF_NEXT : STUDENT_NEXT)[cm.status] ?? []} />
    </>
  );
}
