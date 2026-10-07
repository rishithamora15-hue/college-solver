import Link from 'next/link';
import { redirect } from 'next/navigation';
import { homePath } from '@/server/auth';
import { pageActor, q } from '@/server/page';
import { feeOverview } from '@/server/finance';
import { many } from '@/server/db';
import { studentSubjects } from '@/server/learn';
import { listJobs } from '@/server/jobs';
import { MIN_ATTENDANCE, studentAttendance, studentResults } from '@/server/academics';
import { prepState, readiness, trainingPlan } from '@/server/prep';
import { day, inr, Status, SubjectTiles, when } from '../ui';
import { PlanSteps, ReadinessCard } from './prep/parts';

export default async function Overview() {
  const a = await pageActor();
  if (!a.studentId) redirect(homePath(a));
  const sid = a.studentId;
  const [fees, subs, jobs, complaints, att, res, prep] = await q(a, async (c) => [
    await feeOverview(c, a, sid), await studentSubjects(c, a, sid), await listJobs(c, a, {}),
    await many(c, `select id, receipt_no, status from complaints where college_id = $1 and student_id = $2 and status not in ('verified_closed') order by created_at desc limit 3`, [a.collegeId, sid]),
    await studentAttendance(c, a, sid), await studentResults(c, a, sid), await prepState(c, a, sid),
  ] as const);
  const ready = prep.path ? readiness(prep.path, prep) : null;
  const held = att.reduce((t, s) => t + s.held, 0);
  const pct = held ? Math.round((100 * att.reduce((t, s) => t + s.attended, 0)) / held) : null;
  const low = att.filter((s) => (100 * s.attended) / s.held < MIN_ATTENDANCE);
  const y = fees.years[0];
  const hour = Number(new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', hour: 'numeric', hour12: false }));
  const hello = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const first = a.displayName.replace(/\(.*\)/, '').trim().split(/\s+/)[0];
  const dueSoon = y?.rows.filter((r) => r.outstanding_paise > 0).sort((p, n) => +new Date(p.due_at) - +new Date(n.due_at))[0];
  return (
    <>
      <section className="hero entry-rise" aria-labelledby="welcome-title">
        <div>
          <span className="page-eyebrow">{hello}</span>
          <h1 id="welcome-title">Hi {first}, here's your day.</h1>
          <p>Stay on top of funding, study with context, prepare your resume and find your next opportunity.</p>
          <div className="hero-actions"><Link className="btn" href="/fees">Review my finances</Link><Link className="btn secondary" href="/learn">Continue learning</Link></div>
        </div>
        <div className="hero-graphic" aria-hidden="true"><div className="orbit"><span>₹</span><span>✦</span><span>↗</span><span>◎</span><div className="orbit-center">CS</div></div></div>
      </section>
      <div className="section-head"><h2>At a glance</h2><span className="muted">One place for your next steps</span></div>
      <div className="grid dashboard-grid">
        <section className="card feature-card tone-sky entry-rise">
          <span className="feature-kicker">00 / Academics</span>
          <h2>Attendance &amp; results</h2>
          <strong className={`feature-value ${pct !== null && pct < MIN_ATTENDANCE ? 'bad' : ''}`}>{pct === null ? '—' : `${pct}%`}</strong>
          <p className="muted">overall attendance{res.sgpa !== null && <> · SGPA so far <strong>{res.sgpa}</strong></>}</p>
          {low.length > 0 && <p className="bad small">Below {MIN_ATTENDANCE}% in {low.map((s) => s.code).join(', ')}</p>}
          <Link href="/academics">Timetable, attendance and grade card →</Link>
        </section>
        <section className="card feature-card tone-amber entry-rise">
          <span className="feature-kicker">01 / Financial clarity</span>
          <h2>Fees &amp; scholarships</h2>
          {y ? <>
            <p>Outstanding ({y.year})</p><strong className="feature-value">{inr(y.outstanding_paise)}</strong>
            {y.expected_uncredited_paise > 0 && <p className="muted">Expected scholarship not yet credited: {inr(y.expected_uncredited_paise)}</p>}
            {dueSoon && <p>Next due: {day(dueSoon.due_at)} ({dueSoon.category})</p>}
          </> : <p className="muted">No fee records.</p>}
          <p className="muted">Updated {when(fees.observed_at)}{fees.stale ? ' · stale' : ''}</p>
          <Link href="/fees">Explore financial details →</Link>
        </section>
        <section className="card feature-card tone-rose entry-rise" style={{ animationDelay: '.05s' }}>
          <span className="feature-kicker">02 / What needs attention</span>
          <h2>Open actions</h2>
          <ul className="inline-list">
            {fees.cases.filter((k) => k.status !== 'credited').map((k) => <li key={k.id}>{k.scheme_name}: <Status s={k.status} /> <Link href={`/fees/${k.id}`}>details</Link></li>)}
            {complaints.map((cm) => <li key={cm.id}>Complaint {cm.receipt_no}: <Status s={cm.status} /> <Link href={`/complaints/${cm.id}`}>track</Link></li>)}
            {!fees.cases.some((k) => k.status !== 'credited') && !complaints.length && <li className="muted">You're all caught up.</li>}
          </ul>
        </section>
        <section className="card feature-card tone-violet entry-rise" style={{ animationDelay: '.1s' }}>
          <span className="feature-kicker">03 / Academic momentum</span>
          <h2>Continue studying</h2>
          <SubjectTiles subjects={subs.slice(0, 4)} />
          {!subs.length && <p className="muted">No subjects are assigned yet.</p>}
        </section>
        <section className="card feature-card tone-teal entry-rise" style={{ animationDelay: '.15s' }}>
          <span className="feature-kicker">04 / Your next opportunity</span>
          <h2>Career &amp; jobs</h2>
          <p><Link href="/career">Resume and JD analysis</Link></p>
          <p><strong className="feature-value">{jobs.length}</strong> open roles</p>
          <Link href="/jobs">Explore opportunities →</Link>
        </section>
      </div>
      <div className="section-head"><h2>Placement readiness</h2><Link href="/prep">Open my learning path →</Link></div>
      {prep.path && ready ? (
        <div className="split">
          <ReadinessCard path={prep.path} r={ready} />
          <section className="card tone-amber">
            <h2>Your learning path: next steps</h2>
            <PlanSteps steps={trainingPlan(prep.path, prep, ready)} limit={3} />
            <p className="row actions-row"><Link className="btn" href="/prep/quiz">Take a quiz</Link><Link className="btn secondary" href="/prep">See the full course</Link></p>
          </section>
        </div>
      ) : (
        <section className="card tone-violet">
          <h2>Choose your target role</h2>
          <p className="muted">Get a course, aptitude, communication and coding practice matched to the role, and a job readiness score built from your own results.</p>
          <Link className="btn" href="/prep">Start my learning path</Link>
        </section>
      )}
    </>
  );
}
