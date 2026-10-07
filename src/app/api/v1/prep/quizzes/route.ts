import { z } from 'zod';
import { body, json, requireActor, requireStudent, route, scoped } from '@/server/http';
import { startQuiz, TRACKS, type Track } from '@/server/prep';

const schema = z.object({ track: z.enum(Object.keys(TRACKS) as [Track, ...Track[]]) }).strict();

export const POST = route(async (req) => {
  const a = await requireActor(req);
  const sid = requireStudent(a);
  const { track } = await body(req, schema);
  return json(await scoped(a, (c) => startQuiz(c, a, sid, track)), 201);
});
