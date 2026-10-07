import Link from 'next/link';
import { pageActor, q } from '@/server/page';
import { branchCodes, classOptions, listStudents } from '@/server/admin';
import { AddStudent, BulkImport } from '../../../client';
import { Empty, initials, NotFound } from '../../../ui';

export default async function Students({ searchParams }: { searchParams: Promise<{ q?: string; cls?: string }> }) {
  const a = await pageActor();
  if (!a.roles.includes('admin')) return <NotFound what="Students" />;
  const sp = await searchParams;
  const [list, classes, branches] = await q(a, async (c) => [await listStudents(c, a, { q: sp.q, cls: sp.cls }), await classOptions(c, a), await branchCodes(c, a)] as const);
  return (
    <>
      <span className="page-eyebrow">Administration office</span><h1>Students</h1>
      <form className="card row" method="get" role="search">
        <div><label htmlFor="q">Search</label><input id="q" name="q" defaultValue={sp.q ?? ''} placeholder="Roll number, mobile, email or name" /></div>
        <div><label htmlFor="cls">Class</label><select id="cls" name="cls" defaultValue={sp.cls ?? ''}><option value="">All classes</option>
          {classes.map((k) => <option key={`${k.curriculum_id}:${k.semester}:${k.section}`} value={`${k.curriculum_id}:${k.semester}:${k.section}`}>{k.branch} sem {k.semester} sec {k.section}</option>)}</select></div>
        <button style={{ flex: '0 0 auto' }}>Show</button>
        <a className="btn secondary" style={{ flex: '0 0 auto' }} href="/api/v1/admin/export?kind=students">Download Excel (CSV)</a>
      </form>
      <section className="card">
        <h2>{list.length} student{list.length === 1 ? '' : 's'}{list.length === 300 ? ' (first 300; narrow the search)' : ''}</h2>
        {!list.length ? <Empty>No students match.</Empty> : (
          <div className="scroll"><table>
            <thead><tr><th>Student</th><th>Roll</th><th>Class</th><th>Mobile</th><th className="num">CGPA</th></tr></thead>
            <tbody>{list.map((s) => (
              <tr key={s.id}><td><Link className="person" href={`/admin/students/${s.id}`}><span className="avatar sm" aria-hidden="true">{initials(s.display_name)}</span>{s.display_name}</Link><div className="muted small">{s.email}</div></td>
                <td>{s.roll_no}</td><td>{s.branch} · sem {s.current_semester} · {s.section}</td><td>{s.phone ?? '—'}</td><td className="num">{s.cgpa ?? '—'}</td></tr>
            ))}</tbody>
          </table></div>
        )}
      </section>
      {!branches.length ? (
        <section className="card tone-amber">
          <h2>Add a branch first</h2>
          <p>Every student belongs to a branch and follows its syllabus. <Link href="/admin/setup?tab=syllabus">Add your branches in College setup</Link>, then come back to add students.</p>
        </section>
      ) : (
        <div className="split">
          <section className="card tone-violet"><h2>Add a student</h2><AddStudent branches={branches} /></section>
          <section className="card tone-teal"><h2>Import from Excel</h2><BulkImport /></section>
        </div>
      )}
    </>
  );
}
