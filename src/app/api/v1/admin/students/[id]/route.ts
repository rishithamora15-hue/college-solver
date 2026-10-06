import { body, json, requireActor, route, scoped, uuidParam } from '@/server/http';
import { studentUpdate, updateStudent } from '@/server/admin';

export const PATCH = route(async (req, { params }: { params: Promise<{ id: string }> }) => {
  const a = await requireActor(req, 'admin');
  const id = uuidParam((await params).id);
  const i = await body(req, studentUpdate);
  return json(await scoped(a, (c) => updateStudent(c, a, id, i)));
});
