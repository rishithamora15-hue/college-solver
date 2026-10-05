import { z } from 'zod';
import { body, json, requireActor, requireStudent, route, scoped } from '@/server/http';
import { saveResumeVersion, SECTIONS } from '@/server/career';

const schema = z.object({
  items: z.array(z.object({ section: z.enum(SECTIONS), text: z.string().trim().min(1).max(300) }).strict()).min(1).max(60),
  confirm: z.literal(true),
}).strict();

export const POST = route(async (req) => {
  const a = await requireActor(req);
  const sid = requireStudent(a);
  const i = await body(req, schema);
  return json(await scoped(a, (c) => saveResumeVersion(c, a, sid, i.items, i.confirm)), 201);
});
