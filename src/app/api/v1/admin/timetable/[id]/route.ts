import { json, requireActor, route, scoped, uuidParam } from '@/server/http';
import { removeSlot } from '@/server/academics';

export const DELETE = route(async (req, { params }: { params: Promise<{ id: string }> }) => {
  const a = await requireActor(req, 'admin');
  const id = uuidParam((await params).id);
  return json(await scoped(a, (c) => removeSlot(c, a, id)));
});
