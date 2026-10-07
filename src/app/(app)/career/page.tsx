import Link from 'next/link';
import { pageActor, q } from '@/server/page';
import { atsReport, priority, resumeVersions } from '@/server/career';
import { ineligibility, listJobs, profiles } from '@/server/jobs';
import { JdAnalysis, ResumeEditor } from '../../client';
import { Empty, when, SectionTabs } from '../../ui';

export default async function Career() {
  const a = await pageActor();
  if (!a.studentId) return <Empty>Career tools are for students.</Empty>;
  const sid = a.studentId;
  const [versions, jobs, [me]] = await q(a, async (c) => [await resumeVersions(c, a, sid), await listJobs(c, a, {}), await profiles(c, a, sid)] as const);
  const latest = versions.find((v) => v.confirmed_at);
  const report = latest ? atsReport(jobs.map((j) => ({ ...j, why: me ? ineligibility(j, me) : [] })), latest.facts.items) : null;
  const fixes = report?.roles.find((x) => x.ats)?.ats!.sections.filter((s) => !s.ok) ?? [];
  return (
    <>
      <span className="page-eyebrow">Career &amp; jobs</span><h1>Make your experience count.</h1>
      <p className="page-lead">Upload your resume, confirm your real skills, and see your ATS match with every open role, what to learn next, and which roles to go for first.</p>
      <SectionTabs section="career" current="/career" />
      <ResumeEditor initial={(latest?.facts.items ?? []).map((f: any) => ({ section: f.section, text: f.text }))} />
      <section className="card">
        <h2>ATS match with every open role</h2>
        {!report ? <p className="muted">Upload and confirm your resume to score it against the {jobs.length} open role{jobs.length === 1 ? '' : 's'}.</p>
          : !report.roles.length ? <p className="muted">The placement office has not posted any open roles yet. <Link href="/jobs">Browse opportunities →</Link></p> : <>
          <p className="muted">Score out of 100: up to 70 for the share of the role&apos;s skills your confirmed resume (v{latest!.version}) shows, plus 10 each for education, 3+ skills and a project or experience. It measures how well your resume matches the posting for screening, not your chance of being hired. Priority: High 70+, Medium 40–69, Low below 40.</p>
          <ul className="att-list">{report.roles.map(({ job: j, ats }) => (
            <li key={j.id}>
              <div className="att-head">
                <Link href={`/jobs/${j.id}`}>{j.role} · {j.company}</Link>
                <span className="row" style={{ gap: 6, flex: '0 0 auto' }}>
                  {j.why.length ? <span className="badge bad">Not eligible</span> : ats && <span className={`badge ${ats.score >= 70 ? 'ok' : ats.score >= 40 ? 'warn' : 'bad'}`}>{priority(ats.score)} priority</span>}
                  <span className="badge info">{ats ? `ATS ${ats.score}/100` : 'Not scored'}</span>
                </span>
              </div>
              <small className="muted">
                {j.why.length ? `${j.why.join('; ')}. ` : ''}
                {!ats ? 'This posting names no skills we recognise; read it yourself.'
                  : `Matched ${ats.have.length} of ${ats.want.length} skills${ats.have.length ? `: ${ats.have.join(', ')}` : ''}. ${ats.missing.length ? `Missing: ${ats.missing.join(', ')}.` : 'You list every skill it asks for.'}`}
              </small>
            </li>
          ))}</ul>
        </>}
      </section>
      <div className="split">
        <section className="card">
          <h2>3. Compare with a job</h2>
          {latest ? <>
            <p className="muted">Uses confirmed resume version {latest.version} (confirmed {when(latest.confirmed_at)}). Suggestions never add facts you did not confirm.</p>
            <JdAnalysis key={latest.id} resumeVersionId={latest.id} jobs={jobs.map((j) => ({ id: j.id, label: `${j.role} · ${j.company}` }))} />
          </> : <p className="muted">Confirm a resume version first.</p>}
        </section>
        <section className="card tone-sky">
          <h2>What to learn next</h2>
          {!report ? <p className="muted">Upload and confirm your resume to see which skills open roles want from you.</p>
            : !report.learn.length ? <p className="muted">{report.roles.some((x) => x.ats && !x.job.why.length) ? 'Your resume already shows every skill the open roles you can apply for ask for.' : 'No open role you are eligible for lists skills we can compare yet.'}</p> : <>
            <p className="muted">Ordered by how many ATS points each skill would add across the roles you are eligible for. Add a skill to your resume only after you have actually used it.</p>
            <ol className="att-list">{report.learn.slice(0, 8).map((l) => (
              <li key={l.skill}>
                <div className="att-head"><strong>{l.skill}</strong><span className={`badge ${l.points >= 30 ? 'bad' : l.points >= 15 ? 'warn' : 'neutral'}`}>+{l.points} ATS points</span></div>
                <small className="muted">Asked by {l.roles.length} role{l.roles.length > 1 ? 's' : ''}: {l.roles.join('; ')}</small>
              </li>
            ))}</ol>
          </>}
          {fixes.length > 0 && <p className="muted">Also missing from your resume: {fixes.map((f) => `${f.label.toLowerCase()} (+${f.points})`).join(', ')}.</p>}
        </section>
      </div>
      <section className="card">
        <h2>Versions</h2>
        <ul>{versions.map((v) => <li key={v.id}>v{v.version} · {v.facts.items.length} facts · {v.confirmed_at ? `confirmed ${when(v.confirmed_at)}` : 'unconfirmed'}</li>)}</ul>
      </section>
    </>
  );
}
