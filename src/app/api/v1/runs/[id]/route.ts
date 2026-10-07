import { json, requireActor, route, scoped, uuidParam } from '@/server/http';
import { getRun } from '@/server/runs';

export const GET = route(async (req, { params }: { params: Promise<{ id: string }> }) => {
  const a = await requireActor(req);
  const id = uuidParam((await params).id);
  return json(await scoped(a, (c) => getRun(c, a, id)));
}, { drain: true });
