import { body, json, requireActor, route, scoped, uuidParam } from '@/server/http';
import { editFee, feeEdit } from '@/server/admin';

export const PATCH = route(async (req, { params }: { params: Promise<{ id: string }> }) => {
  const a = await requireActor(req, 'admin');
  const id = uuidParam((await params).id);
  const i = await body(req, feeEdit);
  return json(await scoped(a, (c) => editFee(c, a, id, i)));
});
