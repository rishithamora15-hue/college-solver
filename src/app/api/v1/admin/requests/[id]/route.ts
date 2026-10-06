import { body, json, requireActor, route, scoped, uuidParam } from '@/server/http';
import { decideInput, decideRequest } from '@/server/requests';

export const PATCH = route(async (req, { params }: { params: Promise<{ id: string }> }) => {
  const a = await requireActor(req, 'admin');
  const id = uuidParam((await params).id);
  const i = await body(req, decideInput);
  return json(await scoped(a, (c) => decideRequest(c, a, id, i)));
});
