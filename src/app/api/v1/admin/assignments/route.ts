import { body, json, requireActor, route, scoped } from '@/server/http';
import { assignInput, assignTeacher } from '@/server/academics';

export const POST = route(async (req) => {
  const a = await requireActor(req, 'admin');
  const i = await body(req, assignInput);
  return json(await scoped(a, (c) => assignTeacher(c, a, i)));
});
