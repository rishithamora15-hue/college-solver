import { body, json, requireActor, requireStudent, route, scoped } from '@/server/http';
import { profileSchema, updateProfile } from '@/server/profile';

export const PATCH = route(async (req) => {
  const a = await requireActor(req);
  const sid = requireStudent(a);
  const p = await body(req, profileSchema);
  await scoped(a, (c) => updateProfile(c, a, sid, p));
  return json({ ok: true });
});
