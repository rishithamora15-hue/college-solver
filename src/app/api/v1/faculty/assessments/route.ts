import { z } from 'zod';
import { body, json, requireActor, route, scoped } from '@/server/http';
import { createAssessment } from '@/server/academics';

export const POST = route(async (req) => {
  const a = await requireActor(req, 'faculty');
  const i = await body(req, z.object({ assignment_id: z.uuid(), name: z.string().trim().min(2).max(60), max_marks: z.number().int().min(1).max(1000) }).strict());
  return json(await scoped(a, (c) => createAssessment(c, a, i.assignment_id, i.name, i.max_marks)), 201);
});
