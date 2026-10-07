import { json, body, requireActor, route, scoped } from '@/server/http';
import { changePassword, passwordSchema } from '@/server/profile';

export const POST = route(async (req) => {
  const a = await requireActor(req);
  const i = await body(req, passwordSchema);
  await scoped(a, (c) => changePassword(c, a, i));
  return json({ ok: true });
});
