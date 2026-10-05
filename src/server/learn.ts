import { createHmac, timingSafeEqual } from 'node:crypto';
import { many, one, type Db } from './db';
import type { Actor } from './auth';
import { env } from './env';
import { notFound } from './http';

/** Subjects a student may study: own curriculum, semester <= current, plus active backlogs. */
export async function studentSubjects(c: Db, a: Actor, studentId: string) {
  return many(c, `select cs.id, cs.semester, s.code, s.name, cu.regulation, b.code branch,
      exists (select 1 from backlogs bl where bl.student_id = st.id and bl.curriculum_subject_id = cs.id and bl.status = 'active') backlog,
      cs.semester = st.current_semester is_current
    from students st
    join curricula cu on cu.id = st.curriculum_id and cu.college_id = st.college_id
    join branches b on b.id = cu.branch_id and b.college_id = cu.college_id
    join curriculum_subjects cs on cs.curriculum_id = cu.id and cs.college_id = cu.college_id
    join subjects s on s.id = cs.subject_id and s.college_id = cs.college_id
    where st.college_id = $1 and st.id = $2
      and (cs.semester <= st.current_semester or exists (select 1 from backlogs bl where bl.student_id = st.id and bl.curriculum_subject_id = cs.id and bl.status = 'active'))
    order by cs.semester desc, s.code`, [a.collegeId, studentId]);
}

export type SubjectScope = { id: string; curriculum_id: string; subject_id: string; name: string; code: string; semester: number };
export async function subjectAccess(c: Db, a: Actor, studentId: string, curriculumSubjectId: string): Promise<SubjectScope> {
  const ok = (await studentSubjects(c, a, studentId)).some((s) => s.id === curriculumSubjectId);
  const s = ok && await one(c, `select cs.id, cs.curriculum_id, cs.subject_id, s.name, s.code, cs.semester from curriculum_subjects cs
    join subjects s on s.id = cs.subject_id and s.college_id = cs.college_id where cs.college_id = $1 and cs.id = $2`, [a.collegeId, curriculumSubjectId]);
  if (!s) throw notFound();
  return s;
}

export async function topics(c: Db, a: Actor, csId: string) {
  return many(c, 'select id, name from topics where college_id = $1 and curriculum_subject_id = $2 order by position', [a.collegeId, csId]);
}

/** Tenant + curriculum + subject filter is applied BEFORE ranking. Keyword OR-query over alphanumeric tokens only. */
export async function retrieve(c: Db, a: Actor, s: SubjectScope, question: string, limit = 6) {
  const words = [...new Set(question.toLowerCase().match(/[a-z0-9]{2,}/g) ?? [])].slice(0, 30);
  if (!words.length) return [];
  return many<{ id: string; document_id: string; title: string; revision: string; page: number; section: string; body: string }>(c, `
    select dc.id, dc.document_id, d.title, d.revision, dc.page, dc.section, dc.body
    from document_chunks dc join documents d on d.id = dc.document_id and d.college_id = dc.college_id
    where dc.college_id = $1 and dc.curriculum_id = $2 and dc.subject_id = $3 and d.status = 'published' and d.kind = 'material'
      and dc.tsv @@ to_tsquery('english', $4)
    order by ts_rank(dc.tsv, to_tsquery('english', $4)) desc limit $5`, [a.collegeId, s.curriculum_id, s.subject_id, words.join(' | '), limit]);
}

export async function documentsFor(c: Db, a: Actor, studentId: string, kind: 'material' | 'paper', f: { csId?: string; year?: number } = {}) {
  const subs = (await studentSubjects(c, a, studentId)).filter((s) => !f.csId || s.id === f.csId).map((s) => s.id);
  if (!subs.length) return [];
  return many(c, `select d.id, d.title, d.revision, d.exam_year, d.source, d.license, s.name subject, cs.id cs_id
    from documents d join curriculum_subjects cs on cs.curriculum_id = d.curriculum_id and cs.subject_id = d.subject_id and cs.college_id = d.college_id
    join subjects s on s.id = d.subject_id and s.college_id = d.college_id
    where d.college_id = $1 and d.status = 'published' and d.kind = $2 and cs.id = any($3::uuid[]) and ($4::int is null or d.exam_year = $4)
    order by d.exam_year desc nulls last, d.title`, [a.collegeId, kind, subs, f.year ?? null]);
}

/** Re-authorizes the document for this student, then issues a 60 s link bound to user + document. */
export async function downloadLink(c: Db, a: Actor, studentId: string, documentId: string) {
  const all = [...await documentsFor(c, a, studentId, 'material'), ...await documentsFor(c, a, studentId, 'paper')];
  if (!all.some((d) => d.id === documentId)) throw notFound();
  return `/api/v1/files/${signFileToken(documentId, a.userId)}`;
}

const fmac = (d: string) => createHmac('sha256', env().SESSION_SECRET).update('file:' + d).digest('base64url');
export function signFileToken(documentId: string, userId: string, ttlS = 60) {
  const data = Buffer.from(JSON.stringify({ d: documentId, u: userId, e: Math.floor(Date.now() / 1000) + ttlS })).toString('base64url');
  return `${data}.${fmac(data)}`;
}
export function verifyFileToken(token: string, userId: string): string | null {
  const [data, sig] = token.split('.');
  if (!data || !sig) return null;
  const w = Buffer.from(fmac(data)), g = Buffer.from(sig);
  if (w.length !== g.length || !timingSafeEqual(w, g)) return null;
  try {
    const t = JSON.parse(Buffer.from(data, 'base64url').toString());
    return t.u === userId && t.e > Date.now() / 1000 ? t.d : null;
  } catch { return null; }
}
