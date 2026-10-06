import { z } from 'zod';
import { many, one, type Db } from './db';
import type { Actor } from './auth';
import { notFound } from './http';

export const STALE_MS = 7 * 86400000;

/** "1,20,000.50" style rupee input -> integer paise, without floating point. */
export const rupeesToPaise = z.string().trim().transform((s) => s.replaceAll(',', ''))
  .pipe(z.string().regex(/^\d{1,9}(\.\d{1,2})?$/, 'Enter an amount in rupees'))
  .transform((s) => { const [r, p = ''] = s.split('.'); return Number(r) * 100 + Number(p.padEnd(2, '0')); })
  .refine((n) => n > 0, 'Amount must be more than zero');
type Assessment = { id: string; academic_year: string; category: string; amount_paise: number; due_at: Date; source_ref: string; observed_at: Date };
type Alloc = { assessment_id: string; kind: 'student_payment' | 'scholarship_credit' | 'refund'; amount_paise: number };
type Case = { id: string; academic_year: string; status: string; expected_paise: number; credited_paise: number };

/**
 * Ledger outstanding = assessed − settled student payments − settled scholarship credits (+ refunds re-open balance).
 * Expected-but-uncredited scholarship is reported SEPARATELY and never reduces the ledger balance.
 * Negative outstanding is kept (shown as credit), not clamped.
 */
export function summarize(assessments: Assessment[], allocs: Alloc[], cases: Case[]) {
  const rows = assessments.map((a) => {
    const mine = allocs.filter((x) => x.assessment_id === a.id);
    const sum = (k: Alloc['kind']) => mine.filter((x) => x.kind === k).reduce((s, x) => s + x.amount_paise, 0);
    const paid = sum('student_payment') - sum('refund');
    const credited = sum('scholarship_credit');
    return { ...a, paid_paise: paid, scholarship_credited_paise: credited, outstanding_paise: a.amount_paise - paid - credited };
  });
  const years = [...new Set(rows.map((r) => r.academic_year))].sort().reverse().map((year) => {
    const yr = rows.filter((r) => r.academic_year === year);
    const t = (k: 'amount_paise' | 'paid_paise' | 'scholarship_credited_paise' | 'outstanding_paise') => yr.reduce((s, r) => s + r[k], 0);
    const expected_uncredited_paise = cases
      .filter((c) => c.academic_year === year && ['approved', 'released'].includes(c.status))
      .reduce((s, c) => s + Math.max(0, c.expected_paise - c.credited_paise), 0);
    const outstanding = t('outstanding_paise');
    return {
      year, rows: yr,
      assessed_paise: t('amount_paise'), paid_paise: t('paid_paise'), scholarship_credited_paise: t('scholarship_credited_paise'),
      outstanding_paise: outstanding,
      expected_uncredited_paise,
      // Labeled projection only: what the student would owe IF the expected scholarship is credited.
      projected_student_remainder_paise: outstanding - expected_uncredited_paise,
    };
  });
  return years;
}

export async function feeOverview(c: Db, a: Actor, studentId: string) {
  const assessments = await many(c, `select id, academic_year, category, amount_paise::bigint, due_at, source_ref, observed_at
    from fee_assessments where college_id = $1 and student_id = $2 order by academic_year desc, category`, [a.collegeId, studentId]);
  const allocs = await many(c, `select pa.assessment_id, p.kind, pa.amount_paise::bigint from payment_allocations pa
    join payments p on p.id = pa.payment_id and p.college_id = pa.college_id
    where p.college_id = $1 and p.student_id = $2 and p.status = 'settled'`, [a.collegeId, studentId]);
  const cases = await scholarshipCases(c, a, studentId);
  const observed = assessments.reduce((m: number, x) => Math.min(m, +new Date(x.observed_at)), Date.now());
  return { years: summarize(assessments, allocs, cases), cases, observed_at: new Date(observed), stale: Date.now() - observed > STALE_MS };
}

export async function scholarshipCases(c: Db, a: Actor, studentId: string) {
  return many(c, `select sc.id, sc.academic_year, sc.status, sc.expected_paise::bigint, sc.released_paise::bigint, sc.source_ref, sc.observed_at, sc.version,
      s.name scheme_name,
      coalesce((select sum(p.amount_paise) from payments p where p.scholarship_case_id = sc.id and p.college_id = sc.college_id
        and p.kind = 'scholarship_credit' and p.status = 'settled'), 0)::bigint credited_paise
    from scholarship_cases sc join schemes s on s.id = sc.scheme_id and s.college_id = sc.college_id
    where sc.college_id = $1 and sc.student_id = $2 order by sc.academic_year desc`, [a.collegeId, studentId]);
}

/** Object-level check: case must belong to this student in this tenant. Missing and forbidden look identical. */
export async function scholarshipDetail(c: Db, a: Actor, studentId: string, caseId: string) {
  const kase = (await scholarshipCases(c, a, studentId)).find((x) => x.id === caseId);
  if (!kase) throw notFound();
  const events = await many(c, `select status, note, source_ref, occurred_at from scholarship_case_events where college_id = $1 and case_id = $2 order by occurred_at`, [a.collegeId, caseId]);
  const documents = await many(c, `select r.id, r.name, r.description, coalesce(sd.state, 'missing') state, sd.expires_at,
      (sd.expires_at is not null and sd.expires_at < now()) expired
    from scholarship_cases sc join document_requirements r on r.scheme_id = sc.scheme_id and r.college_id = sc.college_id
    left join student_documents sd on sd.requirement_id = r.id and sd.student_id = sc.student_id and sd.college_id = sc.college_id
    where sc.college_id = $1 and sc.id = $2 order by r.name`, [a.collegeId, caseId]);
  const policy = await one(c, `select s.name, s.policy_text, s.policy_version from schemes s join scholarship_cases sc on sc.scheme_id = s.id and sc.college_id = s.college_id
    where sc.college_id = $1 and sc.id = $2`, [a.collegeId, caseId]);
  return { kase, events, documents, policy, stale: Date.now() - +new Date(kase.observed_at) > STALE_MS };
}
