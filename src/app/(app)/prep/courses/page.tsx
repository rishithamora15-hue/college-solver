import Link from 'next/link';
import { pageActor, q } from '@/server/page';
import { COURSES, PATHS, courseProgress, pathCourses, prepState, type Course, type PrepState } from '@/server/prep';
import { Empty } from '../../../ui';
import { PrepTabs } from '../parts';

export default async function Courses() {
  const a = await pageActor();
  if (!a.studentId) return <Empty>Placement preparation is for students.</Empty>;
  const sid = a.studentId;
  const s = await q(a, (c) => prepState(c, a, sid));
  const mine = s.path ? pathCourses(s.path) : [];
  const others = COURSES.filter((c) => !mine.includes(c));
  return (
    <>
      <span className="page-eyebrow">Skill prep</span>
      <h1>Courses for placement.</h1>
      <p className="page-lead">What to learn, in order. Every course has key points, graded practice questions with step-by-step solutions and code, and a quiz to check yourself.</p>
      <PrepTabs current="courses" />
      {!s.path && <div className="card" role="status">Choose your target role to see which courses to take first and in what order. <Link href="/prep">Choose my learning path →</Link></div>}
      {mine.length > 0 && <>
        <div className="section-head"><h2>Recommended for {PATHS[s.path!].label}</h2><span className="muted">Take them in this order</span></div>
        <div className="course-grid">{mine.map((c, i) => <CourseCard key={c.id} c={c} s={s} n={i + 1} />)}</div>
      </>}
      {others.length > 0 && <>
        <div className="section-head"><h2>{mine.length ? 'More courses' : 'All courses'}</h2></div>
        <div className="course-grid">{others.map((c) => <CourseCard key={c.id} c={c} s={s} />)}</div>
      </>}
    </>
  );
}

function CourseCard({ c, s, n }: { c: Course; s: PrepState; n?: number }) {
  const p = courseProgress(c, s);
  return (
    <section className="card">
      <div className="card-head"><h3>{n ? `${n}. ` : ''}<Link href={`/prep/courses/${c.id}`}>{c.title}</Link></h3><span className="badge neutral">{c.level}</span></div>
      <p className="muted">{c.blurb}</p>
      <div className="meter" aria-hidden="true"><span style={{ width: `${(100 * p.answered) / p.total}%` }} /></div>
      <small className="muted">{p.done} of {p.modules} units complete · {p.answered} of {p.total} questions answered · about {c.hours} hours</small>
      <p><Link href={`/prep/courses/${c.id}`}>{p.answered ? 'Continue course →' : 'Start course →'}</Link></p>
    </section>
  );
}
