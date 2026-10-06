import Link from 'next/link';
import { pageActor, q } from '@/server/page';
import { DAYS, facultyClasses, istToday, MIN_ATTENDANCE, slots } from '@/server/academics';
import { Empty, NotFound, Stat } from '../../ui';

export default async function Faculty() {
  const a = await pageActor();
  if (!a.roles.includes('faculty')) return <NotFound what="The faculty dashboard" />;
  const [classes, mine] = await q(a, async (c) => [await facultyClasses(c, a), await slots(c, a, true)] as const);
  const today = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' })).getDay();
  const todays = mine.filter((s) => s.day === today);
  const first = a.displayName.replace(/\(.*\)/, '').trim();
  return (
    <>
      <section className="hero hero-faculty entry-rise">
        <div>
          <span className="page-eyebrow">Faculty · {a.collegeName}</span>
          <h1>Welcome, {first}.</h1>
          <p>Mark attendance, enter marks and share notes with your classes. Students see updates instantly.</p>
        </div>
      </section>
      <div className="stat-grid">
        <Stat tone="violet" label="Classes" value={classes.length} />
        <Stat tone="sky" label="Periods today" value={todays.length} />
        <Stat tone="teal" label="Students" value={classes.reduce((t, k) => t + k.students, 0)} />
        <Stat tone="rose" label={`Below ${MIN_ATTENDANCE}% attendance`} value={classes.reduce((t, k) => t + k.short, 0)} />
      </div>
      <section className="card tone-sky">
        <h2>Today · {DAYS[today] || 'Sunday'}</h2>
        {!todays.length ? <p className="muted">No classes today.</p> : (
          <ul className="today-list">{todays.map((s) => (
            <li key={s.id}><span className="time">{s.starts}–{s.ends}</span><span><strong>{s.code} {s.name}</strong><small className="muted">{s.branch} sem {s.semester} · section {s.section} · {s.room}</small></span>
              <Link className="btn small-btn" href={`/faculty/classes/${s.assignment_id}?date=${istToday()}&period=${s.period}`}>Take attendance</Link></li>
          ))}</ul>
        )}
      </section>
      <h2 className="section-title">My classes</h2>
      {!classes.length ? <Empty>No classes assigned yet. The administration office assigns subjects to teachers.</Empty> : (
        <div className="job-grid">{classes.map((k) => (
          <Link key={k.id} href={`/faculty/classes/${k.id}`} className="card class-card">
            <span className="feature-kicker">{k.branch} · Semester {k.semester} · Section {k.section}</span>
            <h3>{k.code} {k.name}</h3>
            <p className="muted">{k.students} students · {k.held} classes held</p>
            <p>Average attendance <strong className={k.avg_pct !== null && k.avg_pct < MIN_ATTENDANCE ? 'bad' : 'ok'}>{k.avg_pct ?? '—'}{k.avg_pct !== null && '%'}</strong>
              {k.short > 0 && <span className="badge bad">{k.short} below {MIN_ATTENDANCE}%</span>}</p>
            <span className="go">Open class →</span>
          </Link>
        ))}</div>
      )}
    </>
  );
}
