import Link from 'next/link';
import { pageActor, q } from '@/server/page';
import { TRACKS, courseById, courseModules, courseProgress, moduleHref, moduleProgress, prepState } from '@/server/prep';
import { StartQuiz } from '../../../../client';
import { Empty, NotFound } from '../../../../ui';
import { PrepTabs } from '../../parts';

/** A course: outcomes, then each unit's key points with links to its graded practice, then a quiz per track. */
export default async function CoursePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const a = await pageActor();
  if (!a.studentId) return <Empty>Placement preparation is for students.</Empty>;
  const c = courseById(id);
  if (!c) return <NotFound what="This course" />;
  const sid = a.studentId;
  const s = await q(a, (db) => prepState(db, a, sid));
  const units = courseModules(c);
  const p = courseProgress(c, s);
  const tracks = [...new Set(units.map((m) => m.track))];
  return (
    <>
      <span className="page-eyebrow">Skill prep · Course · {c.level}</span>
      <h1>{c.title}</h1>
      <p className="page-lead">{c.blurb}</p>
      <PrepTabs current="courses" />
      <div className="split">
        <section className="card tone-violet">
          <h2>What you will learn</h2>
          <ul>{c.outcomes.map((o) => <li key={o}>{o}</li>)}</ul>
          {c.skills.length > 0 && <p className="muted">Resume skills this course covers: {c.skills.join(', ')}. Add one to your resume only after you have practised it.</p>}
        </section>
        <section className="card tone-sky">
          <h2>Your progress</h2>
          <div className="meter" aria-hidden="true"><span style={{ width: `${(100 * p.answered) / p.total}%` }} /></div>
          <p>{p.done} of {p.modules} units complete · {p.answered} of {p.total} questions answered · {p.correct} correct</p>
          <p className="muted">Suggested time: about {c.hours} hours. A unit is complete when you have read its key points and answered all its questions.</p>
          <div className="row actions-row">{tracks.map((t) => <StartQuiz key={t} track={t} label={tracks.length > 1 ? `${TRACKS[t]} quiz` : 'Take a quiz'} secondary={p.answered === 0} />)}</div>
        </section>
      </div>
      {units.map((m, i) => {
        const x = moduleProgress(m, s);
        return (
          <section key={m.id} className="card">
            <div className="card-head">
              <h2>Unit {i + 1}: {m.title}</h2>
              <span className={`badge ${x.done ? 'ok' : x.answered || x.read ? 'info' : 'neutral'}`}>{x.done ? 'complete' : x.answered || x.read ? 'in progress' : 'not started'}</span>
            </div>
            <small className="muted">{m.round} · {x.answered} of {x.total} questions answered · {x.correct} correct</small>
            <h3>Key points</h3>
            <ul>{m.lesson.map((l) => <li key={l}>{l}</li>)}</ul>
            {m.note && <p className="banner info">{m.note}</p>}
            <p><Link className="btn" href={moduleHref(m)}>{x.answered === x.total ? 'Review the questions and solutions' : `Practise ${x.total - x.answered} question${x.total - x.answered === 1 ? '' : 's'}`} →</Link></p>
          </section>
        );
      })}
    </>
  );
}
