import { json, requireActor, route, scoped, uuidParam } from '@/server/http';
import { complaintView } from '@/server/complaints';

export const GET = route(async (req, { params }: { params: Promise<{ id: string }> }) => {
  const a = await requireActor(req);
  const id = uuidParam((await params).id);
  return json(await scoped(a, (c) => complaintView(c, a, id)));
});
