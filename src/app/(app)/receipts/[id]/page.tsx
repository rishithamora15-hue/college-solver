import { isUuid } from '@/server/http';
import { orNull, pageActor, q } from '@/server/page';
import { receipt } from '@/server/admin';
import { PrintButton } from '../../../client';
import { inr, NotFound, when } from '../../../ui';

const MODE: Record<string, string> = { cash: 'Cash', upi: 'UPI', card: 'Card', bank_transfer: 'Bank transfer', cheque: 'Cheque', dd: 'Demand draft' };

export default async function Receipt({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const a = await pageActor();
  const r = isUuid(id) ? await orNull(q(a, (c) => receipt(c, a, id))) : null;
  if (!r) return <NotFound what="This receipt" />;
  const { p, lines } = r;
  const credit = p.kind === 'scholarship_credit';
  return (
    <>
      <p className="no-print"><PrintButton /></p>
      <article className="paper">
        <header><strong>{p.college}</strong><span>{credit ? 'Scholarship credit advice' : 'Fee receipt'}</span></header>
        <h1>{p.external_ref}</h1>
        <dl className="paper-grid">
          <div><dt>Student</dt><dd>{p.display_name}</dd></div><div><dt>Roll number</dt><dd>{p.roll_no}</dd></div>
          <div><dt>Class</dt><dd>{p.branch} · Sem {p.current_semester} · Sec {p.section}</dd></div><div><dt>Date</dt><dd>{when(p.posted_at)}</dd></div>
          {!credit && <div><dt>Mode</dt><dd>{MODE[p.mode] ?? p.source}</dd></div>}
          {p.reference && <div><dt>Reference</dt><dd>{p.reference}</dd></div>}
        </dl>
        <table>
          <thead><tr><th>Fee</th><th className="num">Amount</th></tr></thead>
          <tbody>{lines.map((l, i) => <tr key={i}><td>{l.academic_year} · {l.category}</td><td className="num">{inr(l.amount_paise)}</td></tr>)}</tbody>
          <tfoot><tr><th>Total</th><th className="num">{inr(p.amount_paise)}</th></tr></tfoot>
        </table>
        <footer><span>{p.recorded_by_name ? `Recorded by ${p.recorded_by_name}` : `Source: ${p.source}`} · Synthetic evaluation data.</span><span className="sign">Accounts office</span></footer>
      </article>
    </>
  );
}
