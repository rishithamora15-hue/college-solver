import { body, json, requireActor, requireStudent, route, scoped } from '@/server/http';
import { createRequest, requestInput } from '@/server/requests';

export const POST = route(async (req) => {
  const a = await requireActor(req);
  const sid = requireStudent(a);
  const i = await body(req, requestInput);
  return json(await scoped(a, (c) => createRequest(c, a, sid, i)), 201);
});
