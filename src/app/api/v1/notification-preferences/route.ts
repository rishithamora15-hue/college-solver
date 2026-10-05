import { z } from 'zod';
import { body, json, requireActor, route, scoped } from '@/server/http';

export const PATCH = route(async (req) => {
  const a = await requireActor(req);
  const { reminders_enabled } = await body(req, z.object({ reminders_enabled: z.boolean() }).strict());
  await scoped(a, (c) => c.query(`insert into notification_preferences (college_id, user_id, reminders_enabled) values ($1,$2,$3)
    on conflict (college_id, user_id) do update set reminders_enabled = excluded.reminders_enabled`, [a.collegeId, a.userId, reminders_enabled]));
  return json({ reminders_enabled });
});
