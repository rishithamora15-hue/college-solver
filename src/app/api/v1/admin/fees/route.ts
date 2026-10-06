import { body, json, requireActor, route, scoped } from '@/server/http';
import { addFee, feeInput } from '@/server/admin';

export const POST = route(async (req) => {
  const a = await requireActor(req, 'admin');
  const i = await body(req, feeInput);
  return json(await scoped(a, (c) => addFee(c, a, i)), 201);
});
