import Link from 'next/link';
import { isUuid } from '@/server/http';
import { orNull, pageActor, q } from '@/server/page';
import { TRACKS, clientQuestion, fullQuestion, getAttempt, pct, quizHistory, quizReport } from '@/server/prep';
import { PracticeQuestion, QuizRunner, RunView, StartQuiz } from '../../../../client';
import { Empty, NotFound } from '../../../../ui';
import { PrepTabs, ScoreBar } from '../../parts';

export default async function QuizAttempt({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const a = await pageActor();
  if (!a.studentId) return <Empty>Placement preparation is for students.</Empty>;
  const sid = a.studentId;
  const data = isUuid(id) ? await orNull(q(a, async (c) => ({ at: await getAttempt(c, a, sid, id), hist: await quizHistory(c, a, sid) }))) : null;
  if (!data) return <NotFound what="This quiz" />;
  const { at, hist } = data;
  const head = <><span className="page-eyebrow">Skill prep · Quiz</span><h1>{TRACKS[at.track]} quiz</h1></>;
  if (!at.submitted_at) return (
    <>
      {head}
      <p className="page-lead">{at.total} questions picked for your learning path, new ones first. Answer what you can, then submit to see your report and coach feedback.</p>
      <PrepTabs current="quiz" />
      <QuizRunner id={at.id} questions={at.question_ids.map((qid) => clientQuestion(fullQuestion(qid)!))} />
    </>
  );
  const same = hist.filter((h) => h.track === at.track);
  const i = same.findIndex((h) => h.id === at.id);
  const rep = quizReport(at, i > 0 ? pct(same[i - 1].correct, same[i - 1].total) : null);
  const tone = rep.band === 'strong' ? 'teal' : rep.band === 'steady' ? 'sky' : 'rose';
  return (
    <>
      {head}
      <PrepTabs current="quiz" />
      <section className={`card tone-${tone} quiz-score`}>
        <div>
          <strong className="feature-value">{rep.score}%</strong>
          <p className="muted">{at.correct} of {at.total} correct</p>
          {rep.delta !== null && <span className={`badge ${rep.delta > 0 ? 'ok' : rep.delta < 0 ? 'bad' : 'neutral'}`}>{rep.delta > 0 ? `▲ ${rep.delta} points vs last quiz` : rep.delta < 0 ? `▼ ${-rep.delta} points vs last quiz` : 'same as last quiz'}</span>}
        </div>
        <div>
          <h2>{rep.headline}</h2>
          <p>{rep.encouragement}</p>
          <div className="row actions-row"><StartQuiz track={at.track} label="Take a new quiz" /><Link className="btn secondary" href="/prep/quiz">All quizzes &amp; tracker</Link></div>
        </div>
      </section>
      <div className="split">
        <section className="card">
          <h2>By module</h2>
          <ul className="att-list">{rep.modules.map((m) => <ScoreBar key={m.id} label={m.title} score={pct(m.correct, m.total)} basis={`${m.correct} of ${m.total} correct`} />)}</ul>
        </section>
        <section className="card tone-amber">
          <h2>What to learn next</h2>
          {rep.gaps.length ? <ol>{rep.gaps.map((m) => <li key={m.id}><Link href={m.href}>{m.title}</Link>: {m.correct} of {m.total} right. Re-read the key points, then practise.</li>)}</ol>
            : <p className="ok">No weak modules in this quiz.</p>}
          {rep.strengths.length > 0 && <><h3>Doing well</h3><ul>{rep.strengths.map((m) => <li key={m.id}>{m.title} ({m.correct} of {m.total})</li>)}</ul></>}
        </section>
      </div>
      <h2 className="section-title">AI coach feedback</h2>
      {at.coach_run_id ? <RunView runId={at.coach_run_id} render="coach" />
        : <p className="card muted">The AI coach is not available right now (AI is not configured, or today&apos;s limit is reached). The report above is calculated from your answers.</p>}
      <h2 className="section-title">Review your answers</h2>
      {at.results!.map((r, n) => {
        const fq = fullQuestion(r.question_id)!;
        return <PracticeQuestion key={r.question_id} n={n + 1} q={clientQuestion(fq, { question_id: fq.id, track: fq.track, choice: r.choice ?? -1, correct: r.correct })} />;
      })}
    </>
  );
}
