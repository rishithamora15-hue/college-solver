import { many, one, type Db } from './db';
import type { Actor } from './auth';
import { notFound } from './http';

export const STALE_LISTING_MS = 14 * 86400000;
export type JobFilter = { category?: 'it' | 'non_it'; campus_type?: 'campus' | 'off_campus'; level?: 'fresher' | 'internship'; include_expired?: boolean };

export async function listJobs(c: Db, a: Actor, f: JobFilter) {
  return many(c, `select id, company, role, category, campus_type, level, location, deadline_at, verified_at, is_fictional,
      deadline_at < now() expired, verified_at < now() - interval '14 days' stale
    from opportunities where college_id = $1 and status = 'published'
      and ($2::text is null or category = $2) and ($3::text is null or campus_type = $3) and ($4::text is null or level = $4)
      and ($5 or deadline_at >= now())
    order by deadline_at limit 100`, [a.collegeId, f.category ?? null, f.campus_type ?? null, f.level ?? null, !!f.include_expired]);
}

export async function jobDetail(c: Db, a: Actor, id: string, studentId: string | null) {
  const j = await one(c, `select *, deadline_at < now() expired, verified_at < now() - interval '14 days' stale
    from opportunities where college_id = $1 and id = $2 and status = 'published'`, [a.collegeId, id]);
  if (!j) throw notFound();
  const tracking = studentId ? await one(c, 'select state, updated_at from application_tracking where college_id = $1 and student_id = $2 and opportunity_id = $3', [a.collegeId, studentId, id]) : null;
  return { ...j, tracking };
}

/** Records what the STUDENT did/reported. Opening a link is never recorded as an application. */
export async function track(c: Db, a: Actor, studentId: string, id: string, state: 'link_opened' | 'reported_applied' | 'reported_not_applied') {
  const j = await jobDetail(c, a, id, studentId);
  if (state === 'link_opened' && j.tracking && j.tracking.state !== 'link_opened') return { state: j.tracking.state, apply_url: j.apply_url }; // never downgrade a report
  await c.query(`insert into application_tracking (college_id, student_id, opportunity_id, state) values ($1,$2,$3,$4)
    on conflict (student_id, opportunity_id) do update set state = excluded.state, updated_at = now()`, [a.collegeId, studentId, id, state]);
  return { state, apply_url: j.apply_url };
}
