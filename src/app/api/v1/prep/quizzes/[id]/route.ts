import { z } from 'zod';
import { AppError, body, json, requireActor, requireStudent, route, scoped, uuidParam } from '@/server/http';
import { submitQuiz } from '@/server/prep';
import { createRun } from '@/server/runs';

const schema = z.object({ answers: z.record(z.string().max(40), z.number().int().min(0).max(9)) }).strict();

/** Submit once; a repeat returns the same graded attempt. The AI coach starts if AI is available, otherwise the rules report stands alone. */
export const POST = route(async (req, { params }: { params: Promise<{ id: string }> }) => {
  const a = await requireActor(req);
  const sid = requireStudent(a);
  const id = uuidParam((await params).id);
  const { answers } = await body(req, schema);
  return json(await scoped(a, async (c) => {
    const { attempt, fresh } = await submitQuiz(c, a, sid, id, answers);
    if (!fresh) return { id, coach_run_id: attempt.coach_run_id };
    const run = await createRun(c, a, sid, 'coach', { attempt_id: id }).catch((e) => { if (e instanceof AppError) return null; throw e; });
    if (run) await c.query('update quiz_attempts set coach_run_id = $3 where college_id = $1 and id = $2', [a.collegeId, id, run.run_id]);
    return { id, coach_run_id: run?.run_id ?? null };
  }));
}, { drain: true });
