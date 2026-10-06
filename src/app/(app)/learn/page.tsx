import Link from 'next/link';
import { isUuid } from '@/server/http';
import { pageActor, q, orNull } from '@/server/page';
import { documentsFor, studentSubjects, subjectAccess, topics } from '@/server/learn';
import { TutorClient } from './tutor';
import { Empty, NotFound } from '../../ui';

export default async function Learn({ searchParams }: { searchParams: Promise<{ s?: string; t?: string; year?: string }> }) {
  const sp = await searchParams;
  const a = await pageActor();
  if (!a.studentId) return <Empty>Learning content is for students.</Empty>;
  const sid = a.studentId;
  const subs = await q(a, (c) => studentSubjects(c, a, sid));
  const selected = sp.s && isUuid(sp.s) ? await orNull(q(a, (c) => subjectAccess(c, a, sid, sp.s!))) : null;
  if (sp.s && !selected) return <NotFound what="This subject" />;
  const year = sp.year && /^\d{4}$/.test(sp.year) ? Number(sp.year) : undefined;
  const [tops, materials, papers] = selected
    ? await q(a, async (c) => [await topics(c, a, selected.id), await documentsFor(c, a, sid, 'material', { csId: selected.id }), await documentsFor(c, a, sid, 'paper', { csId: selected.id, year })] as const)
    : [[], [], []];
  const topic = tops.find((t) => t.id === sp.t);
  const meta = subs[0];
  return (
    <>
      <span className="page-eyebrow">Academic workspace</span><h1>Learn with your syllabus.</h1>
      <p className="page-lead">Choose your subject, including a backlog, and explore answers grounded in approved material.</p>
      <nav aria-label="Scope" className="muted">{meta ? `${meta.branch} / ${meta.regulation}` : ''}{selected && ` / Semester ${selected.semester} / ${selected.code} ${selected.name}`}{topic && ` / ${topic.name}`}</nav>
      <section className="card">
        <h2>Subjects</h2>
        <ul className="subject-list">{subs.map((s) => (
          <li key={s.id}><Link href={`/learn?s=${s.id}`} aria-current={s.id === selected?.id ? 'page' : undefined}>Sem {s.semester} · {s.code} {s.name}</Link>
            {s.backlog && <> <span className="badge warn">backlog</span></>}{s.is_current && <> <span className="badge info">current</span></>}</li>
        ))}</ul>
      </section>
      {selected && (
        <>
          <section className="card">
            <h2>Topics</h2>
            <p>{tops.map((t) => <Link key={t.id} href={`/learn?s=${selected.id}&t=${t.id}`} style={{ marginRight: 12 }} aria-current={t.id === topic?.id ? 'page' : undefined}>{t.name}</Link>)}</p>
          </section>
          <section className="card">
            <h2>Ask the tutor</h2>
            <p className="muted">Answers use only approved materials for {selected.name}. Switching subject starts a fresh context.</p>
            {/* key resets the panel when scope changes so stale context is not carried over */}
            <TutorClient key={`${selected.id}:${topic?.id ?? ''}`} csId={selected.id} topic={topic?.name} />
          </section>
          <section className="card">
            <h2>Materials</h2>
            {!materials.length ? <p className="muted">No approved materials yet.</p> : <ul>{materials.map((m) => <li key={m.id}>{m.title} · {m.revision} · {m.license} · <a href={`/api/v1/documents/${m.id}/download`}>download</a></li>)}</ul>}
          </section>
          <section className="card">
            <h2>Previous papers</h2>
            <form className="row" method="get">
              <input type="hidden" name="s" value={selected.id} />
              <div><label htmlFor="year">Exam year</label><input id="year" name="year" inputMode="numeric" pattern="\d{4}" defaultValue={year ?? ''} /></div>
              <button style={{ flex: '0 0 auto' }}>Filter</button>
            </form>
            {!papers.length ? <p className="muted">No papers for this filter.</p> : <ul>{papers.map((p) => <li key={p.id}>{p.exam_year} · {p.title} · source: {p.source} · {p.license} · <a href={`/api/v1/documents/${p.id}/download`}>download</a></li>)}</ul>}
          </section>
        </>
      )}
    </>
  );
}
