// Placement prep: question bank integrity, the published readiness rubric, the training plan, and graded answers in PostgreSQL.
import { describe, expect, it } from 'vitest';
import { ID } from '../scripts/seed';
import { tx } from '../src/server/db';
import { skillsIn, type Fact } from '../src/server/career';
import {
  MIN_ANSWERS, MODULES, PATHS, QUESTIONS, TRACKS, WINDOW, clientQuestion, markRead, pathModules, prepState, readiness, recordAnswer,
  setPath, trackScore, trainingPlan, type Answer, type PrepState, type Track,
} from '../src/server/prep';
import { actor } from './helpers';

const S = (a: { collegeId: string; userId: string }) => ({ collegeId: a.collegeId, userId: a.userId });
const answers = (track: Track, correct: boolean[], prefix = 'x') => correct.map((ok, i): Answer => ({ question_id: `${prefix}${i}`, track, choice: 0, correct: ok }));
const state = (p: Partial<PrepState>): PrepState => ({ path: 'software', answers: [], read: new Set(), facts: null, ...p });
const ashaFacts: Fact[] = [
  { section: 'education', text: 'B.Tech CSE (2nd year), Synthetic Institute of Technology A' }, { section: 'skill', text: 'Python' },
  { section: 'skill', text: 'SQL' }, { section: 'project', text: 'built a library management app using python and sqlite' },
];

describe('question bank', () => {
  it('is well formed: unique ids tied to their module, a valid answer, distinct options', () => {
    expect(new Set(QUESTIONS.map((q) => q.id)).size).toBe(QUESTIONS.length);
    for (const q of QUESTIONS) {
      expect(q.id.startsWith(q.module + '.'), q.id).toBe(true);
      expect(q.options.length, q.id).toBeGreaterThanOrEqual(3);
      expect(new Set(q.options).size, q.id).toBe(q.options.length);
      expect(q.answer >= 0 && q.answer < q.options.length, q.id).toBe(true);
    }
  });
  it('every path has known modules, weights summing to 100, matchable skills, and enough questions per track to be assessed', () => {
    for (const [id, p] of Object.entries(PATHS)) {
      expect(Object.values(p.weights).reduce((t, w) => t + w, 0), id).toBe(100);
      for (const m of p.modules) expect(MODULES.some((x) => x.id === m), m).toBe(true);
      for (const s of p.skills) expect(skillsIn(s), s).toContain(s);
      for (const t of Object.keys(TRACKS) as Track[])
        expect(QUESTIONS.filter((q) => q.track === t && p.modules.includes(q.module)).length, `${id}/${t}`).toBeGreaterThanOrEqual(MIN_ANSWERS);
    }
  });
  it('questions vary with the learning path', () => {
    const coding = (p: keyof typeof PATHS) => pathModules(p, 'coding').map((m) => m.id);
    expect(coding('software')).toContain('cod-dsa');
    expect(coding('qa')).toContain('cod-testing');
    expect(coding('data')).toContain('cod-stats');
    expect(coding('business')).toEqual(['cod-excel']);
  });
});

describe('readiness rubric', () => {
  it('a track is assessed only after MIN_ANSWERS and scores just the latest WINDOW answers', () => {
    expect(trackScore(answers('aptitude', [true, true, true, true]), 'aptitude').score).toBeNull();
    expect(trackScore(answers('aptitude', [true, true, true, false, false]), 'aptitude').score).toBe(60);
    const recentWrong = answers('coding', Array(WINDOW).fill(false)), oldRight = answers('coding', Array(10).fill(true), 'old');
    expect(trackScore([...recentWrong, ...oldRight], 'coding')).toMatchObject({ n: WINDOW, score: 0 });
  });
  it('job readiness is the path-weighted average of assessed areas only', () => {
    const s = state({ answers: [...answers('aptitude', [true, true, true, true, false]), ...answers('coding', [true, false, true, false, true, false, true, false, true, false])] });
    // aptitude 80 (weight 20) + technical 50 (weight 35) => 3350 / 55 = 60.9
    expect(readiness('software', s)).toMatchObject({ overall: 61, assessed: 2 });
    expect(readiness('software', s).dims.find((d) => d.dim === 'communication')!.score).toBeNull();
    expect(readiness('software', state({})).overall).toBeNull();
  });
  it('resume is scored from the published checklist and the target role', () => {
    expect(readiness('software', state({ facts: ashaFacts })).dims.find((d) => d.dim === 'resume')!.score).toBe(50);
    expect(readiness('business', state({ path: 'business', facts: ashaFacts })).dims.find((d) => d.dim === 'resume')!.score).toBe(35);
  });
  it('plan: unassessed areas first (heavier first), then weakest; a poorly answered module comes back', () => {
    const arith = QUESTIONS.filter((q) => q.module === 'apt-arith').slice(0, 5);
    const s = state({ answers: arith.map((q, i) => ({ question_id: q.id, track: 'aptitude' as const, choice: 0, correct: i === 0 })) });
    const plan = trainingPlan('software', s);
    expect(plan[0]).toMatchObject({ dim: 'technical', score: null, href: '/prep/coding?m=cod-dsa#cod-dsa' });
    expect(plan.at(-1)).toMatchObject({ dim: 'aptitude', score: 20, title: MODULES.find((m) => m.id === 'apt-arith')!.title });
    expect(plan.at(-1)!.reason).toContain('1 of 5 right');
    expect(plan.find((p) => p.dim === 'resume')).toMatchObject({ href: '/career', title: 'Confirm your resume facts' });
  });
  it('never sends the answer or explanation for an unanswered question', () => {
    const q = QUESTIONS[0];
    const out = clientQuestion(q);
    expect(out.result).toBeNull();
    expect(JSON.stringify(out)).not.toContain(q.why);
    expect(out).not.toHaveProperty('answer');
  });
});

describe('practice answers through PostgreSQL', () => {
  it('grades on the server, keeps the first answer, and stays inside the tenant', async () => {
    const asha = await actor('asha');
    await tx((c) => setPath(c, asha, ID.ashaStudent, 'software'), S(asha));
    const q = QUESTIONS.find((x) => x.id === 'apt-arith.1')!;
    const wrong = (q.answer + 1) % q.options.length;
    expect(await tx((c) => recordAnswer(c, asha, ID.ashaStudent, q.id, wrong), S(asha))).toMatchObject({ recorded: true, correct: false, answer: q.answer });
    // A retry with the right answer cannot replace the graded one.
    expect(await tx((c) => recordAnswer(c, asha, ID.ashaStudent, q.id, q.answer), S(asha))).toMatchObject({ recorded: false, correct: false, choice: wrong });
    await expect(tx((c) => recordAnswer(c, asha, ID.ashaStudent, 'no-such.1', 0), S(asha))).rejects.toMatchObject({ status: 404 });
    await expect(tx((c) => recordAnswer(c, asha, ID.ashaStudent, q.id, q.options.length), S(asha))).rejects.toMatchObject({ status: 400 });
    await expect(tx((c) => markRead(c, asha, ID.ashaStudent, 'no-such'), S(asha))).rejects.toMatchObject({ status: 404 });
    await tx((c) => markRead(c, asha, ID.ashaStudent, 'apt-arith'), S(asha));
    await tx((c) => markRead(c, asha, ID.ashaStudent, 'apt-arith'), S(asha));

    const mine = await tx((c) => prepState(c, asha, ID.ashaStudent), S(asha));
    expect(mine).toMatchObject({ path: 'software', answers: [{ question_id: q.id, track: 'aptitude', choice: wrong, correct: false }] });
    expect([...mine.read]).toEqual(['apt-arith']);
    expect(mine.facts).toHaveLength(4);

    const meera = await actor('meera'); // other college asking for Asha's records
    expect(await tx((c) => prepState(c, meera, ID.ashaStudent), S(meera))).toMatchObject({ path: null, answers: [], facts: null });
    await expect(tx((c) => c.query('update practice_answers set correct = true where student_id = $1', [ID.ashaStudent]), S(asha))).rejects.toThrow(/permission denied/);
  });
});
