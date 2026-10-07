import { z } from 'zod';
import { body, json, requireActor, requireStudent, route, scoped } from '@/server/http';
import { recordAnswer } from '@/server/prep';

const schema = z.object({ question_id: z.string().max(40), choice: z.number().int().min(0).max(9) }).strict();

/** Graded on the server. Naturally idempotent: the first answer per question is kept. */
export const POST = route(async (req) => {
  const a = await requireActor(req);
  const sid = requireStudent(a);
  const i = await body(req, schema);
  return json(await scoped(a, (c) => recordAnswer(c, a, sid, i.question_id, i.choice)));
});
