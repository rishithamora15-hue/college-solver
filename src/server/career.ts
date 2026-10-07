import { many, one, type Db } from './db';
import type { Actor } from './auth';

// ponytail: fixed vocabulary; extend it when real job descriptions show misses. First name is canonical, the rest are aliases.
const VOCAB: string[][] = [
  ['python'], ['java'], ['c'], ['c++', 'cpp'], ['c#'], ['javascript', 'js'], ['typescript'], ['kotlin'], ['swift'], ['php'], ['golang'], ['dart'], ['matlab'],
  ['html', 'html5'], ['css', 'css3'], ['react', 'react.js', 'reactjs'], ['angular'], ['vue', 'vue.js'], ['next.js', 'nextjs'], ['node.js', 'nodejs'],
  ['express.js', 'expressjs'], ['django'], ['flask'], ['spring boot', 'spring framework'], ['.net', 'asp.net', 'dotnet'], ['rest api', 'rest apis', 'restful'],
  ['graphql'], ['tailwind'], ['bootstrap'],
  ['sql'], ['mysql'], ['postgresql', 'postgres'], ['mongodb'], ['sqlite'], ['excel', 'ms excel'], ['power bi'], ['tableau'], ['statistics'],
  ['data analysis', 'data analytics'], ['pandas'], ['numpy'], ['machine learning', 'ml'], ['deep learning'], ['nlp', 'natural language processing'],
  ['computer vision'], ['tensorflow'], ['pytorch'], ['scikit-learn', 'sklearn'], ['generative ai', 'genai', 'gen ai'], ['llm', 'llms'], ['big data'],
  ['hadoop'], ['spark', 'apache spark'],
  ['aws'], ['azure'], ['gcp', 'google cloud'], ['docker'], ['kubernetes', 'k8s'], ['linux'], ['git', 'github'], ['ci/cd'], ['jenkins'], ['devops'],
  ['cloud computing'],
  ['data structures', 'dsa'], ['algorithms'], ['oop', 'oops', 'object oriented programming'], ['dbms'], ['operating systems'], ['computer networks', 'networking'],
  ['system design'], ['testing', 'software testing', 'manual testing'], ['selenium'], ['automation testing'], ['android'], ['flutter'], ['react native'],
  ['figma'], ['ui/ux', 'ui ux'], ['cyber security', 'cybersecurity'], ['ethical hacking'],
  ['autocad'], ['solidworks'], ['ansys'], ['catia'], ['embedded c'], ['embedded systems'], ['iot', 'internet of things'], ['arduino'], ['raspberry pi'],
  ['vlsi'], ['verilog'], ['plc'], ['pcb design'],
  ['communication', 'communication skills'], ['negotiation'], ['teamwork'], ['leadership'], ['problem solving'], ['presentation', 'presentation skills'],
  ['ms office'], ['powerpoint'], ['sales'], ['marketing'], ['digital marketing'], ['seo'], ['accounting'], ['tally'], ['agile'], ['scrum'], ['jira'],
];
const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const RX = VOCAB.flatMap(([name, ...aka]) => [name, ...aka].map((w) => [name, new RegExp(`(^|[^a-z0-9+#])${esc(w)}(?![a-z0-9+#])`, 'i')] as const));
export const skillsIn = (text: string) => [...new Set(RX.filter(([, rx]) => rx.test(text)).map(([s]) => s))];

/** Skills a job description asks for, and which of them the confirmed resume facts show. */
export function skillMatch(jd: string, facts: { text: string }[]) {
  const have = new Set(facts.flatMap((f) => skillsIn(f.text)));
  const want = skillsIn(jd);
  return { want, have: want.filter((s) => have.has(s)) };
}

/**
 * Published ATS match formula (sums to 100): 70 points for the share of the role's skills that the confirmed resume shows,
 * plus 30 for the sections resume screeners parse. It measures keyword fit, not the chance of being hired.
 * Null when the posting names no skill we recognise: there is no honest score then.
 */
export function atsScore(jd: string, facts: { section: string; text: string }[]) {
  const { want, have } = skillMatch(jd, facts);
  if (!want.length) return null;
  const count = (s: string) => facts.filter((f) => f.section === s).length;
  const sections = [
    { label: 'Education listed', points: 10, ok: count('education') > 0 },
    { label: 'At least 3 skills listed', points: 10, ok: count('skill') >= 3 },
    { label: 'A project or work experience', points: 10, ok: count('project') + count('experience') > 0 },
  ];
  const skillPoints = Math.round((70 * have.length) / want.length);
  return { score: skillPoints + sections.reduce((t, s) => t + (s.ok ? s.points : 0), 0), want, have, missing: want.filter((s) => !have.includes(s)), sections };
}
export const priority = (score: number) => (score >= 70 ? 'High' : score >= 40 ? 'Medium' : 'Low');

/**
 * Every open role scored and ranked (eligible and scored first), plus the missing skills to learn first. A skill's
 * priority is the ATS points it would add, summed over the eligible roles that ask for it.
 */
export function atsReport<J extends { role: string; company: string; jd: string; why: string[] }>(jobs: J[], facts: { section: string; text: string }[]) {
  const roles = jobs.map((job) => ({ job, ats: atsScore(`${job.role}\n${job.jd}`, facts) }))
    .sort((x, y) => +!!x.job.why.length - +!!y.job.why.length || (y.ats?.score ?? -1) - (x.ats?.score ?? -1));
  const learn = new Map<string, { skill: string; roles: string[]; points: number }>();
  for (const { job, ats } of roles) if (ats && !job.why.length) for (const skill of ats.missing) {
    const l = learn.get(skill) ?? { skill, roles: [], points: 0 };
    l.roles.push(`${job.role} · ${job.company}`);
    l.points += 70 / ats.want.length;
    learn.set(skill, l);
  }
  return { roles, learn: [...learn.values()].map((l) => ({ ...l, points: Math.round(l.points) })).sort((a, b) => b.points - a.points || b.roles.length - a.roles.length) };
}

export async function latestConfirmedResume(c: Db, a: Actor, studentId: string) {
  return one<{ id: string; version: number; facts: { items: Fact[] } }>(c, `select id, version, facts from resume_versions
    where college_id = $1 and student_id = $2 and confirmed_at is not null order by version desc limit 1`, [a.collegeId, studentId]);
}

export const SECTIONS = ['summary', 'education', 'skill', 'project', 'experience', 'achievement'] as const;
export type Fact = { id?: string; section: (typeof SECTIONS)[number]; text: string };

// Resume headings, optionally after one qualifier ("Career Objective", "Academic Projects"). 'ignore' drops personal details.
const HEADS = ([['summary', 'summary|objective|profile|about me'], ['education', 'education|academics|qualifications?|academic details'],
  ['skill', 'skills|skill set|technologies|tools'], ['project', 'projects?'], ['experience', 'experience|internships?|employment'],
  ['achievement', 'achievements|awards|certifications?|certificates|honou?rs|activities'],
  ['ignore', 'personal (details|information|profile)|declaration|hobbies|interests|languages known|contact|references']] as const)
  .map(([s, rx]) => [s, new RegExp(`^((career|professional|academic|technical|key|core|educational|work|internship|personal|extra.?curricular|co.?curricular) )?(${rx})$`)] as const);

/** Deterministic extraction preview from pasted or PDF text. The student corrects it before confirming. */
export function extractPreview(text: string): Fact[] {
  let section: Fact['section'] | 'ignore' = 'summary';
  const out: Fact[] = [];
  for (const raw of text.split(/\r?\n/).slice(0, 200)) {
    const line = raw.replace(/^[\s•*\-–●▪◦·►➢✓-]+/, '').trim();
    if (!line) continue;
    const hit = HEADS.find(([, rx]) => rx.test(line.toLowerCase().replace(/[:\s]+$/, '')));
    if (hit) { section = hit[0]; continue; }
    if (section === 'ignore') continue;
    if (section === 'skill') out.push(...line.replace(/^[^:,]{1,30}:\s*/, '').split(/[,;|]/).map((s) => s.trim()).filter(Boolean).map((s) => ({ section: 'skill' as const, text: s.slice(0, 300) })));
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
