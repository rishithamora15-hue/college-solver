import { z } from 'zod';
import { AppError, body, json, route } from '@/server/http';
import { resolveActor } from '@/server/auth';
import { env } from '@/server/env';
import { withSession } from '@/server/session';

export const POST = route(async (req) => {
  if (env().AUTH_MODE !== 'demo') throw new AppError(404, 'not_found', 'Not found');
  const { handle } = await body(req, z.object({ handle: z.string().regex(/^[a-z.]{1,20}$/) }));
  const sub = 'demo:' + handle;
  if (!(await resolveActor(sub))) throw new AppError(401, 'no_access', 'This account has no active membership');
  return withSession(json({ ok: true }), sub);
});
