import { z } from 'zod';
import { body, json, requireActor, route, scoped } from '@/server/http';
import { DOC_STATES, setDocumentState } from '@/server/admin';

export const PATCH = route(async (req) => {
  const a = await requireActor(req, 'admin');
  const i = await body(req, z.object({ student_id: z.uuid(), requirement_id: z.uuid(), state: z.enum(DOC_STATES) }).strict());
  return json(await scoped(a, (c) => setDocumentState(c, a, i.student_id, i.requirement_id, i.state)));
});
