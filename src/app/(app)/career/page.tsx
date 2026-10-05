import { pageActor, q } from '@/server/page';
import { resumeVersions } from '@/server/career';
import { JdAnalysis, ResumeEditor } from '../../client';
import { Empty, when } from '../../ui';

export default async function Career() {
  const a = await pageActor();
  if (!a.studentId) return <Empty>Career tools are for students.</Empty>;
  const sid = a.studentId;
  const versions = await q(a, (c) => resumeVersions(c, a, sid));
  const latest = versions.find((v) => v.confirmed_at);
  return (
    <>
      <h1>Career</h1>
      <ResumeEditor initial={(latest?.facts.items ?? []).map((f: any) => ({ section: f.section, text: f.text }))} />
      <section className="card">
        <h2>3. Compare with a job</h2>
        {latest ? <>
          <p className="muted">Uses confirmed resume version {latest.version} (confirmed {when(latest.confirmed_at)}). Suggestions never add facts you did not confirm.</p>
          <JdAnalysis key={latest.id} resumeVersionId={latest.id} />
        </> : <p className="muted">Confirm a resume version first.</p>}
      </section>
      <section className="card">
        <h2>Versions</h2>
        <ul>{versions.map((v) => <li key={v.id}>v{v.version} · {v.facts.items.length} facts · {v.confirmed_at ? `confirmed ${when(v.confirmed_at)}` : 'unconfirmed'}</li>)}</ul>
      </section>
    </>
  );
}
