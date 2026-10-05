import { json, requireActor, route } from '@/server/http';

export const GET = route(async (req) => {
  const a = await requireActor(req);
  return json({ user_id: a.userId, college: a.collegeName, display_name: a.displayName, roles: a.roles, is_student: !!a.studentId });
});
