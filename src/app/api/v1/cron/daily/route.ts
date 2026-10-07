import { env } from '@/server/env';
import { AppError, json, route, sha256 } from '@/server/http';
import { enqueueDailySweep } from '@/worker/main';

export const dynamic = 'force-dynamic';
/** Vercel Cron (vercel.json) calls this daily with `Authorization: Bearer $CRON_SECRET`; the drain route() schedules sends the reminders. */
export const GET = route(async (req) => {
  const secret = env().CRON_SECRET;
  if (!secret || sha256(req.headers.get('authorization') ?? '') !== sha256(`Bearer ${secret}`)) throw new AppError(401, 'unauthenticated', 'Cron secret required');
  await enqueueDailySweep();
  return json({ ok: true });
}, { drain: true });
