import { pageActor, q, orNull } from '@/server/page';
import { isUuid } from '@/server/http';
import { scholarshipDetail } from '@/server/finance';
import { Investigate } from '../../../client';
import { day, inr, NotFound, Source, Status } from '../../../ui';

const STEPS = ['applied', 'under_verification', 'approved', 'released', 'credited'];

export default async function CaseDetail({ params }: { params: Promise<{ caseId: string }> }) {
  const { caseId } = await params;
  const a = await pageActor();
  const d = a.studentId && isUuid(caseId) ? await orNull(q(a, (c) => scholarshipDetail(c, a, a.studentId!, caseId))) : null;
  if (!d) return <NotFound what="This scholarship record" />;
  const k = d.kase;
  return (
    <>
      <h1>{k.scheme_name} · {k.academic_year}</h1>
      {d.stale && <div className="banner warn">Status data is older than 7 days.</div>}
      <section className="card">
        <p>Current status: <Status s={k.status} /></p>
        <p>Expected {inr(k.expected_paise)} · Released by authority {inr(k.released_paise)} · <strong>Credited to your fee account {inr(k.credited_paise)}</strong></p>
        {k.credited_paise === 0 && <p className="banner info">Approved or released funding is not money received. Nothing has been credited to your ledger yet.</p>}
        <ol className="timeline" aria-label="Status timeline">
          {STEPS.map((s) => {
            const e = d.events.find((x) => x.status === s);
            return <li key={s}>{e ? <Status s="completed" /> : <Status s="pending" />} {s.replaceAll('_', ' ')} {e && <span className="muted">· {day(e.occurred_at)} · {e.source_ref}</span>}</li>;
          })}
        </ol>
        <Source ref_={k.source_ref} at={k.observed_at} stale={d.stale} />
      </section>
      <section className="card">
        <h2>Required documents</h2>
        <ul>{d.documents.map((x) => <li key={x.id}>{x.name}: <Status s={x.expired ? 'expired' : x.state} />{x.expires_at && <span className="muted"> · valid until {day(x.expires_at)}</span>}</li>)}</ul>
      </section>
      <section className="card">
        <h2>Policy ({d.policy.policy_version})</h2>
        <p style={{ whiteSpace: 'pre-wrap' }}>{d.policy.policy_text}</p>
      </section>
      <section className="card">
        <h2>Get help</h2>
        <Investigate caseId={k.id} />
      </section>
    </>
  );
}
