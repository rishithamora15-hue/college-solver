// Readiness display shared by the overview and the placement-prep pages. Numbers are always shown as text too.
import Link from 'next/link';
import { PATHS, type PathId, type readiness, type Step } from '@/server/prep';
import { SectionTabs } from '../../ui';

/** current = 'path' for the learning path page, otherwise the last path segment (aptitude, quiz, ...). */
export const PrepTabs = ({ current }: { current: string }) => <SectionTabs section="prep" current={current === 'path' ? '/prep' : `/prep/${current}`} />;

export function ScoreBar({ label, score, basis }: { label: string; score: number | null; basis: string }) {
  return (
    <li>
      <div className="att-head"><strong>{label}</strong>{score === null ? <span className="muted">Not assessed</span> : <strong>{score}%</strong>}</div>
      <div className="meter" aria-hidden="true">{score !== null && <span className={score < 60 ? 'low' : ''} style={{ width: `${score}%` }} />}</div>
      <small className="muted">{basis}</small>
    </li>
  );
}

export function ReadinessCard({ path, r }: { path: PathId; r: ReturnType<typeof readiness> }) {
  return (
    <section className="card tone-teal">
      <div className="card-head"><h2>Job readiness</h2><span className="badge info">{PATHS[path].label}</span></div>
      <strong className="feature-value">{r.overall === null ? 'Not assessed' : `${r.overall}%`}</strong>
      <p className="muted">{r.overall === null ? 'Answer 5 questions in any area, or confirm your resume, to get a first score.' : `Based on ${r.assessed} of ${r.dims.length} areas.`}</p>
      <ul className="att-list">{r.dims.map((d) => <ScoreBar key={d.dim} label={d.label} score={d.score} basis={d.basis} />)}</ul>
    </section>
  );
}

export function PlanSteps({ steps, limit }: { steps: Step[]; limit?: number }) {
  if (!steps.length) return <p className="ok">You have completed every module in this path. Keep your resume current and revisit any area below 60%.</p>;
  return (
    <ol className="timeline">
      {steps.slice(0, limit).map((s) => (
        <li key={s.dim}><Link href={s.href}><strong>{s.title}</strong></Link> <span className="badge neutral">{s.label}</span><br /><small className="muted">{s.reason}</small></li>
      ))}
    </ol>
  );
}
