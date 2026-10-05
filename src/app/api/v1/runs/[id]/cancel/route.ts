import { json, requireActor, route, scoped, uuidParam } from '@/server/http';
import { cancelRun } from '@/server/runs';

export const POST = route(async (req, { params }: { params: Promise<{ id: string }> }) => {
  const a = await requireActor(req);
  const id = uuidParam((await params).id);
  return json(await scoped(a, (c) => cancelRun(c, a, id)));
});
