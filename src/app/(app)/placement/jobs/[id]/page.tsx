import Link from 'next/link';
import { isUuid } from '@/server/http';
import { orNull, pageActor, q } from '@/server/page';
import { jobStudents, STAGES, type Stage } from '@/server/jobs';
import { JobStatusToggle, NudgeButton, StageSelect } from '../../../../client';
import { day, Funnel, initials, NotFound, Status, when } from '../../../../ui';

const GROUPS = [
  ['link_opened', 'Opened, not applied', 'tone-amber'],
  ['reported_not_applied', 'Not applying', 'tone-rose'],
  [null, 'Not seen yet', 'tone-violet'],
] as const;

export default async function JobTracking({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const a = await pageActor();
  if (!a.roles.includes('placement')) return <NotFound what="This drive" />;
  const d = isUuid(id) ? await orNull(q(a, (c) => jobStudents(c, a, id))) : null;
  if (!d) return <NotFound what="This drive" />;
  const { j } = d;
  const eligible = d.students.filter((s) => !s.why.length);
  const notEligible = d.students.filter((s) => s.why.length);
  const by = (state: string | null) => eligible.filter((s) => s.state === state);
  const applied = d.students.filter((s) => s.state === 'reported_applied');
  const open = j.status === 'published' && !j.expired;
  const rules = [j.min_cgpa != null && `CGPA ${j.min_cgpa}+`, j.max_backlogs != null && `max ${j.max_backlogs} backlogs`, j.branches?.length && j.branches.join('/')].filter(Boolean);
  return (
    <>
      <Link href="/placement" className="back-link">← All drives</Link>
      <span className="page-eyebrow">{j.company} · {j.campus_type === 'campus' ? 'On campus' : 'Off campus'} · {j.level}</span>
      <h1>{j.role}</h1>
      <p className="page-lead">
        {j.status !== 'published' ? <Status s={j.status} /> : j.expired ? <Status s="expired" /> : <Status s="published" />} Apply by {day(j.deadline_at)} · {j.location}
        {' '}· <a href={j.apply_url} target="_blank" rel="noopener noreferrer">official link</a>
        {rules.length > 0 && <> · rules: {rules.join(', ')}</>}
      </p>
      <section className="card">
        <Funnel applied={applied.length} opened={by('link_opened').length} declined={by('reported_not_applied').length} total={eligible.length} />
        <p className="muted small">{eligible.length} eligible of {d.students.length} students. &quot;Applied&quot; is what the student reported; it is not confirmation from the employer.</p>
        <div className="row actions-row">
          {open && <NudgeButton id={j.id} group="opened" count={by('link_opened').length} label="Remind who opened but did not apply" />}
          {open && <NudgeButton id={j.id} group="none" count={by(null).length} label="Remind who has not seen it" />}
          <JobStatusToggle id={j.id} status={j.status} />
          <a className="btn secondary" href={`/api/v1/placement/export?job=${j.id}`}>Download applicants (Excel)</a>
        </div>
      </section>
      <section className="card tone-teal">
        <h2>Applied <span className="count">{applied.length}</span></h2>
        {!applied.length ? <p className="muted">Nobody has applied yet.</p> : (
          <div className="scroll"><table>
            <thead><tr><th>Student</th><th>Branch</th><th className="num">CGPA</th><th>Round</th></tr></thead>
            <tbody>{applied.map((s) => (
              <tr key={s.id}><td><span className="person"><span className="avatar sm" aria-hidden="true">{initials(s.display_name)}</span>{s.display_name}</span><div className="muted small">{s.roll_no}</div></td>
                <td>{s.branch}</td><td className="num">{s.cgpa ?? '—'}</td>
                <td><StageSelect jobId={j.id} studentId={s.id} stage={s.stage} />{s.stage && <span className="sr-only">{STAGES[s.stage as Stage]}</span>}</td></tr>
            ))}</tbody>
          </table></div>
        )}
      </section>
      <div className="track-grid">
        {GROUPS.map(([state, label, tone]) => {
          const list = by(state);
          return (
            <section key={label} className={`card ${tone}`}>
              <h2>{label} <span className="count">{list.length}</span></h2>
              {!list.length ? <p className="muted">Nobody here.</p> : (
                <ul className="people compact">{list.map((s) => (
                  <li key={s.id}><span className="avatar" aria-hidden="true">{initials(s.display_name)}</span>
                    <span><strong>{s.display_name}</strong><small>{s.roll_no ?? '—'}{s.updated_at && ` · ${when(s.updated_at)}`}</small></span></li>
                ))}</ul>
              )}
            </section>
          );
        })}
        {notEligible.length > 0 && (
          <section className="card">
            <h2>Not eligible <span className="count">{notEligible.length}</span></h2>
            <ul className="people compact">{notEligible.map((s) => (
              <li key={s.id}><span className="avatar" aria-hidden="true">{initials(s.display_name)}</span>
                <span><strong>{s.display_name}</strong><small>{s.why.join('; ')}</small></span></li>
            ))}</ul>
          </section>
        )}
      </div>
    </>
  );
}
