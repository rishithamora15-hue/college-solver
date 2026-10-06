import { pageActor, q, orNull } from '@/server/page';
import { jobDetail, STAGES, type Stage } from '@/server/jobs';
import { one } from '@/server/db';
import { isUuid } from '@/server/http';
import { ApplyButtons, StartRun } from '../../../client';
import { day, NotFound, when } from '../../../ui';

export default async function Job({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const a = await pageActor();
  const sid = a.studentId;
  const data = isUuid(id) ? await orNull(q(a, async (c) => ({
    j: await jobDetail(c, a, id, sid),
    rv: sid ? await one(c, 'select id, version from resume_versions where college_id = $1 and student_id = $2 and confirmed_at is not null order by version desc limit 1', [a.collegeId, sid]) : null,
  }))) : null;
  if (!data) return <NotFound what="This job" />;
  const { j, rv } = data;
  return (
    <>
      <span className="page-eyebrow">{j.campus_type === 'campus' ? 'On-campus opportunity' : 'Off-campus opportunity'} / {j.level}</span>
      <h1>{j.role}</h1><p className="page-lead">{j.company} · {j.location}. Review the requirements, prepare your resume and continue at the official source.</p>
      {j.is_fictional && <div className="banner info" role="note">Fictional sample listing for evaluation.</div>}
      {j.expired && <div className="banner bad" role="alert">The deadline has passed ({day(j.deadline_at)}).</div>}
      {j.stale && <div className="banner warn" role="note">Not re-verified in the last 14 days. Check the official source.</div>}
      <section className="card">
        <p>{j.location} · {j.category === 'it' ? 'IT' : 'Non-IT'} · {j.campus_type.replace('_', ' ')} · {j.level}</p>
        <p>Deadline: <strong>{day(j.deadline_at)}</strong> · Last verified {when(j.verified_at)}</p>
        <p>Eligibility: {j.eligibility}</p>
        <p>Salary: {j.salary_text ?? 'Not stated'}</p>
        <h2>Description</h2>
        <p style={{ whiteSpace: 'pre-wrap' }}>{j.jd}</p>
        <p className="muted">Source: <a href={j.source_url} rel="noopener noreferrer" target="_blank">{new URL(j.source_url).hostname}</a></p>
      </section>
      {sid && j.why.length > 0 && <div className="banner warn" role="note"><strong>You are not eligible for this drive:</strong> {j.why.join('; ')}.</div>}
      {sid && j.tracking?.stage && <div className={`banner ${j.tracking.stage === 'rejected' ? 'bad' : 'info'}`} role="status">Placement round: <strong>{STAGES[j.tracking.stage as Stage]}</strong> (updated by the placement cell).</div>}
      {sid && !j.expired && !j.why.length && <section className="card tone-sky"><h2>Apply</h2><ApplyButtons id={j.id} url={j.apply_url} state={j.tracking?.state ?? null} /></section>}
      {sid && (
        <section className="card">
          <h2>Compare with my resume</h2>
          {rv ? <StartRun screen="jobs" input={{ resume_version_id: rv.id, job_id: j.id }} label={`Analyse with resume v${rv.version}`} render="career" />
            : <p className="muted">Confirm a resume version on the Career page first.</p>}
        </section>
      )}
    </>
  );
}
