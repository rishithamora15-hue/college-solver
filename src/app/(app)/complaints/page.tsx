import Link from 'next/link';
import { pageActor, q } from '@/server/page';
import { listComplaints } from '@/server/complaints';
import { Empty, Status, when } from '../../ui';

export default async function Complaints() {
  const a = await pageActor();
  const list = await q(a, (c) => listComplaints(c, a));
  return (
    <>
      <h1>Complaints</h1>
      {!list.length && <Empty>No complaints yet. Start from a scholarship record under Fees &amp; Scholarships.</Empty>}
      <ul>{list.map((cm) => <li key={cm.id}><Link href={`/complaints/${cm.id}`}>{cm.receipt_no}</Link> · {cm.subject} · <Status s={cm.status} /> · {when(cm.created_at)}</li>)}</ul>
    </>
  );
}
