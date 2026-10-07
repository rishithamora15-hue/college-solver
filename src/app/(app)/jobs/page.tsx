import Link from 'next/link';
import { pageActor, q } from '@/server/page';
import { ineligibility, listJobs, profiles, type JobFilter } from '@/server/jobs';
import { atsScore, latestConfirmedResume, priority } from '@/server/career';
import { day, Empty, SectionTabs } from '../../ui';

const opt = <T extends string>(v: string | undefined, ok: readonly T[]) => (ok.includes(v as T) ? (v as T) : undefined);

export default async function Jobs({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const f: JobFilter = {
    category: opt(sp.category, ['it', 'non_it'] as const), campus_type: opt(sp.campus_type, ['campus', 'off_campus'] as const),
    level: opt(sp.level, ['fresher', 'internship'] as const), include_expired: sp.expired === '1',
  };
  const a = await pageActor();
  const [jobs, me, rv] = await q(a, async (c) => [await listJobs(c, a, f), a.studentId ? (await profiles(c, a, a.studentId))[0] : null,
    a.studentId ? await latestConfirmedResume(c, a, a.studentId) : undefined] as const);
  const sel = (name: string, label: string, opts: [string, string][]) => (
    <div><label htmlFor={name}>{label}</label>
      <select id={name} name={name} defaultValue={sp[name] ?? ''}><option value="">Any</option>{opts.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></div>
  );
  return (
    <>
      <span className="page-eyebrow">Career &amp; jobs</span><h1>Find your next opportunity.</h1>
      <p className="page-lead">Filter the roles that fit, prepare your resume and follow the source to apply.</p>
      {a.studentId && <SectionTabs section="career" current="/jobs" />}
      <p className="muted">Always apply on the employer's official page.</p>
      <form className="card row" method="get">
        {sel('category', 'Category', [['it', 'IT'], ['non_it', 'Non-IT']])}
        {sel('campus_type', 'Campus', [['campus', 'On campus'], ['off_campus', 'Off campus']])}
        {sel('level', 'Level', [['fresher', 'Fresher'], ['internship', 'Internship']])}
        <div><label><input type="checkbox" name="expired" value="1" defaultChecked={f.include_expired} /> Show expired</label></div>
        <button style={{ flex: '0 0 auto' }}>Apply filters</button>
      </form>
      {!jobs.length ? <Empty>No listings match these filters.</Empty> : (
        <div className="job-grid">{jobs.map((j) => (
          <article className="card job-card" key={j.id}>
            <span className="feature-kicker">{j.campus_type === 'campus' ? 'On campus' : 'Off campus'} / {j.level}</span>
            <h2><Link href={`/jobs/${j.id}`}>{j.role}</Link></h2>
            <p className="muted">{j.company}{j.is_fictional && ' (fictional sample)'}</p>
            <div className="job-meta"><span className="badge info">{j.category === 'it' ? 'IT' : 'Non-IT'}</span>
              {j.expired ? <span className="badge bad">expired</span> : j.stale ? <span className="badge warn">not re-verified in 14 days</span> : <span className="badge ok">open</span>}
              {rv && (() => { const m = atsScore(`${j.role}
${j.jd}`, rv.facts.items); return m && <span className={`badge ${m.score >= 70 ? 'ok' : m.score >= 40 ? 'warn' : 'bad'}`} title={m.missing.length ? `Missing: ${m.missing.join(', ')}` : 'Your resume shows every skill it asks for'}>ATS {m.score}/100 · {priority(m.score)}</span>; })()}
              {me && (ineligibility(j, me).length ? <span className="badge neutral" title={ineligibility(j, me).join('; ')}>not eligible</span> : (j.min_cgpa != null || j.max_backlogs != null || j.branches) && <span className="badge info">you&apos;re eligible</span>)}</div>
            <footer><span className="muted">Deadline {day(j.deadline_at)}</span><Link href={`/jobs/${j.id}`}>View role →</Link></footer>
          </article>
        ))}</div>
      )}
    </>
  );
}
