// Quiz sessions, the progress tracker, the AI coach (MOCK fixture provider, labelled), faculty PDF indexing and the Gemini adapter.
import { describe, expect, it, vi } from 'vitest';
import { ID } from '../scripts/seed';
import { tx } from '../src/server/db';
import { callGemini } from '../src/server/ai';
import { TransientError } from '../src/server/queue';
import { createRun, getRun } from '../src/server/runs';
import { SPECIALISTS } from '../src/server/specialists';
import { addNote, facultyClasses } from '../src/server/academics';
import {
  QUIZ_SIZE, fullQuestion, getAttempt, pathModules, pickQuiz, prepState, quizHistory, quizReport, setPath, startQuiz, submitQuiz, trend,
  type Attempt, type PrepState,
} from '../src/server/prep';
import { actor, drain } from './helpers';
import { tinyPdf } from './pdf-fixture';

const S = (a: { collegeId: string; userId: string }) => ({ collegeId: a.collegeId, userId: a.userId });

describe('quiz rules', () => {
  it('picks new questions first, then ones answered wrong, never more than QUIZ_SIZE', () => {
    const pool = pathModules('business', 'aptitude').flatMap((m) => m.questions.map((q) => q.id));
    const seen: PrepState = { path: 'business', read: new Set(), facts: null,
      answers: pool.slice(0, pool.length - 3).map((id, i) => ({ question_id: id, track: 'aptitude' as const, choice: 0, correct: i % 2 === 0 })) };
    const ids = pickQuiz('business', 'aptitude', seen);
    expect(ids).toHaveLength(QUIZ_SIZE);
    expect(ids.slice(0, 3).sort()).toEqual(pool.slice(-3).sort()); // the 3 unseen come first
    const wrong = new Set(seen.answers.filter((x) => !x.correct).map((x) => x.question_id));
    expect(ids.slice(3).every((id) => wrong.has(id))).toBe(true); // then wrong ones (enough of them to fill)
  });
  it('trend shows gaining or lacking against the previous quiz in the same area', () => {
    const h = [{ track: 'aptitude' as const, correct: 4, total: 10 }, { track: 'coding' as const, correct: 9, total: 10 }, { track: 'aptitude' as const, correct: 7, total: 10 }];
    expect(trend(h, 'aptitude')).toMatchObject({ latest: 70, delta: 30, best: 70, count: 2, scores: [40, 70] });
    expect(trend(h, 'coding')).toMatchObject({ latest: 90, delta: null });
    expect(trend(h, 'interview')).toMatchObject({ latest: null, count: 0 });
  });
  it('report: weak modules become next steps; strong score and improvement get encouragement', () => {
    const qs = pathModules('software', 'aptitude').flatMap((m) => m.questions).slice(0, 10);
    const at = (correct: (i: number) => boolean): Attempt => ({ id: 'x', track: 'aptitude', learning_path: 'software', question_ids: qs.map((q) => q.id), total: 10, coach_run_id: null,
      created_at: '', submitted_at: 'now', results: qs.map((q, i) => ({ question_id: q.id, choice: 0, correct: correct(i) })), correct: qs.filter((_, i) => correct(i)).length });
    const low = quizReport(at((i) => i >= 8), null);
    expect(low).toMatchObject({ score: 20, band: 'needs_work', delta: null });
    expect(low.gaps[0]).toMatchObject({ id: 'apt-arith', href: '/prep/aptitude?m=apt-arith#apt-arith' });
    const high = quizReport(at(() => true), 50);
    expect(high).toMatchObject({ score: 100, band: 'strong', delta: 50, gaps: [] });
    expect(high.encouragement).toContain('Up 50 points');
  });
  it('coach verifier rejects unknown modules and percentages that are not in the quiz data', () => {
    const t = { context: { modules: [{ id: 'apt-arith' }], score_percent: 60 }, evidence: [], receipts: [] };
    const ok = { summary: 'You scored 60%.', strengths: [], gaps: [{ module_id: 'apt-arith', text: 'Revise' }], next_steps: [{ module_id: 'apt-arith', action: 'Re-read' }], encouragement: 'Keep going' };
    expect(SPECIALISTS.coach.verify(ok, t)).toEqual([]);
    expect(SPECIALISTS.coach.verify({ ...ok, summary: 'You scored 95%.' }, t)).toContain('percentage 95% is not in the quiz data');
    expect(SPECIALISTS.coach.verify({ ...ok, next_steps: [{ module_id: 'made-up', action: 'x' }] }, t)).toContain('unknown module_id made-up');
    expect(SPECIALISTS.coach.verify({ ...ok, encouragement: 'Your selection chance is high' }, t)).toContain('no hiring predictions');
  });
});

describe('quiz sessions through PostgreSQL', () => {
  it('needs a path, grades once on the server, feeds readiness, and the coach reviews it', async () => {
    const ravi = await actor('ravi'), sid = ID.raviStudent;
    await expect(tx((c) => startQuiz(c, ravi, sid, 'aptitude'), S(ravi))).rejects.toMatchObject({ status: 400, code: 'choose_path' });
    await tx((c) => setPath(c, ravi, sid, 'business'), S(ravi));
    const { id } = (await tx((c) => startQuiz(c, ravi, sid, 'aptitude'), S(ravi)))!;
    const at = await tx((c) => getAttempt(c, ravi, sid, id), S(ravi));
    expect(at).toMatchObject({ total: QUIZ_SIZE, submitted_at: null, results: null });
    const allowed = new Set(pathModules('business', 'aptitude').flatMap((m) => m.questions.map((q) => q.id)));
    expect(at.question_ids.every((q) => allowed.has(q))).toBe(true);

    const qs = at.question_ids.map((q) => fullQuestion(q)!);
    const answers = Object.fromEntries(qs.slice(0, 8).map((q, i) => [q.id, i < 6 ? q.answer : (q.answer + 1) % q.options.length]));
    await expect(tx((c) => submitQuiz(c, ravi, sid, id, { [qs[0].id]: 9 }), S(ravi))).rejects.toMatchObject({ status: 400 });
    expect(await tx((c) => submitQuiz(c, ravi, sid, id, answers), S(ravi))).toMatchObject({ fresh: true, attempt: { correct: 6, total: 10 } });
    const allRight = Object.fromEntries(qs.map((q) => [q.id, q.answer]));
    expect(await tx((c) => submitQuiz(c, ravi, sid, id, allRight), S(ravi))).toMatchObject({ fresh: false, attempt: { correct: 6 } }); // graded once
    expect((await tx((c) => prepState(c, ravi, sid), S(ravi))).answers.filter((x) => x.track === 'aptitude')).toHaveLength(8); // 2 skipped

    const run = await tx((c) => createRun(c, ravi, sid, 'coach', { attempt_id: id }), S(ravi));
    await drain();
    const coach = await tx((c) => getRun(c, ravi, run.run_id), S(ravi));
    expect(coach).toMatchObject({ state: 'completed', live_ai: false, provider: 'fixture' });
    const ids = new Set(coach.result.modules.map((m: any) => m.id));
    expect(coach.result.next_steps.every((s: any) => ids.has(s.module_id))).toBe(true);

    const next = (await tx((c) => startQuiz(c, ravi, sid, 'aptitude'), S(ravi)))!;
    const second = await tx((c) => getAttempt(c, ravi, sid, next.id), S(ravi));
    expect(second.question_ids.some((q) => q in answers)).toBe(false); // 17 unseen remain, so none repeat
    expect((await tx((c) => quizHistory(c, ravi, sid), S(ravi))).map((h) => h.id)).toEqual([id]); // unsubmitted quizzes are not history

    const meera = await actor('meera');
    await expect(tx((c) => getAttempt(c, meera, ID.meeraStudent, id), S(meera))).rejects.toMatchObject({ status: 404 });
  });
});

describe('faculty PDF notes', () => {
  it('text PDFs become citable sections with real page numbers; the tutor answers from them', async () => {
    const kavya = await actor('kavya');
    const [k] = await tx((c) => facultyClasses(c, kavya), S(kavya));
    const r = await tx((c) => addNote(c, kavya, k.id, { title: 'Replication notes', kind: 'material', exam_year: null, mime: 'application/pdf',
      bytes: tinyPdf(['Replication overview.', 'Quorum consensus needs a majority of replicas to agree.']) }), S(kavya));
    expect(r.searchable_sections).toBe(2);
    const bad = await tx((c) => addNote(c, kavya, k.id, { title: 'Scan', kind: 'material', exam_year: null, mime: 'application/pdf', bytes: Buffer.from('%PDF-1.4 not really') }), S(kavya));
    expect(bad.searchable_sections).toBe(0); // stored for download, not searchable

    const asha = await actor('asha');
    const run = await tx((c) => createRun(c, asha, ID.ashaStudent, 'tutor', { curriculum_subject_id: ID.csDbms, question: 'what is quorum consensus' }), S(asha));
    await drain();
    const got = await tx((c) => getRun(c, asha, run.run_id), S(asha));
    expect(got.result).toMatchObject({ from_notes: true });
    expect(got.result.sources[0]).toMatchObject({ document_id: r.id, page: 2 });
  });
});

describe('gemini adapter (stubbed network; no key used)', () => {
  const m = { system: 'sys', user: 'usr', maxTokens: 100, signal: new AbortController().signal, fixture: () => ({}) };
  const reply = (body: unknown, status = 200) => async () => new Response(JSON.stringify(body), { status });
  it('sends the key in a header, asks for JSON, skips thought parts, and maps errors', async () => {
    const seen: [string, RequestInit][] = [];
    try {
      vi.stubGlobal('fetch', async (url: string, init: RequestInit) => {
        seen.push([url, init]);
        return reply({ candidates: [{ content: { parts: [{ text: 'thinking…', thought: true }, { text: '{"ok":1}' }] } }], usageMetadata: { promptTokenCount: 5, candidatesTokenCount: 3 }, modelVersion: 'gemini-test' })();
      });
      expect(await callGemini(m, 'SECRET-KEY', 'gemini-3.8-flash')).toEqual({ text: '{"ok":1}', inputTokens: 5, outputTokens: 3, model: 'gemini-test', provider: 'gemini' });
      expect(seen[0][0]).toBe('https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent');
      expect((seen[0][1].headers as Record<string, string>)['x-goog-api-key']).toBe('SECRET-KEY');
      const sent = JSON.parse(seen[0][1].body as string);
      expect(sent).toMatchObject({ systemInstruction: { parts: [{ text: 'sys' }] }, contents: [{ role: 'user', parts: [{ text: 'usr' }] }], generationConfig: { responseMimeType: 'application/json' } });
      vi.stubGlobal('fetch', reply({}, 429));
      await expect(callGemini(m, 'k', 'x')).rejects.toBeInstanceOf(TransientError);
      vi.stubGlobal('fetch', reply({}, 400));
      await expect(callGemini(m, 'k', 'x')).rejects.toThrow('provider_error_400');
      vi.stubGlobal('fetch', reply({ candidates: [{ finishReason: 'SAFETY', content: { parts: [] } }] }));
      await expect(callGemini(m, 'k', 'x')).rejects.toThrow('provider_empty_SAFETY');
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
