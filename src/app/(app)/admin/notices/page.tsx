import { pageActor, q } from '@/server/page';
import { broadcastHistory, classOptions } from '@/server/admin';
import { BroadcastForm } from '../../../client';
import { NotFound, targetOptions, when } from '../../../ui';

export default async function Notices() {
  const a = await pageActor();
  if (!a.roles.includes('admin')) return <NotFound what="Notices" />;
  const [classes, history] = await q(a, async (c) => [await classOptions(c, a), await broadcastHistory(c, a)] as const);
  return (
    <>
      <span className="page-eyebrow">Administration office</span><h1>Notice board</h1>
      <p className="page-lead">Send a notice to the whole college or one class. It pops up on every student&apos;s screen within seconds. For one student, open their page under Students.</p>
      <div className="split">
        <section className="card tone-violet"><h2>New notice</h2><BroadcastForm targets={targetOptions(classes)} /></section>
        <section className="card">
          <h2>Sent</h2>
          {!history.length ? <p className="muted">Nothing sent yet.</p> : (
            <ul className="inline-list">{history.map((h) => (
              <li key={h.event_key}><strong>{h.title}</strong><div className="muted small">{when(h.created_at)} · sent to {h.sent} · seen by {h.seen}</div>
                <div className="meter" aria-hidden="true"><span style={{ width: `${Math.round((100 * h.seen) / h.sent)}%` }} /></div></li>
            ))}</ul>
          )}
        </section>
      </div>
    </>
  );
}
