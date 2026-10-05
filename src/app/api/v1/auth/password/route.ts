import { z } from 'zod';
import { AppError, body, json, route } from '@/server/http';
import { resolveActor, supabasePasswordSignIn } from '@/server/auth';
import { env } from '@/server/env';
import { withSession } from '@/server/session';

export const POST = route(async (req) => {
  if (env().AUTH_MODE !== 'supabase') throw new AppError(404, 'not_found', 'Not found');
  const i = await body(req, z.object({ email: z.email().max(200), password: z.string().min(1).max(200) }));
  const sub = await supabasePasswordSignIn(i.email, i.password);
  if (!sub || !(await resolveActor(sub))) throw new AppError(401, 'bad_credentials', 'Email or password is incorrect, or the account has no access');
  return withSession(json({ ok: true }), sub);
});
