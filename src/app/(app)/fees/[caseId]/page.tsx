import { pageActor, q, orNull } from '@/server/page';
import { isUuid } from '@/server/http';
import { scholarshipDetail } from '@/server/finance';
import { DocUpload, Investigate } from '../../../client';
import { latestUploads } from '@/server/requests';
import { day, inr, NotFound, Source, Status } from '../../../ui';

const STEPS = ['applied', 'under_verification', 'approved', 'released', 'credited'];

export default async function CaseDetail({ params }: { params: Promise<{ caseId: string }> }) {
  const { caseId } = await params;
  const a = await pageActor();
  const d = a.studentId && isUuid(caseId) ? await orNull(q(a, async (c) => ({ ...(await scholarshipDetail(c, a, a.studentId!, caseId)), uploads: await latestUploads(c, a, a.studentId!) }))) : null;
  if (!d) return <NotFound what="This scholarship record" />;
  const k = d.kase;
  return (
    <>
      <span className="page-eyebrow">Scholarship / {k.academic_year}</span><h1>{k.scheme_name}</h1>
      <p className="page-lead">Follow each decision, check required documents and get help when the record does not match what you expected.</p>
      {d.stale && <div className="banner warn">Status data is older than 7 days.</div>}
      <section className="card">
        <h2>Funding timeline</h2><p>Current status: <Status s={k.status} /></p>
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
        <p className="muted small">Upload a clear scan or photo (PDF, JPG or PNG, up to 2 MB). The office verifies it and you get a notification.</p>
        <ul className="doc-list">{d.documents.map((x) => (
          <li key={x.id}>
            <div><strong>{x.name}</strong> <Status s={x.expired ? 'expired' : x.state} />
              <small className="muted">{x.description}{x.expires_at && ` · valid until ${day(x.expires_at)}`}
                {d.uploads[x.id] && <> · uploaded <a href={`/api/v1/uploads/${d.uploads[x.id].id}`}>{d.uploads[x.id].filename}</a></>}</small></div>
            {x.state !== 'accepted' && <DocUpload reqId={x.id} label={x.name} />}
          </li>
        ))}</ul>
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
