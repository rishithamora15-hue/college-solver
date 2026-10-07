import Link from 'next/link';
import { pageActor, q } from '@/server/page';
import { PATHS, QUIZ_SIZE, TRACKS, pct, prepState, quizHistory, trend, type Track } from '@/server/prep';
import { StartQuiz } from '../../../client';
import { Empty, when } from '../../../ui';
import { PrepTabs } from '../parts';

export default async function QuizHub() {
  const a = await pageActor();
  if (!a.studentId) return <Empty>Placement preparation is for students.</Empty>;
  const sid = a.studentId;
  const [s, hist] = await q(a, async (c) => [await prepState(c, a, sid), await quizHistory(c, a, sid)] as const);
  const trends = (Object.keys(TRACKS) as Track[]).map((t) => ({ t, ...trend(hist, t) }));
  const gaining = trends.filter((x) => (x.delta ?? 0) > 0);
  const lacking = trends.filter((x) => (x.delta ?? 0) < 0 || (x.latest !== null && x.latest < 60));
  return (
    <>
      <span className="page-eyebrow">{s.path ? `Skill prep · ${PATHS[s.path].label}` : 'Skill prep'}</span>
      <h1>Quiz &amp; progress tracker</h1>
      <p className="page-lead">Take a {QUIZ_SIZE}-question quiz in any area to check yourself. Every result is saved here, so you can see where you are gaining and where you are lacking.</p>
      <PrepTabs current="quiz" />
      {!s.path ? <div className="card" role="status">Choose your target role first, so quizzes match it. <Link href="/prep">Choose my learning path →</Link></div> : <>
        <div className="quiz-grid">
          {trends.map(({ t, latest, delta, best, count, scores }) => (
            <section key={t} className="card quiz-card">
              <h2>{TRACKS[t]}</h2>
              <strong className="feature-value">{latest === null ? '—' : `${latest}%`}</strong>
              <p className="muted">{latest === null ? 'No quiz yet' : `Latest quiz · best ${best}% · ${count} taken`}</p>
              {delta !== null && <p><span className={`badge ${delta > 0 ? 'ok' : delta < 0 ? 'bad' : 'neutral'}`}>{delta > 0 ? `▲ gaining ${delta} points` : delta < 0 ? `▼ down ${-delta} points` : 'no change'}</span></p>}
              {scores.length > 1 && <>
                <div className="spark" aria-hidden="true">{scores.map((v, i) => <span key={i} className={v < 60 ? 'low' : ''} style={{ height: `${Math.max(v, 6)}%` }} />)}</div>
                <p className="small muted">Last scores: {scores.map((v) => `${v}%`).join(', ')}</p>
              </>}
              <div className="quiz-card-action"><StartQuiz track={t} label={count ? 'Retake quiz' : 'Start quiz'} secondary={count > 0} /></div>
            </section>
          ))}
        </div>
        {hist.length > 0 && <div className="split">
          <section className="card tone-teal">
            <h2>Gaining</h2>
            {gaining.length ? <ul>{gaining.map((x) => <li key={x.t}><strong>{TRACKS[x.t]}</strong>: up {x.delta} points to {x.latest}%. Well done, keep the streak going.</li>)}</ul>
              : <p className="muted">Retake a quiz after revising to see your gains here.</p>}
          </section>
          <section className="card tone-rose">
            <h2>Needs attention</h2>
            {lacking.length ? <ul>{lacking.map((x) => <li key={x.t}><strong>{TRACKS[x.t]}</strong>: {x.latest}%{(x.delta ?? 0) < 0 ? `, down ${-x.delta!} points` : ''}. <Link href={`/prep/${x.t}`}>Revise the modules</Link></li>)}</ul>
              : <p className="ok">Nothing is slipping. Good work.</p>}
          </section>
        </div>}
        <section className="card">
          <h2>Recent quizzes</h2>
          {!hist.length ? <p className="muted">Your quiz history will appear here.</p> : (
            <div className="scroll"><table>
              <thead><tr><th>Taken</th><th>Area</th><th className="num">Score</th><th>Report</th></tr></thead>
              <tbody>{[...hist].reverse().slice(0, 12).map((h) => (
                <tr key={h.id}><td>{when(h.submitted_at)}</td><td>{TRACKS[h.track]}</td><td className="num">{h.correct} / {h.total} ({pct(h.correct, h.total)}%)</td><td><Link href={`/prep/quiz/${h.id}`}>Open report</Link></td></tr>
              ))}</tbody>
            </table></div>
          )}
        </section>
      </>}
    </>
  );
}
