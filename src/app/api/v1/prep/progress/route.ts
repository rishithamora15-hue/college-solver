import { z } from 'zod';
import { body, json, requireActor, requireStudent, route, scoped } from '@/server/http';
import { markRead } from '@/server/prep';

const schema = z.object({ module_id: z.string().max(40) }).strict();

export const POST = route(async (req) => {
  const a = await requireActor(req);
  const sid = requireStudent(a);
  const { module_id } = await body(req, schema);
  return json(await scoped(a, (c) => markRead(c, a, sid, module_id)));
});
