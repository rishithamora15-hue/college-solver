import Link from 'next/link';
import { pageActor, q } from '@/server/page';
import { DIM_LABEL, MIN_ANSWERS, PATHS, TRACKS, WINDOW, moduleHref, moduleProgress, pathModules, prepState, readiness, trainingPlan, type Dim, type Track } from '@/server/prep';
import { PathPicker } from '../../client';
import { Empty } from '../../ui';
import { PlanSteps, PrepTabs, ReadinessCard } from './parts';

export default async function Prep() {
  const a = await pageActor();
  if (!a.studentId) return <Empty>Placement preparation is for students.</Empty>;
  const sid = a.studentId;
  const s = await q(a, (c) => prepState(c, a, sid));
  const path = s.path;
  const r = path ? readiness(path, s) : null;
  const all = path ? pathModules(path).map((m) => moduleProgress(m, s)) : [];
  return (
    <>
      <span className="page-eyebrow">Placement preparation</span>
      <h1>Your learning path to placement.</h1>
      <p className="page-lead">Pick a target role, work through its course, and practise the questions most often repeated in selection rounds. Your readiness is calculated only from your own answers and your confirmed resume.</p>
      <PrepTabs current="path" />
      <section className="card tone-violet">
        <h2>{path ? 'Target role' : 'Choose your target role'}</h2>
        {!path && <p className="muted">Your course, practice questions and score weights follow this choice. You can change it any time; past answers still count.</p>}
        <PathPicker current={path} paths={Object.entries(PATHS).map(([id, p]) => ({ id, label: p.label, blurb: p.blurb }))} />
      </section>
      {path && r && <>
        <div className="split">
          <div>
            <ReadinessCard path={path} r={r} />
            <details className="card rubric">
              <summary>How these scores are calculated</summary>
              <ul>
                <li>Each practice area = correct ÷ answered, over your latest {WINDOW} graded answers in that area. Only your first answer to a question is graded. Fewer than {MIN_ANSWERS} answers = not assessed.</li>
                <li>Job readiness = weighted average of the assessed areas. Weights for {PATHS[path].label}: {(Object.entries(PATHS[path].weights) as [Dim, number][]).map(([d, w]) => `${DIM_LABEL[d]} ${w}%`).join(', ')}.</li>
                <li>Interview questions check what you know about interviews and etiquette. Nothing here measures your real body language or behaviour.</li>
                <li>These are practice indicators, not a prediction of any hiring decision.</li>
              </ul>
              <h3>Resume checklist</h3>
              {r.checks.length ? <ul className="checklist">{r.checks.map((c) => <li key={c.label} className={c.ok ? 'ok' : 'bad'}>{c.ok ? '✓' : '✗'} {c.label} <span className="muted">({c.points} points)</span></li>)}</ul>
                : <p className="muted">No confirmed resume yet. <Link href="/career">Add your resume facts</Link>.</p>}
            </details>
          </div>
          <section className="card tone-amber">
            <h2>Recommended next steps</h2>
            <p className="muted">Personalised from your results: areas with no baseline first, then your weakest areas, weighted for your target role.</p>
            <PlanSteps steps={trainingPlan(path, s, r)} />
          </section>
        </div>
        <div className="section-head"><h2>Course</h2><span className="muted">{all.filter((x) => x.done).length} of {all.length} modules complete</span></div>
        <div className="course-grid">
          {(Object.keys(TRACKS) as Track[]).map((t) => (
            <section key={t} className="card">
              <div className="card-head"><h3>{TRACKS[t]}</h3><Link href={`/prep/${t}`}>Practise →</Link></div>
              <ul className="att-list">
                {pathModules(path, t).map((m) => {
                  const x = moduleProgress(m, s);
                  return (
                    <li key={m.id}>
                      <div className="att-head"><Link href={moduleHref(m)}>{m.title}</Link><span className={`badge ${x.done ? 'ok' : x.answered || x.read ? 'info' : 'neutral'}`}>{x.done ? 'complete' : x.answered || x.read ? 'in progress' : 'not started'}</span></div>
                      <div className="meter" aria-hidden="true"><span style={{ width: `${(100 * x.answered) / x.total}%` }} /></div>
                      <small className="muted">{x.answered} of {x.total} answered · {x.correct} correct{x.read ? ' · notes read' : ''}</small>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      </>}
    </>
  );
}
