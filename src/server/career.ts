import { many, one, type Db } from './db';
import type { Actor } from './auth';

// ponytail: fixed vocabulary; replace with a curated taxonomy when real JDs show misses.
const SKILLS = ['python', 'java', 'c', 'c++', 'javascript', 'typescript', 'sql', 'git', 'react', 'node.js', 'html', 'css', 'excel',
  'communication', 'negotiation', 'docker', 'linux', 'aws', 'data analysis', 'machine learning', 'testing', 'statistics', 'power bi', 'tableau', 'sqlite'];
const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const RX = SKILLS.map((s) => [s, new RegExp(`(^|[^a-z0-9+#])${esc(s)}(?![a-z0-9+#])`, 'i')] as const);
export const skillsIn = (text: string) => RX.filter(([, rx]) => rx.test(text)).map(([s]) => s);

/** Skills a job description asks for, and which of them the confirmed resume facts show. */
export function skillMatch(jd: string, facts: { text: string }[]) {
  const have = new Set(facts.flatMap((f) => skillsIn(f.text)));
  const want = skillsIn(jd);
  return { want, have: want.filter((s) => have.has(s)) };
}

export async function latestConfirmedResume(c: Db, a: Actor, studentId: string) {
  return one<{ id: string; version: number; facts: { items: Fact[] } }>(c, `select id, version, facts from resume_versions
    where college_id = $1 and student_id = $2 and confirmed_at is not null order by version desc limit 1`, [a.collegeId, studentId]);
}

export const SECTIONS = ['summary', 'education', 'skill', 'project', 'experience', 'achievement'] as const;
export type Fact = { id?: string; section: (typeof SECTIONS)[number]; text: string };

/** Deterministic extraction preview from pasted text. The student corrects it before confirming. */
export function extractPreview(text: string): Fact[] {
  let section: Fact['section'] = 'summary';
  const out: Fact[] = [];
  for (const raw of text.split(/\r?\n/).slice(0, 200)) {
    const line = raw.replace(/^[\s•*\-–]+/, '').trim();
    if (!line) continue;
    const head = line.toLowerCase().replace(/[:\s]+$/, '');
    const hit = ([['summary', 'summary|objective|profile'], ['education', 'education|academics'], ['skill', 'skills|technical skills'],
      ['project', 'projects?'], ['experience', 'experience|internships?|work experience'], ['achievement', 'achievements|awards|certifications']] as const)
      .find(([, rx]) => new RegExp(`^(${rx})$`).test(head));
    if (hit) { section = hit[0]; continue; }
    if (section === 'skill') out.push(...line.split(/[,;|]/).map((s) => s.trim()).filter(Boolean).map((s) => ({ section, text: s.slice(0, 300) })));
    else out.push({ section, text: line.slice(0, 300) });
  }
  return out.slice(0, 60);
}

export async function resumeVersions(c: Db, a: Actor, studentId: string) {
  return many(c, `select id, version, facts, confirmed_at, created_at from resume_versions where college_id = $1 and student_id = $2 order by version desc`, [a.collegeId, studentId]);
}

/** New immutable version; fact ids assigned server-side. Only confirmed versions feed analysis. */
export async function saveResumeVersion(c: Db, a: Actor, studentId: string, facts: Fact[], confirm: boolean) {
  await c.query('select pg_advisory_xact_lock(hashtextextended($1, 0))', ['resume:' + studentId]);
  const next = ((await one(c, 'select max(version) v from resume_versions where college_id = $1 and student_id = $2', [a.collegeId, studentId]))?.v ?? 0) + 1;
  const items = facts.map((f, i) => ({ id: `f${i + 1}`, section: f.section, text: f.text }));
  return one(c, `insert into resume_versions (college_id, student_id, version, facts, confirmed_at) values ($1,$2,$3,$4, case when $5 then now() end) returning id, version`,
    [a.collegeId, studentId, next, JSON.stringify({ items }), confirm]);
}
