import { body, json, requireActor, route, scoped } from '@/server/http';
import { addSlot, slotInput } from '@/server/academics';

export const POST = route(async (req) => {
  const a = await requireActor(req, 'admin');
  const i = await body(req, slotInput);
  return json(await scoped(a, (c) => addSlot(c, a, i)), 201);
});
