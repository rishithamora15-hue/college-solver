import { z } from 'zod';
import { body, json, requireActor, route, scoped } from '@/server/http';
import { addStudents } from '@/server/admin';

/** One student or a spreadsheet of up to 500. All-or-nothing. */
export const POST = route(async (req) => {
  const a = await requireActor(req, 'admin');
  const { rows } = await body(req, z.object({ rows: z.array(z.record(z.string(), z.unknown())).min(1).max(500) }).strict());
  return json(await scoped(a, (c) => addStudents(c, a, rows)), 201);
});
