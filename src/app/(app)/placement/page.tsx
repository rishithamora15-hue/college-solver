import Link from 'next/link';
import { pageActor, q } from '@/server/page';
import { placementBoard } from '@/server/jobs';
import { branchCodes } from '@/server/admin';
import { JobPostForm } from '../../client';
import { day, Empty, Funnel, NotFound, Stat, Status } from '../../ui';

export default async function Placement() {
  const a = await pageActor();
  if (!a.roles.includes('placement')) return <NotFound what="The placement dashboard" />;
  const [{ total, jobs }, branches] = await q(a, async (c) => [await placementBoard(c, a), await branchCodes(c, a)] as const);
  const live = jobs.filter((j) => j.status === 'published' && !j.expired);
  const sum = (k: 'applied' | 'opened') => live.reduce((s, j) => s + j[k], 0);
  return (
    <>
      <section className="hero hero-placement entry-rise">
        <div>
          <span className="page-eyebrow">Placement cell · {a.collegeName}</span>
          <h1>Every drive, every student, at a glance.</h1>
          <p>See who applied, who opened a role but stopped, and who has not looked yet. Remind each group with one click.</p>
        </div>
      </section>
      <div className="stat-grid">
        <Stat tone="sky" label="Live drives" value={live.length} />
        <Stat tone="violet" label="Students" value={total} />
        <Stat tone="teal" label="Applications (live drives)" value={sum('applied')} />
        <Stat tone="amber" label="Opened but not applied" value={sum('opened')} />
        <Stat tone="rose" label="Selected (all drives)" value={jobs.reduce((t, j) => t + j.selected, 0)} href="/placement/stats" />
      </div>
      <JobPostForm branches={branches} />
      <h2 className="section-title">Drives</h2>
      {!jobs.length ? <Empty>No drives yet. Post the first one above.</Empty> : (
        <div className="job-grid">{jobs.map((j) => (
          <article className={`card job-card${j.status !== 'published' || j.expired ? ' dim' : ''}`} key={j.id}>
            <span className="feature-kicker">{j.campus_type === 'campus' ? 'On campus' : 'Off campus'} / {j.level}</span>
            <h3><Link href={`/placement/jobs/${j.id}`}>{j.role}</Link></h3>
            <p className="muted">{j.company}</p>
            <div className="job-meta">{j.status !== 'published' ? <Status s={j.status} /> : j.expired ? <Status s="expired" /> : <Status s="published" />}<span className="muted small">Apply by {day(j.deadline_at)}</span></div>
            {(j.min_cgpa != null || j.max_backlogs != null || j.branches) && <p className="muted small">{j.eligible} of {total} students eligible</p>}
            <Funnel applied={j.applied} opened={j.opened} declined={j.declined} total={j.eligible} />
            <footer><Link href={`/placement/jobs/${j.id}`}>Track students →</Link></footer>
          </article>
        ))}</div>
      )}
    </>
  );
}
