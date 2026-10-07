// Career readiness: learning path, LMS progress, graded practice and the published readiness rubric.
// Every score is computed from the student's own graded answers or confirmed resume. Unassessed stays unassessed.
import { many, one, type Db } from './db';
import type { Actor } from './auth';
import { AppError, notFound } from './http';
import { skillsIn, type Fact } from './career';
import { COURSES, MODULES, PATHS, TRACKS, type Course, type Dim, type Module, type PathId, type Question, type Round, type Track } from './prep-bank';
import { EXPLAIN } from './prep-explain';

export { COURSES, MODULES, PATHS, TRACKS, type Course, type Dim, type PathId, type Track };
export const WINDOW = 30;     // a track's score uses the latest 30 graded answers, so it reflects recent improvement
export const MIN_ANSWERS = 5; // fewer graded answers than this = not assessed

export type FullQuestion = Question & { module: string; track: Track; round: Round };
export const QUESTIONS: FullQuestion[] = MODULES.flatMap((m) => m.questions.map((q) => ({ ...q, module: m.id, track: m.track, round: q.round ?? m.round })));
const BY_ID = new Map(QUESTIONS.map((q) => [q.id, q]));
const MOD = new Map(MODULES.map((m) => [m.id, m]));

export const DIM_LABEL: Record<Dim, string> = { technical: 'Technical', aptitude: 'Aptitude', communication: 'Communication', interview: 'Interview readiness', resume: 'Resume' };
const TRACK_OF: Record<Exclude<Dim, 'resume'>, Track> = { technical: 'coding', aptitude: 'aptitude', communication: 'communication', interview: 'interview' };

export type Answer = { question_id: string; track: Track; choice: number; correct: boolean };
export type PrepState = { path: PathId | null; answers: Answer[]; read: Set<string>; facts: Fact[] | null };

/** Everything the readiness pages need, newest answers first. */
export async function prepState(c: Db, a: Actor, sid: string): Promise<PrepState> {
  const st = await one(c, 'select learning_path from students where college_id = $1 and id = $2', [a.collegeId, sid]);
  const answers = await many<Answer>(c, `select question_id, track, choice, correct from practice_answers
    where college_id = $1 and student_id = $2 order by answered_at desc, question_id`, [a.collegeId, sid]);
  const read = await many(c, 'select module_id from module_progress where college_id = $1 and student_id = $2', [a.collegeId, sid]);
  const rv = await one(c, `select facts from resume_versions where college_id = $1 and student_id = $2 and confirmed_at is not null
    order by version desc limit 1`, [a.collegeId, sid]);
  return { path: st?.learning_path ?? null, answers, read: new Set(read.map((r) => r.module_id)), facts: rv?.facts.items ?? null };
}

export function trackScore(answers: Answer[], track: Track) {
  const recent = answers.filter((x) => x.track === track).slice(0, WINDOW);
  const k = recent.filter((x) => x.correct).length;
  return { n: recent.length, k, score: recent.length >= MIN_ANSWERS ? Math.round((100 * k) / recent.length) : null };
}

/** Published resume checklist (sums to 100) over the latest confirmed resume version. */
export function resumeChecks(facts: Fact[], pathId: PathId) {
  const p = PATHS[pathId];
  const count = (s: Fact['section']) => facts.filter((f) => f.section === s).length;
  const have = new Set(facts.flatMap((f) => skillsIn(f.text)));
  const relevant = p.skills.filter((s) => have.has(s)).length;
  return [
    { label: 'Education listed', points: 15, ok: count('education') > 0 },
    { label: 'Summary or objective', points: 10, ok: count('summary') > 0 },
    { label: 'At least 3 skills', points: 15, ok: count('skill') >= 3 },
    { label: `At least 2 skills used by a ${p.label}`, points: 15, ok: relevant >= 2 },
    { label: 'At least one project', points: 20, ok: count('project') > 0 },
    { label: 'Internship or work experience', points: 15, ok: count('experience') > 0 },
    { label: 'Achievement or certification', points: 10, ok: count('achievement') > 0 },
  ];
}

export type DimScore = { dim: Dim; label: string; weight: number; score: number | null; basis: string; n: number };

/** Overall = path-weighted average over assessed areas only; `assessed` says how many areas it covers. */
export function readiness(pathId: PathId, s: PrepState) {
  const p = PATHS[pathId];
  const checks = s.facts ? resumeChecks(s.facts, pathId) : [];
  const dims: DimScore[] = (Object.keys(p.weights) as Dim[]).map((dim) => {
    const base = { dim, label: DIM_LABEL[dim], weight: p.weights[dim] };
    if (dim === 'resume') {
      if (!s.facts) return { ...base, score: null, n: 0, basis: 'Confirm a resume version on the Career page' };
      return { ...base, n: checks.length, score: checks.reduce((t, c) => t + (c.ok ? c.points : 0), 0), basis: `${checks.filter((c) => c.ok).length} of ${checks.length} checklist items` };
    }
    const t = trackScore(s.answers, TRACK_OF[dim]);
    return { ...base, n: t.n, score: t.score, basis: t.score === null ? `${t.n} of ${MIN_ANSWERS} answers needed` : `${t.k} of ${t.n} recent answers correct` };
  });
  const done = dims.filter((d) => d.score !== null);
  const w = done.reduce((t, d) => t + d.weight, 0);
  return { overall: w ? Math.round(done.reduce((t, d) => t + d.weight * d.score!, 0) / w) : null, assessed: done.length, dims, checks };
}

export function moduleProgress(m: Module, s: PrepState) {
  const mine = new Map(s.answers.map((x) => [x.question_id, x]));
  const answered = m.questions.filter((q) => mine.has(q.id));
  const correct = answered.filter((q) => mine.get(q.id)!.correct).length;
  const read = s.read.has(m.id);
  return { total: m.questions.length, answered: answered.length, correct, read, done: read && answered.length === m.questions.length };
}

export const pathModules = (pathId: PathId, track?: Track) => PATHS[pathId].modules.map((id) => MOD.get(id)!).filter((m) => !track || m.track === track);
export const moduleHref = (m: Module) => `/prep/${m.track}?m=${m.id}#${m.id}`;

export const courseById = (id: string) => COURSES.find((c) => c.id === id);
export const courseModules = (c: Course) => c.modules.map((id) => MOD.get(id)!);
export const courseOf = (moduleId: string) => COURSES.find((c) => c.modules.includes(moduleId));
/** The course that teaches a resume skill (career.ts vocabulary), if any. */
export const courseForSkill = (skill: string) => COURSES.find((c) => c.skills.includes(skill));
const LEVELS: Course['level'][] = ['Foundation', 'Core', 'Role-specific'];
/** Courses that cover the path's modules: foundations first, then in the path's own module order. */
export const pathCourses = (pathId: PathId) => {
  const order = PATHS[pathId].modules;
  const at = (c: Course) => Math.min(...c.modules.map((m) => order.indexOf(m)).filter((i) => i >= 0));
  return COURSES.filter((c) => c.modules.some((m) => order.includes(m)))
    .sort((x, y) => LEVELS.indexOf(x.level) - LEVELS.indexOf(y.level) || at(x) - at(y));
};
export function courseProgress(c: Course, s: PrepState) {
  const xs = courseModules(c).map((m) => moduleProgress(m, s));
  const sum = (k: 'answered' | 'total' | 'correct') => xs.reduce((t, x) => t + x[k], 0);
  return { done: xs.filter((x) => x.done).length, modules: xs.length, answered: sum('answered'), total: sum('total'), correct: sum('correct') };
}

export type Step = { dim: Dim; label: string; score: number | null; title: string; href: string; reason: string };

/**
 * Rule-based personalised plan: one next step per area, unassessed areas first (they need a baseline), then the weakest
 * score, ties broken by how much the area weighs for the chosen role. Within an area, a module answered poorly
 * (under 60% with 3+ answers) comes back before new modules.
 */
export function trainingPlan(pathId: PathId, s: PrepState, r = readiness(pathId, s)): Step[] {
  const steps: Step[] = [];
  for (const d of r.dims) {
    const at = d.score === null ? `${d.label} is not assessed yet` : `${d.label} is at ${d.score}%`;
    if (d.dim === 'resume') {
      const missing = r.checks.filter((c) => !c.ok).map((c) => c.label.toLowerCase());
      if (d.score === null) steps.push({ ...pick(d), title: 'Confirm your resume facts', href: '/career', reason: `${at}. Add and confirm your resume to get a score.` });
      else if (missing.length) steps.push({ ...pick(d), title: 'Strengthen your resume', href: '/career', reason: `${at}. Missing: ${missing.join('; ')}.` });
      continue;
    }
    const prog = pathModules(pathId, TRACK_OF[d.dim]).map((m) => ({ m, x: moduleProgress(m, s) }));
    const weak = prog.find(({ x }) => !x.done && x.answered >= 3 && x.correct / x.answered < 0.6);
    const next = weak ?? prog.find(({ x }) => !x.done);
    if (!next) continue;
    const why = weak ? `You got ${weak.x.correct} of ${weak.x.answered} right in this module: re-read the key points, then finish it.`
      : d.score === null ? `Answer ${MIN_ANSWERS - d.n} more to get a baseline.` : 'Next module in your course.';
    steps.push({ ...pick(d), title: next.m.title, href: moduleHref(next.m), reason: `${at}. ${why}` });
  }
  return steps.sort((x, y) => (x.score ?? -1) - (y.score ?? -1) || PATHS[pathId].weights[y.dim] - PATHS[pathId].weights[x.dim]);
}
const pick = (d: DimScore) => ({ dim: d.dim, label: d.label, score: d.score });

/** What the browser may see. The answer and explanation are included only once the student has answered. */
export function clientQuestion(q: FullQuestion, mine?: Answer) {
  return {
    id: q.id, q: q.q, code: q.code ?? null, options: q.options, round: q.round,
    result: mine ? { choice: mine.choice, correct: mine.correct, answer: q.answer, why: q.why, explain: EXPLAIN[q.id] ?? null } : null,
  };
}
export type ClientQuestion = ReturnType<typeof clientQuestion>;
export const fullQuestion = (id: string) => BY_ID.get(id);
export const moduleQuestions = (m: Module) => QUESTIONS.filter((q) => q.module === m.id);

export async function setPath(c: Db, a: Actor, sid: string, path: PathId) {
  await c.query('update students set learning_path = $3 where college_id = $1 and id = $2', [a.collegeId, sid, path]);
  return { path };
}

/** First answer is graded and kept; a repeat returns the stored result with recorded = false. */
export async function recordAnswer(c: Db, a: Actor, sid: string, questionId: string, choice: number) {
  const q = BY_ID.get(questionId);
  if (!q) throw notFound();
  if (choice >= q.options.length) throw new AppError(400, 'validation', 'Invalid input', { fields: ['choice'] });
  const ins = await one(c, `insert into practice_answers (college_id, student_id, question_id, track, choice, correct) values ($1,$2,$3,$4,$5,$6)
    on conflict (student_id, question_id) do nothing returning choice, correct`, [a.collegeId, sid, q.id, q.track, choice, choice === q.answer]);
  const row = ins ?? await one(c, 'select choice, correct from practice_answers where college_id = $1 and student_id = $2 and question_id = $3', [a.collegeId, sid, q.id]);
  return { recorded: !!ins, choice: row.choice as number, correct: row.correct as boolean, answer: q.answer, why: q.why, explain: EXPLAIN[q.id] ?? null };
}

export async function markRead(c: Db, a: Actor, sid: string, moduleId: string) {
  if (!MOD.has(moduleId)) throw notFound();
  await c.query('insert into module_progress (college_id, student_id, module_id) values ($1,$2,$3) on conflict do nothing', [a.collegeId, sid, moduleId]);
  return { module_id: moduleId };
}

// ---------- Quiz sessions (self-evaluation) and the progress tracker

export const QUIZ_SIZE = 10;
const shuffle = <T>(xs: T[], rand: () => number) => {
  const a = [...xs];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
};

/** New questions first, then ones answered wrong, then the rest; random within each group (sort is stable). */
export function pickQuiz(pathId: PathId, track: Track, s: PrepState, rand = Math.random) {
  const mine = new Map(s.answers.map((x) => [x.question_id, x]));
  const rank = (id: string) => (!mine.has(id) ? 0 : mine.get(id)!.correct ? 2 : 1);
  return shuffle(pathModules(pathId, track).flatMap(moduleQuestions), rand).sort((x, y) => rank(x.id) - rank(y.id)).slice(0, QUIZ_SIZE).map((q) => q.id);
}

export async function startQuiz(c: Db, a: Actor, sid: string, track: Track) {
  const s = await prepState(c, a, sid);
  if (!s.path) throw new AppError(400, 'choose_path', 'Choose your target role first');
  const ids = pickQuiz(s.path, track, s);
  return one<{ id: string }>(c, `insert into quiz_attempts (college_id, student_id, track, learning_path, question_ids, total) values ($1,$2,$3,$4,$5,$6) returning id`,
    [a.collegeId, sid, track, s.path, ids, ids.length]);
}

export type QuizResult = { question_id: string; choice: number | null; correct: boolean };
export type Attempt = { id: string; track: Track; learning_path: PathId; question_ids: string[]; results: QuizResult[] | null; correct: number | null; total: number; coach_run_id: string | null; created_at: string; submitted_at: string | null };

export async function getAttempt(c: Db, a: Actor, sid: string, id: string, lock = false) {
  const r = await one<Attempt>(c, `select id, track, learning_path, question_ids, results, correct, total, coach_run_id, created_at, submitted_at from quiz_attempts
    where college_id = $1 and student_id = $2 and id = $3${lock ? ' for update' : ''}`, [a.collegeId, sid, id]);
  if (!r) throw notFound();
  return r;
}

/** Grades once. A repeat submit returns the stored result (fresh = false). Unanswered questions count as wrong. */
export async function submitQuiz(c: Db, a: Actor, sid: string, id: string, choices: Record<string, number>) {
  const at = await getAttempt(c, a, sid, id, true);
  if (at.submitted_at) return { attempt: at, fresh: false };
  const results: QuizResult[] = at.question_ids.map((qid) => {
    const q = BY_ID.get(qid)!, choice = choices[qid] ?? null;
    if (choice !== null && (!Number.isInteger(choice) || choice < 0 || choice >= q.options.length)) throw new AppError(400, 'validation', 'Invalid input', { fields: [qid] });
    return { question_id: qid, choice, correct: choice === q.answer };
  });
  for (const r of results.filter((x) => x.choice !== null)) // the first-ever answer to a question also feeds readiness
    await c.query(`insert into practice_answers (college_id, student_id, question_id, track, choice, correct) values ($1,$2,$3,$4,$5,$6) on conflict (student_id, question_id) do nothing`,
      [a.collegeId, sid, r.question_id, at.track, r.choice, r.correct]);
  const done = await one<Attempt>(c, `update quiz_attempts set results = $3, correct = $4, submitted_at = now() where college_id = $1 and id = $2
    returning id, track, learning_path, question_ids, results, correct, total, coach_run_id, created_at, submitted_at`,
  [a.collegeId, id, JSON.stringify(results), results.filter((r) => r.correct).length]);
  return { attempt: done!, fresh: true };
}

export async function quizHistory(c: Db, a: Actor, sid: string) {
  return many<{ id: string; track: Track; correct: number; total: number; submitted_at: string }>(c, `select id, track, correct, total, submitted_at from quiz_attempts
    where college_id = $1 and student_id = $2 and submitted_at is not null order by submitted_at, id`, [a.collegeId, sid]);
}

export const pct = (correct: number, total: number) => (total ? Math.round((100 * correct) / total) : 0);

/** Gaining or lacking: latest quiz score vs the one before it in the same area. */
export function trend(history: { track: Track; correct: number; total: number }[], track: Track) {
  const scores = history.filter((h) => h.track === track).map((h) => pct(h.correct, h.total));
  const latest = scores.at(-1) ?? null, prev = scores.at(-2) ?? null;
  return { scores: scores.slice(-8), latest, delta: latest !== null && prev !== null ? latest - prev : null, best: scores.length ? Math.max(...scores) : null, count: scores.length };
}

/** Deterministic self-evaluation report, shown instantly and used as the coach's ground truth. */
export function quizReport(at: Attempt, previous: number | null) {
  const res = at.results ?? [];
  const score = pct(at.correct ?? 0, at.total);
  const byModule = new Map<string, { id: string; title: string; href: string; correct: number; total: number }>();
  for (const r of res) {
    const m = MOD.get(BY_ID.get(r.question_id)!.module)!;
    const e = byModule.get(m.id) ?? { id: m.id, title: m.title, href: moduleHref(m), correct: 0, total: 0 };
    e.total++; if (r.correct) e.correct++;
    byModule.set(m.id, e);
  }
  const modules = [...byModule.values()];
  const strengths = modules.filter((m) => m.correct / m.total >= 0.8);
  const gaps = modules.filter((m) => m.correct / m.total < 0.6).sort((x, y) => x.correct / x.total - y.correct / y.total);
  const band = score >= 80 ? 'strong' : score >= 60 ? 'steady' : 'needs_work';
  const delta = previous === null ? null : score - previous;
  const headline = band === 'strong' ? `Excellent work: ${score}%. You are in good shape for ${TRACKS[at.track]} rounds.`
    : band === 'steady' ? `Good effort: ${score}%. A little more practice will make this area solid.`
    : `${score}% this time. Let's build this up one module at a time.`;
  const encouragement = delta !== null && delta > 0 ? `Up ${delta} points since your last ${TRACKS[at.track]} quiz. Keep going!`
    : band === 'strong' ? 'Great consistency. Try a quiz in your weakest area next to raise your overall readiness.'
    : delta !== null && delta < 0 ? `Down ${-delta} points from last time. That's normal with new questions: revise the modules below and retake.`
    : 'Every quiz shows exactly what to revise next. Work through the modules below, then retake.';
  return { score, band, headline, encouragement, delta, modules, strengths, gaps };
}
