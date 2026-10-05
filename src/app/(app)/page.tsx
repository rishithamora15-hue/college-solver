import Link from 'next/link';
import { pageActor, q } from '@/server/page';
import { feeOverview } from '@/server/finance';
import { many } from '@/server/db';
import { studentSubjects } from '@/server/learn';
import { listJobs } from '@/server/jobs';
import { day, inr, Status, when } from '../ui';

export default async function Overview() {
  const a = await pageActor();
  if (!a.studentId) return <p>Staff account. Use the <Link href="/staff">staff workspace</Link>.</p>;
  const sid = a.studentId;
  const [fees, subs, jobs, complaints] = await q(a, async (c) => [
    await feeOverview(c, a, sid), await studentSubjects(c, a, sid), await listJobs(c, a, {}),
    await many(c, `select id, receipt_no, status from complaints where college_id = $1 and student_id = $2 and status not in ('verified_closed') order by created_at desc limit 3`, [a.collegeId, sid]),
  ] as const);
  const y = fees.years[0];
  const dueSoon = y?.rows.filter((r) => r.outstanding_paise > 0).sort((p, n) => +new Date(p.due_at) - +new Date(n.due_at))[0];
  return (
    <>
      <h1>Overview</h1>
      <div className="grid">
        <section className="card">
          <h2>Fees</h2>
          {y ? <>
            <p>Outstanding ({y.year}): <strong>{inr(y.outstanding_paise)}</strong></p>
            {y.expected_uncredited_paise > 0 && <p className="muted">Expected scholarship not yet credited: {inr(y.expected_uncredited_paise)}</p>}
            {dueSoon && <p>Next due: {day(dueSoon.due_at)} ({dueSoon.category})</p>}
          </> : <p className="muted">No fee records.</p>}
          <p className="muted">Updated {when(fees.observed_at)}{fees.stale ? ' · stale' : ''}</p>
          <Link href="/fees">Open fees</Link>
        </section>
        <section className="card">
          <h2>Open actions</h2>
          {fees.cases.filter((k) => !['credited'].includes(k.status)).map((k) => <p key={k.id}>{k.scheme_name}: <Status s={k.status} /> <Link href={`/fees/${k.id}`}>details</Link></p>)}
          {complaints.map((cm) => <p key={cm.id}>Complaint {cm.receipt_no}: <Status s={cm.status} /> <Link href={`/complaints/${cm.id}`}>track</Link></p>)}
        </section>
        <section className="card">
          <h2>Continue studying</h2>
          <ul>{subs.slice(0, 4).map((s) => <li key={s.id}><Link href={`/learn?s=${s.id}`}>{s.code} {s.name}</Link>{s.backlog && <> <span className="badge warn">backlog</span></>}</li>)}</ul>
        </section>
        <section className="card">
          <h2>Career and jobs</h2>
          <p><Link href="/career">Resume and JD analysis</Link></p>
          <p>{jobs.length} open listings (fictional). <Link href="/jobs">Browse jobs</Link></p>
        </section>
      </div>
    </>
  );
}
