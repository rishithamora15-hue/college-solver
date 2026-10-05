// Real PostgreSQL. Two tenants, multiple students, revoked role, guessed IDs, private links, RLS.
import { describe, expect, it } from 'vitest';
import { ID } from '../scripts/seed';
import { tx } from '../src/server/db';
import { feeOverview, scholarshipDetail } from '../src/server/finance';
import { downloadLink, retrieve, signFileToken, subjectAccess, studentSubjects, verifyFileToken } from '../src/server/learn';
import { jobDetail, listJobs } from '../src/server/jobs';
import { complaintView } from '../src/server/complaints';
import { getRun } from '../src/server/runs';
import { profileSchema } from '../src/server/profile';
import { signSession, verifySession } from '../src/server/auth';
import { actor } from './helpers';

const scoped = <T>(a: { collegeId: string; userId: string }, fn: Parameters<typeof tx<T>>[0]) => tx(fn, { collegeId: a.collegeId, userId: a.userId });

describe('identity and roles', () => {
  it('derives tenant and roles server-side; revoked role has no access', async () => {
    const asha = await actor('asha');
    expect(asha).toMatchObject({ collegeId: ID.collegeA, studentId: ID.ashaStudent, roles: ['student'] });
    expect((await actor('meera')).collegeId).toBe(ID.collegeB);
    expect(await actor('revoked.a')).toBeNull();
    expect(await actor('nobody')).toBeNull();
  });
  it('session tokens: tampered/expired rejected', () => {
    const t = signSession('demo:asha');
    expect(verifySession(t)).toBe('demo:asha');
    expect(verifySession(t.slice(0, -2) + 'xx')).toBeNull();
    expect(verifySession(signSession('demo:asha', -1))).toBeNull();
  });
  it('profile edit schema rejects role/tenant fields', () => {
    expect(profileSchema.safeParse({ display_name: 'A' }).success).toBe(true);
    expect(profileSchema.safeParse({ display_name: 'A', role: 'college_admin' }).success).toBe(false);
    expect(profileSchema.safeParse({ display_name: 'A', college_id: ID.collegeB }).success).toBe(false);
  });
  it('runtime role cannot grant itself staff membership (RLS with check false)', async () => {
    const asha = await actor('asha');
    await expect(scoped(asha, (c) => c.query(`insert into memberships values ($1,$2,'finance_staff','active')`, [ID.collegeA, asha.userId]))).rejects.toThrow();
    await expect(scoped(asha, (c) => c.query(`update memberships set role = 'college_admin' where user_id = $1`, [asha.userId]))).rejects.toThrow(/row-level security/);
  });
});

describe('object-level authorization with guessed IDs', () => {
  it('fees and scholarship cases are own-only and tenant-only', async () => {
    const asha = await actor('asha');
    const fees = await scoped(asha, (c) => feeOverview(c, asha, ID.ashaStudent));
    expect(fees.years[0].outstanding_paise).toBe(115000_00); // 1,00,000 tuition + 15,000 transport
    expect(fees.years[0].expected_uncredited_paise).toBe(80000_00);
    await expect(scoped(asha, (c) => scholarshipDetail(c, asha, ID.ashaStudent, ID.caseRavi))).rejects.toMatchObject({ status: 404 });
    await expect(scoped(asha, (c) => scholarshipDetail(c, asha, ID.ashaStudent, ID.caseMeera))).rejects.toMatchObject({ status: 404 });
    // Even passing another student's id as the "own" id: RLS keeps other-tenant rows invisible.
    const meera = await scoped(asha, (c) => feeOverview(c, asha, ID.meeraStudent));
    expect(meera.years).toEqual([]);
  });
  it('RLS hides other-tenant rows even for a raw query', async () => {
    const asha = await actor('asha');
    const r = await scoped(asha, (c) => c.query('select count(*)::int n from fee_assessments where student_id = $1', [ID.meeraStudent]));
    expect(r.rows[0].n).toBe(0);
    const unscoped = await tx((c) => c.query('select count(*)::int n from fee_assessments'));
    expect(unscoped.rows[0].n).toBe(0);
  });
  it('complaints, runs and jobs: guessed ids return not found', async () => {
    const asha = await actor('asha');
    await expect(scoped(asha, (c) => complaintView(c, asha, '00000000-0000-4000-8000-999999999999'))).rejects.toMatchObject({ status: 404 });
    await expect(scoped(asha, (c) => getRun(c, asha, '00000000-0000-4000-8000-999999999999'))).rejects.toMatchObject({ status: 404 });
    await expect(scoped(asha, (c) => jobDetail(c, asha, ID.jobB, ID.ashaStudent))).rejects.toMatchObject({ status: 404 });
  });
});

describe('learning scope', () => {
  it('backlog subject from an earlier semester is accessible; other tenant curriculum is not', async () => {
    const asha = await actor('asha');
    const subs = await scoped(asha, (c) => studentSubjects(c, asha, ID.ashaStudent));
    expect(subs.find((s) => s.id === ID.csC)).toMatchObject({ backlog: true, semester: 2 });
    await expect(scoped(asha, (c) => subjectAccess(c, asha, ID.ashaStudent, ID.csDbmsB))).rejects.toMatchObject({ status: 404 });
  });
  it('retrieval never returns another tenant or another subject', async () => {
    const asha = await actor('asha');
    const s = await scoped(asha, (c) => subjectAccess(c, asha, ID.ashaStudent, ID.csDbms));
    const hits = await scoped(asha, (c) => retrieve(c, asha, s, 'normalization boyce codd college pointers'));
    expect(hits.length).toBeGreaterThan(0);
    expect(hits.every((h) => h.document_id === ID.docDbms)).toBe(true);
    expect(JSON.stringify(hits)).not.toContain('COLLEGE-B-ONLY');
  });
  it('download links: unauthorized document denied; tokens bound to user and expiry', async () => {
    const asha = await actor('asha');
    const link = await scoped(asha, (c) => downloadLink(c, asha, ID.ashaStudent, ID.paperDbms24));
    expect(link).toMatch(/^\/api\/v1\/files\//);
    expect(verifyFileToken(link.split('/').pop()!, asha.userId)).toBe(ID.paperDbms24);
    expect(verifyFileToken(link.split('/').pop()!, ID.ravi)).toBeNull();
    expect(verifyFileToken(signFileToken(ID.paperDbms24, asha.userId, -1), asha.userId)).toBeNull();
    await expect(scoped(asha, (c) => downloadLink(c, asha, ID.ashaStudent, ID.docB))).rejects.toMatchObject({ status: 404 });
  });
});

describe('jobs', () => {
  it('lists all categories, hides expired by default, labels fictional', async () => {
    const asha = await actor('asha');
    const all = await scoped(asha, (c) => listJobs(c, asha, {}));
    const combos = new Set(all.map((j) => `${j.category}/${j.campus_type}/${j.level}`));
    expect(combos.size).toBeGreaterThanOrEqual(6);
    expect(all.some((j) => j.id === ID.jobExpired)).toBe(false);
    expect(all.every((j) => j.is_fictional)).toBe(true);
    const withExpired = await scoped(asha, (c) => listJobs(c, asha, { include_expired: true }));
    expect(withExpired.find((j) => j.id === ID.jobExpired)?.expired).toBe(true);
    const it = await scoped(asha, (c) => listJobs(c, asha, { category: 'non_it', level: 'internship' }));
    expect(it.every((j) => j.category === 'non_it' && j.level === 'internship')).toBe(true);
  });
});

