import { z } from 'zod';
import { body, json, requireActor, requireStudent, route, scoped } from '@/server/http';
import { PATHS, setPath, type PathId } from '@/server/prep';

const schema = z.object({ path: z.enum(Object.keys(PATHS) as [PathId, ...PathId[]]) }).strict();

export const POST = route(async (req) => {
  const a = await requireActor(req);
  const sid = requireStudent(a);
  const { path } = await body(req, schema);
  return json(await scoped(a, (c) => setPath(c, a, sid, path)));
});
