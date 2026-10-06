import { pageActor, q } from '@/server/page';
import { allClasses, DAYS, facultyList, slots, subjectOptions } from '@/server/academics';
import { AssignForm, RemoveSlot, SlotForm } from '../../../client';
import { Empty, NotFound } from '../../../ui';

export default async function AdminAcademics() {
  const a = await pageActor();
  if (!a.roles.includes('admin')) return <NotFound what="Academics" />;
  const [classes, faculty, subjects, all] = await q(a, async (c) => [await allClasses(c, a), await facultyList(c, a), await subjectOptions(c, a), await slots(c, a, false)] as const);
  const groups = [...new Set(all.map((s) => `${s.branch} semester ${s.semester} section ${s.section}`))];
  return (
    <>
      <span className="page-eyebrow">Administration office</span><h1>Teachers &amp; timetable</h1>
      <p className="page-lead">Assign a teacher to each subject and section, then build the weekly timetable. Clashes for a class or a teacher are refused.</p>
      <div className="split">
        <section className="card tone-violet">
          <h2>Assign a teacher</h2>
          {!faculty.length ? <p className="muted">No faculty accounts yet. Create one with <code>npm run user:add -- faculty &lt;email&gt; &lt;password&gt; &quot;Name&quot;</code>.</p> : <AssignForm faculty={faculty} subjects={subjects} />}
          <h4>Current assignments</h4>
          {!classes.length ? <p className="muted">None yet.</p> : <ul className="inline-list">{classes.map((k) => <li key={k.id}><strong>{k.code}</strong> {k.name} · {k.branch} sem {k.semester} sec {k.section} — {k.faculty}</li>)}</ul>}
        </section>
        <section className="card tone-sky"><h2>Add a period</h2>
          <SlotForm classes={classes.map((k) => ({ id: k.id, label: `${k.branch} sem ${k.semester} sec ${k.section} · ${k.code} ${k.name} (${k.faculty})` }))} /></section>
      </div>
      {!groups.length ? <Empty>No timetable yet.</Empty> : groups.map((g) => (
        <section className="card" key={g}>
          <h2>{g}</h2>
          <div className="scroll"><table>
            <thead><tr><th>Day</th><th>Period</th><th>Time</th><th>Subject</th><th>Teacher</th><th>Room</th><th></th></tr></thead>
            <tbody>{all.filter((s) => `${s.branch} semester ${s.semester} section ${s.section}` === g).map((s) => (
              <tr key={s.id}><td>{DAYS[s.day]}</td><td>{s.period}</td><td>{s.starts}–{s.ends}</td><td>{s.code} {s.name}</td><td>{s.faculty}</td><td>{s.room}</td><td><RemoveSlot id={s.id} /></td></tr>
            ))}</tbody>
          </table></div>
        </section>
      ))}
    </>
  );
}
