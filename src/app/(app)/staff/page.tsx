import Link from 'next/link';
import { pageActor, q } from '@/server/page';
import { listComplaints } from '@/server/complaints';
import { Empty, NotFound, Status, when } from '../../ui';

export default async function Staff() {
  const a = await pageActor();
  if (!a.roles.includes('finance_staff')) return <NotFound what="The staff workspace" />;
  const list = await q(a, (c) => listComplaints(c, a));
  const open = list.filter((cm) => cm.status !== 'verified_closed');
  return (
    <>
      <h1>Staff workspace</h1>
      <p className="muted">Scholarship complaints for {a.collegeName}. "Verified closed" needs a settled credit in the ledger.</p>
      {!open.length ? <Empty>No open complaints.</Empty> : (
        <div className="scroll"><table>
          <thead><tr><th>Receipt</th><th>Student</th><th>Subject</th><th>Status</th><th>Submitted</th></tr></thead>
          <tbody>{open.map((cm) => (
            <tr key={cm.id}><td><Link href={`/complaints/${cm.id}`}>{cm.receipt_no}</Link></td><td>{cm.student}</td><td>{cm.subject}</td><td><Status s={cm.status} /></td><td>{when(cm.created_at)}</td></tr>
          ))}</tbody>
        </table></div>
      )}
    </>
  );
}
