import Link from 'next/link';
import { pageActor, q } from '@/server/page';
import { listComplaints } from '@/server/complaints';
import { Empty, Status, when } from '../../ui';

export default async function Complaints() {
  const a = await pageActor();
  const staff = a.roles.includes('admin');
  const list = await q(a, (c) => listComplaints(c, a));
  return (
    <>
      <span className="page-eyebrow">Scholarship support</span><h1>{staff ? 'Student complaints' : 'Your complaints'}</h1>
      <p className="page-lead">{staff ? 'Open a complaint to update its status. "Verified closed" needs a settled credit in the ledger.' : 'Track each case from submission through staff response and verified closure.'}</p>
      {!list.length ? <Empty>{staff ? 'No complaints yet.' : 'No complaints yet. Start from a scholarship record under Fees & Scholarships.'}</Empty> : (
        <section className="card"><div className="scroll"><table>
          <thead><tr><th>Receipt</th>{staff && <th>Student</th>}<th>Subject</th><th>Status</th><th>Submitted</th></tr></thead>
          <tbody>{list.map((cm) => (
            <tr key={cm.id}><td><Link href={`/complaints/${cm.id}`}>{cm.receipt_no}</Link></td>{staff && <td>{cm.student}</td>}<td>{cm.subject}</td><td><Status s={cm.status} /></td><td>{when(cm.created_at)}</td></tr>
          ))}</tbody>
        </table></div></section>
      )}
    </>
  );
}
