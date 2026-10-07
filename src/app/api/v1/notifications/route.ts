import { z } from 'zod';
import { body, json, requireActor, route, scoped } from '@/server/http';
import { many } from '@/server/db';

/** Polled by the bell: latest notices, unread first-class. */
export const GET = route(async (req) => {
  const a = await requireActor(req);
  const items = await scoped(a, (c) => many(c, `select id, title, body, sender, created_at, read_at from notifications
    where college_id = $1 and user_id = $2 and state = 'delivered' order by created_at desc limit 20`, [a.collegeId, a.userId]));
  return json({ items });
}, { drain: true });

/** Mark some (ids) or all as read. */
export const PATCH = route(async (req) => {
  const a = await requireActor(req);
  const i = await body(req, z.union([z.object({ ids: z.array(z.uuid()).min(1).max(50) }).strict(), z.object({ all: z.literal(true) }).strict()]));
  await scoped(a, (c) => c.query(`update notifications set read_at = now() where college_id = $1 and user_id = $2 and read_at is null
    and ($3::uuid[] is null or id = any($3))`, [a.collegeId, a.userId, 'ids' in i ? i.ids : null]));
  return json({ ok: true });
});
