import { pageActor, q } from '@/server/page';
import { DAYS, MIN_ATTENDANCE, studentAttendance, studentResults, studentTimetable } from '@/server/academics';
import { Empty, SectionTabs } from '../../ui';

export default async function Academics() {
  const a = await pageActor();
  if (!a.studentId) return <Empty>Academics are for students.</Empty>;
  const sid = a.studentId;
  const [tt, att, res] = await q(a, async (c) => [await studentTimetable(c, a, sid), await studentAttendance(c, a, sid), await studentResults(c, a, sid)] as const);
  const today = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' })).getDay();
  const periods = [...new Set(tt.map((s) => s.period))].sort((x, y) => x - y);
  const held = att.reduce((t, s) => t + s.held, 0), went = att.reduce((t, s) => t + s.attended, 0);
  const overall = held ? Math.round((100 * went) / held) : null;
  return (
    <>
      <span className="page-eyebrow">Academics</span><h1>Your classes, attendance and results.</h1>
      <SectionTabs section="academics" current="/academics" />
      <div className="stat-grid">
        <div className={`stat tone-${overall === null || overall >= MIN_ATTENDANCE ? 'teal' : 'rose'}`}><span className="stat-label">Overall attendance</span><strong className="stat-value">{overall === null ? '—' : `${overall}%`}</strong></div>
        <div className="stat tone-violet"><span className="stat-label">SGPA (published marks)</span><strong className="stat-value">{res.sgpa ?? '—'}</strong></div>
        <div className="stat tone-sky"><span className="stat-label">Classes today</span><strong className="stat-value">{tt.filter((s) => s.day === today).length}</strong></div>
      </div>

      <section className="card tone-sky">
        <h2>Timetable</h2>
        {!tt.length ? <p className="muted">Your timetable has not been published yet.</p> : (
          <div className="scroll"><table className="timetable">
            <thead><tr><th>Day</th>{periods.map((p) => <th key={p}>Period {p}</th>)}</tr></thead>
            <tbody>{[1, 2, 3, 4, 5, 6].map((d) => (
              <tr key={d} className={d === today ? 'today' : ''}><th scope="row">{DAYS[d]}{d === today && <span className="badge info">today</span>}</th>
                {periods.map((p) => { const s = tt.find((x) => x.day === d && x.period === p); return (
                  <td key={p}>{s ? <div className="slot"><strong>{s.code}</strong><span>{s.starts}–{s.ends}</span><small>{s.room} · {s.faculty}</small></div> : <span className="muted">—</span>}</td>
                ); })}</tr>
            ))}</tbody>
          </table></div>
        )}
      </section>

      <section className="card tone-teal">
        <h2>Attendance</h2>
        {!att.length ? <p className="muted">No attendance recorded yet.</p> : (
          <ul className="att-list">{att.map((s) => {
            const pct = Math.round((100 * s.attended) / s.held);
            const need = pct < MIN_ATTENDANCE ? Math.ceil((MIN_ATTENDANCE * s.held - 100 * s.attended) / (100 - MIN_ATTENDANCE)) : 0;
            return (
              <li key={s.code}>
                <div className="att-head"><strong>{s.code} {s.name}</strong><span className={pct < MIN_ATTENDANCE ? 'bad' : 'ok'}>{pct}%</span></div>
                <div className="meter" aria-hidden="true"><span className={pct < MIN_ATTENDANCE ? 'low' : ''} style={{ width: `${pct}%` }} /><i style={{ left: `${MIN_ATTENDANCE}%` }} /></div>
                <small className="muted">{s.attended} of {s.held} classes{need > 0 && <> · <strong className="bad">attend the next {need} to reach {MIN_ATTENDANCE}%</strong></>}</small>
              </li>
            );
          })}</ul>
        )}
      </section>

      <section className="card tone-violet">
        <h2>Grade card</h2>
        {!res.subjects.length ? <p className="muted">No marks published yet.</p> : (
          <div className="scroll"><table>
            <thead><tr><th>Subject</th><th>Assessments</th><th className="num">Total</th><th className="num">%</th><th>Grade</th></tr></thead>
            <tbody>{res.subjects.map((s) => (
              <tr key={s.code}><td><strong>{s.code}</strong> {s.name}<div className="muted small">{s.faculty}</div></td>
                <td>{s.items.map((i) => <div key={i.assessment} className="small">{i.assessment}: {i.marks ?? 'absent'} / {i.max_marks}</div>)}</td>
                <td className="num">{s.got} / {s.max}</td><td className="num">{s.pct}</td>
                <td><span className={`grade g-${s.letter.replace('+', 'p')}`}>{s.letter}</span></td></tr>
            ))}</tbody>
          </table></div>
        )}
        <p className="muted small">Grades are from internal assessments published so far (O ≥ 90, A+ ≥ 80, A ≥ 70, B+ ≥ 60, B ≥ 50, C ≥ 40). University results may differ.</p>
      </section>
    </>
  );
}
