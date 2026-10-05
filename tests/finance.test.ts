import { describe, expect, it } from 'vitest';
import { summarize } from '../src/server/finance';

const A = (id: string, amt: number, year = '2025-26') => ({ id, academic_year: year, category: 'tuition', amount_paise: amt, due_at: new Date(), source_ref: 's', observed_at: new Date() });

describe('ledger arithmetic (integer paise)', () => {
  it('blueprint example: approved-but-uncredited scholarship never reduces the ledger', () => {
    const [y] = summarize([A('a', 12000000)], [{ assessment_id: 'a', kind: 'student_payment', amount_paise: 2000000 }],
      [{ id: 'c', academic_year: '2025-26', status: 'approved', expected_paise: 8000000, credited_paise: 0 }]);
    expect(y.outstanding_paise).toBe(10000000);          // INR 1,00,000 actual
    expect(y.expected_uncredited_paise).toBe(8000000);   // shown separately
    expect(y.projected_student_remainder_paise).toBe(2000000); // labeled projection INR 20,000
  });
  it('credited scholarship is subtracted exactly once (ledger credit, not expected amount)', () => {
    const [y] = summarize([A('a', 12000000)], [
      { assessment_id: 'a', kind: 'student_payment', amount_paise: 4000000 },
      { assessment_id: 'a', kind: 'scholarship_credit', amount_paise: 8000000 },
    ], [{ id: 'c', academic_year: '2025-26', status: 'credited', expected_paise: 8000000, credited_paise: 8000000 }]);
    expect(y.outstanding_paise).toBe(0);
    expect(y.expected_uncredited_paise).toBe(0);
  });
  it('partial credit leaves remaining expected amount separate', () => {
    const [y] = summarize([A('a', 10000000)], [{ assessment_id: 'a', kind: 'scholarship_credit', amount_paise: 3000000 }],
      [{ id: 'c', academic_year: '2025-26', status: 'released', expected_paise: 5000000, credited_paise: 3000000 }]);
    expect(y.outstanding_paise).toBe(7000000);
    expect(y.expected_uncredited_paise).toBe(2000000);
  });
  it('overpayment is kept as negative balance (credit), refund reopens balance', () => {
    const [y] = summarize([A('a', 100)], [{ assessment_id: 'a', kind: 'student_payment', amount_paise: 150 }], []);
    expect(y.outstanding_paise).toBe(-50);
    const [z] = summarize([A('a', 100)], [{ assessment_id: 'a', kind: 'student_payment', amount_paise: 150 }, { assessment_id: 'a', kind: 'refund', amount_paise: 50 }], []);
    expect(z.outstanding_paise).toBe(0);
  });
  it('groups by academic year, newest first, with year totals', () => {
    const ys = summarize([A('a', 100, '2024-25'), A('b', 200), { ...A('c', 300), category: 'transport' }], [], []);
    expect(ys.map((y) => [y.year, y.assessed_paise])).toEqual([['2025-26', 500], ['2024-25', 100]]);
  });
});
