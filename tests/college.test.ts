// Digital college: faculty academics, admin records and money, student requests, placement eligibility and rounds.
import { describe, expect, it } from 'vitest';
import { ID, LOGIN } from '../scripts/seed';
import { tx } from '../src/server/db';
import type { Actor } from '../src/server/auth';
import { localSignIn, resolveActor } from '../src/server/auth';
import { classAssessments, classFor, facultyClasses, grade, istToday, saveAttendance, saveMarks, studentAttendance, studentResults, studentTimetable } from '../src/server/academics';
import { addFee, addStudents, broadcast, editFee, listStudents, recordPayment, recordScholarshipCredit, receipt } from '../src/server/admin';
import { feeOverview } from '../src/server/finance';
import { createRequest, decideRequest } from '../src/server/requests';
import { jobDetail, placementStats, setStage, track } from '../src/server/jobs';
import { changePassword } from '../src/server/profile';
import { actor, owner } from './helpers';

const S = (a: Actor) => ({ collegeId: a.collegeId, userId: a.userId });
const asOwner = async (sql: string, p: unknown[] = []) => { const c = await owner(); try { return (await c.query(sql, p)).rows; } finally { await c.end(); } };
const job310 = '00000000-0000-4000-8000-000000000310';

describe('faculty', () => {
  it('sees only own classes; attendance rules; marks bounded; publishing reaches students', async () => {
    const kavya = await actor('kavya'), arjun = await actor('arjun');
    expect(kavya.roles).toEqual(['faculty']);
    const [k] = await tx((c) => facultyClasses(c, kavya), S(kavya));
    expect(k).toMatchObject({ code: 'CS301', students: 2 });
    await expect(tx((c) => classFor(c, arjun, k.id, true), S(arjun))).rejects.toMatchObject({ status: 404 }); // another teacher's class
    await expect(tx((c) => saveAttendance(c, kavya, { assignment_id: k.id, date: istToday(1), period: 7, present: [] }), S(kavya))).rejects.toMatchObject({ status: 400 });
    await expect(tx((c) => saveAttendance(c, kavya, { assignment_id: k.id, date: istToday(), period: 7, present: [ID.meeraStudent] }), S(kavya))).rejects.toMatchObject({ status: 400 });
    expect(await tx((c) => saveAttendance(c, kavya, { assignment_id: k.id, date: istToday(), period: 7, present: [ID.ashaStudent] }), S(kavya))).toEqual({ present: 1, total: 2 });
    expect(await tx((c) => saveAttendance(c, kavya, { assignment_id: k.id, date: istToday(), period: 7, present: [ID.ashaStudent, ID.raviStudent] }), S(kavya))).toEqual({ present: 2, total: 2 }); // re-mark updates
    const [mid] = await tx(async (c) => classAssessments(c, kavya, await classFor(c, kavya, k.id, true)), S(kavya));
    await expect(tx((c) => saveMarks(c, kavya, mid.id, { marks: [{ student_id: ID.ashaStudent, marks: 31 }] }), S(kavya))).rejects.toMatchObject({ status: 400 });
    await expect(tx((c) => saveMarks(c, arjun, mid.id, { marks: [] }), S(arjun))).rejects.toMatchObject({ status: 404 });
  });
  it('student sees timetable, attendance and a grade card from published marks only', async () => {
    const asha = await actor('asha');
    expect((await tx((c) => studentTimetable(c, asha, ID.ashaStudent), S(asha))).length).toBe(11);
    const att = await tx((c) => studentAttendance(c, asha, ID.ashaStudent), S(asha));
    expect(att.map((s) => s.code).sort()).toEqual(['CS301', 'CS302']);
    const r = await tx((c) => studentResults(c, asha, ID.ashaStudent), S(asha));
    const ds = r.subjects.find((s) => s.code === 'CS302')!;
    expect(ds.items.map((i) => i.assessment)).toEqual(['Mid-term 1']); // unpublished Quiz 1 is hidden
    expect(ds).toMatchObject({ got: 21, max: 30, pct: 70, letter: 'A' });
    expect(grade(89.9)).toEqual(['A+', 9]);
    expect(grade(39)).toEqual(['F', 0]);
  });
});

describe('administration office', () => {
  it('bulk import is all-or-nothing; added students sign in with their roll number', async () => {
    const admin = await actor('fin.a');
    const row = (n: number, extra = {}) => ({ display_name: `Test Student ${n}`, email: `t${n}@college-a.example`, roll_no: `23a91a05${n}0`, branch: 'cse', semester: '1', section: 'b', ...extra });
    const bad = await tx((c) => addStudents(c, admin, [row(1), row(2, { roll_no: LOGIN.asha.password }), row(3, { branch: 'XYZ' })]), S(admin)).catch((e) => e);
    expect(bad.status).toBe(400);
    expect(bad.extra.problems.join(' ')).toMatch(/already exists.*unknown branch|unknown branch.*already exists/s);
    expect(await tx((c) => listStudents(c, admin, { q: 't1@college-a.example' }), S(admin))).toEqual([]);
    expect(await tx((c) => addStudents(c, admin, [row(1), row(2)]), S(admin))).toEqual({ added: 2 });
    const sub = await localSignIn('t1@college-a.example', '23A91A0510');
    expect((await resolveActor(sub!))?.studentId).toBeTruthy();
  });
  it('fees, payments with receipts, and scholarship credits keep the ledger exact', async () => {
    const admin = await actor('fin.a');
    const [st] = await tx((c) => listStudents(c, admin, { q: 't2@college-a.example' }), S(admin));
    expect(await tx((c) => addFee(c, admin, { target: `student:${st.id}`, academic_year: '2025-26', category: 'tuition', amount: 50000_00, due: istToday(30) }), S(admin))).toEqual({ count: 1 });
    const feeId = (await tx((c) => feeOverview(c, admin, st.id), S(admin))).years[0].rows[0].id;
    await expect(tx((c) => recordPayment(c, admin, st.id, { amount: 60000_00, mode: 'cash', reference: '' }), S(admin))).rejects.toMatchObject({ status: 409 });
    await expect(tx((c) => recordPayment(c, admin, st.id, { amount: 100_00, mode: 'upi', reference: '' }), S(admin))).rejects.toMatchObject({ status: 400 });
    const p = await tx((c) => recordPayment(c, admin, st.id, { amount: 20000_50, mode: 'upi', reference: 'UPI123' }), S(admin));
    expect(p.receipt).toMatch(/^RCPT-\d{4}-\d{6}$/);
    expect((await tx((c) => receipt(c, admin, p.payment_id), S(admin))).lines).toEqual([{ academic_year: '2025-26', category: 'tuition', amount_paise: 20000_50 }]);
    await expect(tx((c) => editFee(c, admin, feeId, { amount: 10000_00, due: istToday(30) }), S(admin))).rejects.toMatchObject({ status: 409 }); // below paid
    const student = (await resolveActor((await localSignIn('t2@college-a.example', '23A91A0520'))!))!;
    expect((await tx((c) => receipt(c, student, p.payment_id), S(student))).p.external_ref).toBe(p.receipt);
    const other = await actor('asha');
    await expect(tx((c) => receipt(c, other, p.payment_id), S(other))).rejects.toMatchObject({ status: 404 });
    // Scholarship: approved -> partial credit keeps status; full credit -> credited.
    const caseId = '00000000-0000-4000-8000-000000000999';
    await asOwner(`insert into scholarship_cases values ($1,$2,$3,$4,'2025-26','approved',$5,0,'test',now(),1)`, [caseId, ID.collegeA, st.id, ID.scheme, 30000_00]);
    await expect(tx((c) => recordScholarshipCredit(c, admin, caseId, { amount: 40000_00, reference: 'SANC-1' }), S(admin))).rejects.toMatchObject({ status: 409 });
    expect((await tx((c) => recordScholarshipCredit(c, admin, caseId, { amount: 10000_00, reference: 'SANC-1' }), S(admin))).status).toBe('approved');
    expect((await tx((c) => recordScholarshipCredit(c, admin, caseId, { amount: 20000_00, reference: 'SANC-2' }), S(admin))).status).toBe('credited');
    const y = (await tx((c) => feeOverview(c, admin, st.id), S(admin))).years[0];
    expect(y.outstanding_paise).toBe(50000_00 - 20000_50 - 30000_00); // negative = credit balance, never clamped
  });
  it('broadcast reaches a whole class', async () => {
    const admin = await actor('fin.a');
    const r = await tx((c) => broadcast(c, admin, { target: `class:${ID.curA}:3:A`, title: 'Lab moved to Friday', body: '' }), S(admin));
    expect(r.sent).toBe(2); // asha + ravi
  });
});

describe('student requests and password', () => {
  it('certificate: request -> approve -> ready; bad transitions refused; leave needs dates', async () => {
    const asha = await actor('asha'), admin = await actor('fin.a');
    const { id } = await tx((c) => createRequest(c, asha, ID.ashaStudent, { kind: 'bonafide', reason: 'Bank education loan' }), S(asha));
    await expect(tx((c) => createRequest(c, asha, ID.ashaStudent, { kind: 'bonafide', reason: 'Again please' }), S(asha))).rejects.toMatchObject({ status: 409 });
    await expect(tx((c) => decideRequest(c, admin, id, { status: 'ready', note: '' }), S(admin))).rejects.toMatchObject({ status: 409 });
    await tx((c) => decideRequest(c, admin, id, { status: 'approved', note: '' }), S(admin));
    expect((await tx((c) => decideRequest(c, admin, id, { status: 'ready', note: '' }), S(admin))).status).toBe('ready');
    expect((await asOwner(`select title from notifications where user_id = $1 and event_key like $2`, [ID.asha, `request:${id}:%`])).map((n) => n.title).sort())
      .toEqual(['Bonafide certificate approved', 'Bonafide certificate is ready']);
    await expect(tx((c) => createRequest(c, asha, ID.ashaStudent, { kind: 'leave', reason: 'Fever', from_date: istToday(-30), to_date: istToday(-29) }), S(asha))).rejects.toMatchObject({ status: 400 });
  });
  it('password change needs the current password (roll number in any case)', async () => {
    const sub = await localSignIn('t1@college-a.example', '23A91A0510');
    const me = (await resolveActor(sub!))!;
    await expect(tx((c) => changePassword(c, me, { current: 'wrong', next: 'NewPass@2026' }), S(me))).rejects.toMatchObject({ status: 400 });
    await tx((c) => changePassword(c, me, { current: '23a91a0510', next: 'NewPass@2026' }), S(me));
    expect(await localSignIn('t1@college-a.example', '23A91A0510')).toBeNull();
    expect(await localSignIn('t1@college-a.example', 'NewPass@2026')).toBe(sub);
  });
});

describe('placement depth', () => {
  it('eligibility is enforced; rounds only for applicants; stats count selections', async () => {
    const ravi = await actor('ravi'), asha = await actor('asha'), place = await actor('place.a');
    expect((await tx((c) => jobDetail(c, ravi, job310, ID.raviStudent), S(ravi))).why).toEqual(['CGPA 7+ required']);
    await expect(tx((c) => track(c, ravi, ID.raviStudent, job310, 'reported_applied'), S(ravi))).rejects.toMatchObject({ status: 409 });
    await expect(tx((c) => setStage(c, place, job310, ID.ashaStudent, 'shortlisted'), S(place))).rejects.toMatchObject({ status: 409 });
    await tx((c) => track(c, asha, ID.ashaStudent, job310, 'reported_applied'), S(asha));
    await tx((c) => setStage(c, place, job310, ID.ashaStudent, 'selected'), S(place));
    expect((await tx((c) => jobDetail(c, asha, job310, ID.ashaStudent), S(asha))).tracking.stage).toBe('selected');
    const s = await tx((c) => placementStats(c, place), S(place));
    expect(s.placed).toBeGreaterThanOrEqual(1);
    expect(s.companies.find((x) => x.company === 'Synthetic Data Corp')?.selected).toBe(1);
  });
});
