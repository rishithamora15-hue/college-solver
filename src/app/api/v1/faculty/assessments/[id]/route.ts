import { body, json, requireActor, route, scoped, uuidParam } from '@/server/http';
import { marksInput, saveMarks } from '@/server/academics';

export const PATCH = route(async (req, { params }: { params: Promise<{ id: string }> }) => {
  const a = await requireActor(req, 'faculty');
  const id = uuidParam((await params).id);
  const i = await body(req, marksInput);
  return json(await scoped(a, (c) => saveMarks(c, a, id, i)));
});
