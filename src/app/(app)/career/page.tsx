import Link from 'next/link';
import { pageActor, q } from '@/server/page';
import { resumeVersions, skillMatch } from '@/server/career';
import { listJobs } from '@/server/jobs';
import { JdAnalysis, ResumeEditor } from '../../client';
import { Empty, when, SectionTabs } from '../../ui';

export default async function Career() {
  const a = await pageActor();
  if (!a.studentId) return <Empty>Career tools are for students.</Empty>;
  const sid = a.studentId;
  const [versions, jobs] = await q(a, async (c) => [await resumeVersions(c, a, sid), await listJobs(c, a, {})] as const);
  const latest = versions.find((v) => v.confirmed_at);
  // Open roles ranked by how many of their asked skills the confirmed resume shows.
  const fits = latest ? jobs.map((j) => ({ j, m: skillMatch(j.jd, latest.facts.items) })).filter((x) => x.m.want.length)
    .sort((x, y) => y.m.have.length / y.m.want.length - x.m.have.length / x.m.want.length).slice(0, 4) : [];
  return (
    <>
      <span className="page-eyebrow">Career &amp; jobs</span><h1>Make your experience count.</h1>
      <p className="page-lead">Confirm your real skills, see which open roles fit them, and compare your resume with any role before you apply.</p>
      <SectionTabs section="career" current="/career" />
      <ResumeEditor initial={(latest?.facts.items ?? []).map((f: any) => ({ section: f.section, text: f.text }))} />
      <div className="split">
        <section className="card">
          <h2>3. Compare with a job</h2>
          {latest ? <>
            <p className="muted">Uses confirmed resume version {latest.version} (confirmed {when(latest.confirmed_at)}). Suggestions never add facts you did not confirm.</p>
            <JdAnalysis key={latest.id} resumeVersionId={latest.id} jobs={jobs.map((j) => ({ id: j.id, label: `${j.role} · ${j.company}` }))} />
          </> : <p className="muted">Confirm a resume version first.</p>}
        </section>
        <section className="card tone-sky">
          <h2>Open roles that fit your resume</h2>
          {!latest ? <p className="muted">Confirm your resume to see matching roles.</p> : !fits.length ? <p className="muted">No open role lists skills we can match yet. <Link href="/jobs">Browse all opportunities →</Link></p> : <>
            <ul className="att-list">{fits.map(({ j, m }) => (
              <li key={j.id}>
                <div className="att-head"><Link href={`/jobs/${j.id}`}>{j.role} · {j.company}</Link><span className={`badge ${m.have.length === m.want.length ? 'ok' : 'neutral'}`}>{m.have.length} of {m.want.length} skills</span></div>
                <small className="muted">{m.want.filter((s) => !m.have.includes(s)).length ? `Missing: ${m.want.filter((s) => !m.have.includes(s)).join(', ')}` : 'You list every skill this role asks for.'}</small>
              </li>
            ))}</ul>
            <p><Link href="/jobs">See all opportunities →</Link></p>
          </>}
        </section>
      </div>
      <section className="card">
        <h2>Versions</h2>
        <ul>{versions.map((v) => <li key={v.id}>v{v.version} · {v.facts.items.length} facts · {v.confirmed_at ? `confirmed ${when(v.confirmed_at)}` : 'unconfirmed'}</li>)}</ul>
      </section>
    </>
  );
}
