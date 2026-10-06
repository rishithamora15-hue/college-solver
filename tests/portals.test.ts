// Two portals: credentials, administration-office actions and placement-cell tracking, on real PostgreSQL.
import { describe, expect, it } from 'vitest';
import { ID, LOGIN } from '../scripts/seed';
import { tx } from '../src/server/db';
import { checkPassword, hashPassword, homePath, localSignIn, resolveActor } from '../src/server/auth';
import { findStudents, sendNotice, setCaseStatus, setDocumentState } from '../src/server/admin';
import { createJob, jobStudents, nudge, setJobStatus, track } from '../src/server/jobs';
import { profileSchema } from '../src/server/profile';
import { actor, owner } from './helpers';

const S = (a: { collegeId: string; userId: string }) => ({ collegeId: a.collegeId, userId: a.userId });
const asOwner = async (sql: string, p: unknown[] = []) => { const c = await owner(); try { return (await c.query(sql, p)).rows; } finally { await c.end(); } };
const inbox = (userId: string, like: string) => asOwner('select title, sender from notifications where user_id = $1 and event_key like $2', [userId, like]);

describe('sign-in', () => {
  it('students use college email + roll number; staff land on their portal', async () => {
    expect(await checkPassword('x', await hashPassword('x'))).toBe(true);
    expect(await checkPassword('y', await hashPassword('x'))).toBe(false);
    expect(await checkPassword('x', null)).toBe(false);
    const sub = await localSignIn(LOGIN.asha.email.toUpperCase(), LOGIN.asha.password);
    expect(sub).toBe('demo:asha');
    expect(await localSignIn(LOGIN.asha.email, LOGIN.ravi.password)).toBeNull();
    expect(await localSignIn('nobody@college-a.example', 'x')).toBeNull();
    expect(homePath((await resolveActor(sub!))!)).toBe('/');
    expect(homePath((await resolveActor((await localSignIn(LOGIN.admin.email, LOGIN.admin.password))!))!)).toBe('/admin');
    expect(homePath((await resolveActor((await localSignIn(LOGIN.placement.email, LOGIN.placement.password))!))!)).toBe('/placement');
    expect(await resolveActor((await localSignIn(LOGIN.revoked.email, LOGIN.revoked.password))!)).toBeNull(); // right password, revoked role
  });
  it('mobile number: normalised, validated, clearable', () => {
    expect(profileSchema.parse({ display_name: 'A', phone: '+91 98765-43210' }).phone).toBe('9876543210');
    expect(profileSchema.parse({ display_name: 'A', phone: '9123456789' }).phone).toBe('9123456789');
    expect(profileSchema.parse({ display_name: 'A', phone: '' }).phone).toBe('');
    expect(profileSchema.safeParse({ display_name: 'A', phone: '12345' }).success).toBe(false);
  });
});

describe('administration office', () => {
  it('finds a student by roll number and raises a notice that lands in their inbox', async () => {
    const admin = await actor('fin.a');
    expect(admin.roles).toEqual(['admin']);
    const hits = await tx((c) => findStudents(c, admin, LOGIN.ravi.password.toLowerCase()), S(admin));
    expect(hits.map((h) => h.id)).toEqual([ID.raviStudent]);
    expect(await tx((c) => findStudents(c, admin, '%'), S(admin))).toEqual([]); // LIKE wildcards are literal
    await tx((c) => sendNotice(c, admin, ID.raviStudent, 'Document verification pending', 'Bring your bonafide certificate.'), S(admin));
    expect(await inbox(ID.ravi, 'notice:%')).toContainEqual({ title: 'Document verification pending', sender: 'Administration office' });
  });
  it('document and scholarship updates notify the student; other tenants are invisible', async () => {
    const admin = await actor('fin.a');
    await tx((c) => setDocumentState(c, admin, ID.raviStudent, ID.req2, 'rejected'), S(admin));
    await tx((c) => setDocumentState(c, admin, ID.raviStudent, ID.req2, 'accepted'), S(admin));
    expect((await inbox(ID.ravi, `doc:${ID.req2}:%`)).map((n) => n.title).sort()).toEqual(['Document rejected: Bonafide certificate', 'Document verified: Bonafide certificate']);
    const r = await tx((c) => setCaseStatus(c, admin, ID.caseAsha, 'under_verification', 'Re-checking the batch'), S(admin));
    expect(r.version).toBe(2);
    await tx((c) => setCaseStatus(c, admin, ID.caseAsha, 'approved', ''), S(admin));
    expect(await inbox(ID.asha, `case:${ID.caseAsha}:%`)).toHaveLength(2);
    await expect(tx((c) => setCaseStatus(c, admin, ID.caseMeera, 'approved', ''), S(admin))).rejects.toMatchObject({ status: 404 });
    await expect(tx((c) => sendNotice(c, admin, ID.meeraStudent, 'Hello there', ''), S(admin))).rejects.toMatchObject({ status: 404 });
  });
});

describe('placement cell', () => {
  it('tracks applied / opened / not seen and nudges each group once a day', async () => {
    const place = await actor('place.a');
    const ravi = await actor('ravi');
    const deadline = new Date(Date.now() + 10 * 86400000).toISOString().slice(0, 10);
    const { id } = await tx((c) => createJob(c, place, { company: 'Test Corp', role: 'Analyst', category: 'it', campus_type: 'campus', level: 'fresher',
      location: 'Hyderabad', jd: 'Analyse data and write reports for the team.', eligibility: 'Any', apply_url: 'https://example.org/apply', deadline, notify_students: true }), S(place));
    expect(await inbox(ID.ravi, `job:${id}:new`)).toHaveLength(1);
    await tx((c) => track(c, ravi, ID.raviStudent, id, 'link_opened'), S(ravi));
    const { students } = await tx((c) => jobStudents(c, place, id), S(place));
    expect(students.find((s) => s.id === ID.raviStudent)?.state).toBe('link_opened');
    expect(students.find((s) => s.id === ID.ashaStudent)?.state ?? null).toBeNull();
    expect((await tx((c) => nudge(c, place, id, 'opened'), S(place))).sent).toBe(1);
    expect((await tx((c) => nudge(c, place, id, 'opened'), S(place))).sent).toBe(0); // same day: no spam
    expect((await tx((c) => nudge(c, place, id, 'none'), S(place))).sent).toBeGreaterThanOrEqual(1);
    expect(await inbox(ID.asha, `nudge:${id}:%`)).toHaveLength(1); // asha had not looked; ravi (opened) was nudged by the "opened" group
    expect(await inbox(ID.ravi, `nudge:${id}:%`)).toHaveLength(1);
    await tx((c) => setJobStatus(c, place, id, 'withdrawn'), S(place));
    await expect(tx((c) => nudge(c, place, id, 'none'), S(place))).rejects.toMatchObject({ status: 409 });
  });
});
