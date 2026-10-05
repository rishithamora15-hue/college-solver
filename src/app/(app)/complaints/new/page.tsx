import { pageActor, q, orNull } from '@/server/page';
import { isUuid } from '@/server/http';
import { getDraft } from '@/server/complaints';
import { ComplaintReview } from '../../../client';
import { NotFound } from '../../../ui';

export default async function NewComplaint({ searchParams }: { searchParams: Promise<{ draft?: string }> }) {
  const { draft } = await searchParams;
  const a = await pageActor();
  const d = a.studentId && draft && isUuid(draft) ? await orNull(q(a, (c) => getDraft(c, a, a.studentId!, draft))) : null;
  if (!d) return <NotFound what="This draft" />;
  return (
    <>
      <h1>Review complaint</h1>
      {d.run_id && <p className="muted">Draft prepared by the AI scholarship specialist. Edit anything before submitting.</p>}
      <ComplaintReview draft={{ id: d.id, subject: d.subject, body: d.body, case_version: d.case_version, department: d.department, contact_label: d.contact_label }} />
    </>
  );
}
