import { isUuid } from '@/server/http';
import { orNull, pageActor, q } from '@/server/page';
import { PRINTABLE, REQUEST_KINDS, requestView } from '@/server/requests';
import { PrintButton } from '../../../client';
import { day, NotFound } from '../../../ui';

const BODY: Record<string, (r: any) => string> = {
  bonafide: (r) => `This is to certify that ${r.display_name} (Roll No. ${r.roll_no}) is a bonafide student of this college, studying in semester ${r.current_semester}, section ${r.section}, ${r.branch_name}, during the current academic year.`,
  study: (r) => `This is to certify that ${r.display_name} (Roll No. ${r.roll_no}) is studying ${r.branch_name} at this college and is currently in semester ${r.current_semester}.`,
  conduct: (r) => `This is to certify that ${r.display_name} (Roll No. ${r.roll_no}), a student of ${r.branch_name}, has shown good conduct and character during the period of study at this college.`,
};

export default async function Certificate({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const a = await pageActor();
  const r = isUuid(id) ? await orNull(q(a, (c) => requestView(c, a, id))) : null;
  if (!r || !PRINTABLE.includes(r.kind) || !['approved', 'ready'].includes(r.status)) return <NotFound what="This certificate" />;
  return (
    <>
      <p className="no-print"><PrintButton /></p>
      <article className="paper">
        <header><strong>{r.college}</strong><span>Administration office</span></header>
        <h1>{REQUEST_KINDS[r.kind as keyof typeof REQUEST_KINDS]}</h1>
        <p className="muted">Ref. {r.id.slice(0, 8).toUpperCase()} · Date {day(r.decided_at ?? r.created_at)}</p>
        <p className="paper-body">{BODY[r.kind](r)}</p>
        <p>Purpose: {r.reason}</p>
        <footer><span>Synthetic evaluation data — not a legal document.</span><span className="sign">Authorised signatory</span></footer>
      </article>
    </>
  );
}
