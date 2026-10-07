import Link from 'next/link';
import { pageActor, q } from '@/server/page';
import { MIN_ANSWERS, PATHS, TRACKS, clientQuestion, courseOf, moduleProgress, moduleQuestions, pathModules, prepState, trackScore, type Track } from '@/server/prep';
import { Fold, MarkRead, PracticeQuestion } from '../../../client';
import { Empty, NotFound } from '../../../ui';
import { PrepTabs, ScoreBar } from '../parts';

const LEAD: Record<Track, string> = {
  aptitude: 'Quantitative, logical and data questions of the kind repeated in campus online tests.',
  communication: 'Verbal ability, professional writing and group-discussion situations.',
  coding: 'Problems, output prediction and fundamentals asked in online tests and technical interviews for your role.',
  interview: 'HR and behavioural questions, and interview etiquette.',
};

export default async function Practice({ params, searchParams }: { params: Promise<{ track: string }>; searchParams: Promise<{ m?: string }> }) {
  const [{ track }, { m: wanted }] = await Promise.all([params, searchParams]);
  const a = await pageActor();
  if (!a.studentId) return <Empty>Placement preparation is for students.</Empty>;
  if (!Object.hasOwn(TRACKS, track)) return <NotFound what="This practice area" />;
  const t = track as Track;
  const sid = a.studentId;
  const s = await q(a, (c) => prepState(c, a, sid));
  const head = <>
    <span className="page-eyebrow">{s.path ? `Learning path · ${PATHS[s.path].label}` : 'Placement preparation'}</span>
    <h1>{TRACKS[t]} practice</h1>
    <p className="page-lead">{LEAD[t]} Your first answer to each question is graded and counts toward your readiness score.</p>
    <PrepTabs current={t} />
  </>;
  if (!s.path) return <>{head}<div className="card" role="status">Choose your target role first, so the questions match it. <Link href="/prep">Choose my learning path →</Link></div></>;
  const mods = pathModules(s.path, t);
  const score = trackScore(s.answers, t);
  const mine = new Map(s.answers.map((x) => [x.question_id, x]));
  const open = mods.some((m) => m.id === wanted) ? wanted : mods.find((m) => !moduleProgress(m, s).done)?.id;
  return (
    <>
      {head}
      <section className="card tone-sky">
        <ul className="att-list"><ScoreBar label={`${TRACKS[t]} score`} score={score.score}
          basis={score.score === null ? `${score.n} of ${MIN_ANSWERS} answers needed for a score` : `${score.k} of ${score.n} recent answers correct`} /></ul>
      </section>
      {mods.map((m) => {
        const x = moduleProgress(m, s);
        return (
          // key + client-side open state: refreshing after an answer never collapses the module being worked on
          <Fold key={m.id} id={m.id} className="card module" open={m.id === open} summary={<>
            <span className="module-title"><strong>{m.title}</strong><small className="muted">{x.answered} of {x.total} answered · {x.correct} correct</small></span>
            <span className={`badge ${x.done ? 'ok' : x.answered || x.read ? 'info' : 'neutral'}`}>{x.done ? 'complete' : x.answered || x.read ? 'in progress' : 'not started'}</span>
          </>}>
            {courseOf(m.id) && <p className="muted small">Part of the course <Link href={`/prep/courses/${courseOf(m.id)!.id}`}>{courseOf(m.id)!.title}</Link>.{t === 'aptitude' || t === 'coding' ? ' Answer a question to see its step-by-step solution with code.' : ''}</p>}
            <h3>Key points</h3>
            <ul>{m.lesson.map((l) => <li key={l}>{l}</li>)}</ul>
            {m.note && <p className="banner info">{m.note}</p>}
            <MarkRead moduleId={m.id} read={x.read} />
            <h3 className="section-title">Practice questions</h3>
            {moduleQuestions(m).map((qq, i) => <PracticeQuestion key={qq.id} n={i + 1} q={clientQuestion(qq, mine.get(qq.id))} />)}
          </Fold>
        );
      })}
    </>
  );
}
