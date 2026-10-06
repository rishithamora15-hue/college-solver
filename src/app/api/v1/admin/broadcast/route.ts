import { body, json, requireActor, route, scoped } from '@/server/http';
import { broadcast, broadcastInput } from '@/server/admin';

export const POST = route(async (req) => {
  const a = await requireActor(req, 'admin');
  const i = await body(req, broadcastInput);
  return json(await scoped(a, (c) => broadcast(c, a, i)));
});
