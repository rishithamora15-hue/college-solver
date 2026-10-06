import { pageActor, q } from '@/server/page';
import { placementStats } from '@/server/jobs';
import { Empty, NotFound, Stat } from '../../../ui';

export default async function PlacementStats() {
  const a = await pageActor();
  if (!a.roles.includes('placement')) return <NotFound what="Placement statistics" />;
  const s = await q(a, (c) => placementStats(c, a));
  const pct = s.students ? Math.round((100 * s.placed) / s.students) : 0;
  return (
    <>
      <span className="page-eyebrow">Placement cell</span><h1>Placement statistics</h1>
      <div className="stat-grid">
        <Stat tone="violet" label="Students" value={s.students} />
        <Stat tone="teal" label="Placed (selected / offer)" value={s.placed} />
        <Stat tone="sky" label="Placement rate" value={`${pct}%`} />
      </div>
      <p><a className="btn secondary" href="/api/v1/placement/export">Download all applications (Excel)</a></p>
      <div className="split">
        <section className="card tone-violet">
          <h2>By branch</h2>
          <ul className="att-list">{s.branches.map((b) => { const p = b.students ? Math.round((100 * b.placed) / b.students) : 0; return (
            <li key={b.branch}><div className="att-head"><strong>{b.branch}</strong><span>{b.placed} of {b.students} placed · {p}%</span></div>
              <div className="meter" aria-hidden="true"><span style={{ width: `${p}%` }} /></div></li>
          ); })}</ul>
        </section>
        <section className="card tone-teal">
          <h2>By company</h2>
          {!s.companies.length ? <Empty>No applications yet.</Empty> : (
            <div className="scroll"><table>
              <thead><tr><th>Company</th><th className="num">Applied</th><th className="num">In rounds</th><th className="num">Selected</th><th className="num">Not selected</th></tr></thead>
              <tbody>{s.companies.map((c) => <tr key={c.company}><td>{c.company}</td><td className="num">{c.applied}</td><td className="num">{c.in_process}</td><td className="num"><strong>{c.selected}</strong></td><td className="num">{c.rejected}</td></tr>)}</tbody>
            </table></div>
          )}
        </section>
      </div>
    </>
  );
}
