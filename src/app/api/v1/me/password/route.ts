import { json, body, requireActor, route, scoped, AppError } from '@/server/http';
import { env } from '@/server/env';
import { changePassword, passwordSchema } from '@/server/profile';

export const POST = route(async (req) => {
  const a = await requireActor(req);
  if (env().AUTH_MODE !== 'local') throw new AppError(409, 'external_auth', 'Passwords are managed by the sign-in provider');
  const i = await body(req, passwordSchema);
  await scoped(a, (c) => changePassword(c, a, i));
  return json({ ok: true });
});
