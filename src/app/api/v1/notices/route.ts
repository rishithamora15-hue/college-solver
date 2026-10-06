import { z } from 'zod';
import { AppError, body, json, requireActor, route, scoped } from '@/server/http';
import { sendNotice } from '@/server/admin';

/** Administration office or placement cell raises a notice that pops up on one student's screen. */
export const POST = route(async (req) => {
  const a = await requireActor(req);
  if (!a.roles.includes('admin') && !a.roles.includes('placement')) throw new AppError(403, 'forbidden', 'Not permitted');
  const i = await body(req, z.object({ student_id: z.uuid(), title: z.string().trim().min(3).max(120), body: z.string().trim().max(1000).default('') }).strict());
  await scoped(a, (c) => sendNotice(c, a, i.student_id, i.title, i.body));
  return json({ ok: true });
});
