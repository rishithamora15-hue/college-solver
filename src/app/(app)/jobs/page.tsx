import Link from 'next/link';
import { pageActor, q } from '@/server/page';
import { listJobs, type JobFilter } from '@/server/jobs';
import { day, Empty } from '../../ui';

const opt = <T extends string>(v: string | undefined, ok: readonly T[]) => (ok.includes(v as T) ? (v as T) : undefined);

export default async function Jobs({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const f: JobFilter = {
    category: opt(sp.category, ['it', 'non_it'] as const), campus_type: opt(sp.campus_type, ['campus', 'off_campus'] as const),
    level: opt(sp.level, ['fresher', 'internship'] as const), include_expired: sp.expired === '1',
  };
  const a = await pageActor();
  const jobs = await q(a, (c) => listJobs(c, a, f));
  const sel = (name: string, label: string, opts: [string, string][]) => (
    <div><label htmlFor={name}>{label}</label>
      <select id={name} name={name} defaultValue={sp[name] ?? ''}><option value="">Any</option>{opts.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></div>
  );
  return (
    <>
      <h1>Jobs</h1>
      <p className="muted">All listings are fictional samples. Always apply on the employer's official page.</p>
      <form className="card row" method="get">
        {sel('category', 'Category', [['it', 'IT'], ['non_it', 'Non-IT']])}
        {sel('campus_type', 'Campus', [['campus', 'On campus'], ['off_campus', 'Off campus']])}
        {sel('level', 'Level', [['fresher', 'Fresher'], ['internship', 'Internship']])}
        <div><label><input type="checkbox" name="expired" value="1" defaultChecked={f.include_expired} style={{ width: 'auto' }} /> Show expired</label></div>
        <button style={{ flex: '0 0 auto' }}>Apply filters</button>
      </form>
      {!jobs.length ? <Empty>No listings match these filters.</Empty> : (
        <div className="scroll"><table>
          <thead><tr><th>Role</th><th>Company</th><th>Type</th><th>Deadline</th><th>Status</th></tr></thead>
          <tbody>{jobs.map((j) => (
            <tr key={j.id}>
              <td><Link href={`/jobs/${j.id}`}>{j.role}</Link></td><td>{j.company}{j.is_fictional && <span className="muted"> (fictional)</span>}</td>
              <td>{j.category === 'it' ? 'IT' : 'Non-IT'} · {j.campus_type.replace('_', ' ')} · {j.level}</td><td>{day(j.deadline_at)}</td>
              <td>{j.expired ? <span className="badge bad">expired</span> : j.stale ? <span className="badge warn">not re-verified in 14 days</span> : <span className="badge ok">open</span>}</td>
            </tr>
          ))}</tbody>
        </table></div>
      )}
    </>
  );
}
