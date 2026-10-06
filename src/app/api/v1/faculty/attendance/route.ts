import { body, json, requireActor, route, scoped } from '@/server/http';
import { attendanceInput, saveAttendance } from '@/server/academics';

export const POST = route(async (req) => {
  const a = await requireActor(req, 'faculty');
  const i = await body(req, attendanceInput);
  return json(await scoped(a, (c) => saveAttendance(c, a, i)));
});
