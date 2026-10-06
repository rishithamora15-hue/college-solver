import Link from 'next/link';
import { isUuid } from '@/server/http';
import { orNull, pageActor, q } from '@/server/page';
import { attendanceSheet, classAssessments, classAttendance, classFor, classNotes, classStudents, istToday, MIN_ATTENDANCE } from '@/server/academics';
import { AttendanceSheet, MarksGrid, NewAssessment, NoteUpload } from '../../../../client';
import { NotFound } from '../../../../ui';

const TABS = [['attendance', 'Attendance'], ['marks', 'Marks'], ['notes', 'Notes & papers']] as const;

export default async function ClassPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ tab?: string; date?: string; period?: string }> }) {
  const { id } = await params;
  const sp = await searchParams;
  const a = await pageActor();
  const tab = TABS.some(([t]) => t === sp.tab) ? sp.tab! : 'attendance';
  const date = sp.date && /^\d{4}-\d{2}-\d{2}$/.test(sp.date) && sp.date <= istToday() ? sp.date : istToday();
  const period = Math.min(8, Math.max(1, Number(sp.period) || 1));
  const d = isUuid(id) && a.roles.includes('faculty') ? await orNull(q(a, async (c) => {
    const k = await classFor(c, a, id, true);
    const roster = await classStudents(c, a, k);
    return {
      k, roster,
      sheet: tab === 'attendance' ? await attendanceSheet(c, a, k, date, period) : null,
      summary: tab === 'attendance' ? await classAttendance(c, a, k) : [],
      assessments: tab === 'marks' ? await classAssessments(c, a, k) : [],
      notes: tab === 'notes' ? await classNotes(c, a, k) : [],
    };
  })) : null;
  if (!d) return <NotFound what="This class" />;
  const { k, roster } = d;
  return (
    <>
      <Link href="/faculty" className="back-link">← My classes</Link>
      <span className="page-eyebrow">{k.branch} · Semester {k.semester} · Section {k.section} · {roster.length} students</span>
      <h1>{k.code} {k.name}</h1>
      <nav className="tabs" aria-label="Class sections">{TABS.map(([t, l]) => <Link key={t} href={`?tab=${t}`} aria-current={t === tab ? 'page' : undefined}>{l}</Link>)}</nav>

      {tab === 'attendance' && <>
        <section className="card tone-teal">
          <form className="row" method="get">
            <input type="hidden" name="tab" value="attendance" />
            <div><label htmlFor="date">Date</label><input id="date" name="date" type="date" max={istToday()} min={istToday(-30)} defaultValue={date} /></div>
            <div><label htmlFor="period">Period</label><select id="period" name="period" defaultValue={period}>{[1, 2, 3, 4, 5, 6, 7, 8].map((n) => <option key={n}>{n}</option>)}</select></div>
            <button className="secondary" style={{ flex: '0 0 auto' }}>Open</button>
          </form>
          <h2>{d.sheet!.marked ? 'Attendance taken — edit if needed' : 'Take attendance'}</h2>
          <AttendanceSheet key={`${date}:${period}`} assignmentId={k.id} date={date} period={period} roster={roster} present={d.sheet!.present} marked={d.sheet!.marked} />
        </section>
        <section className="card">
          <h2>Attendance so far</h2>
          <div className="scroll"><table>
            <thead><tr><th>Roll</th><th>Student</th><th className="num">Attended</th><th className="num">%</th></tr></thead>
            <tbody>{d.summary.map((s) => { const pct = s.held ? Math.round((100 * s.attended) / s.held) : null; return (
              <tr key={s.id}><td>{s.roll_no}</td><td>{s.display_name}</td><td className="num">{s.attended} / {s.held}</td>
                <td className="num"><span className={pct !== null && pct < MIN_ATTENDANCE ? 'bad' : 'ok'}>{pct ?? '—'}</span></td></tr>
            ); })}</tbody>
          </table></div>
        </section>
      </>}

      {tab === 'marks' && <>
        <section className="card tone-violet"><NewAssessment assignmentId={k.id} /></section>
        {!d.assessments.length && <p className="muted">No assessments yet. Add one above, enter marks, then publish.</p>}
        {d.assessments.map((x) => <MarksGrid key={x.id} assessment={x} roster={roster} />)}
      </>}

      {tab === 'notes' && <>
        <section className="card tone-amber"><h2>Share with the class</h2><NoteUpload assignmentId={k.id} /></section>
        <section className="card">
          <h2>Published for {k.code}</h2>
          {!d.notes.length ? <p className="muted">Nothing published yet.</p> : (
            <ul className="inline-list">{d.notes.map((n) => <li key={n.id}><strong>{n.title}</strong> <span className="muted small">· {n.kind === 'paper' ? `question paper ${n.exam_year ?? ''}` : 'notes'} · {n.mime === 'application/pdf' ? 'PDF' : 'text'} · {n.source}</span></li>)}</ul>
          )}
        </section>
      </>}
    </>
  );
}
