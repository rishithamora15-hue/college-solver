import { z } from 'zod';
import { body, json, requireActor, requireStudent, route, scoped } from '@/server/http';
import { manualDraft } from '@/server/complaints';

export const POST = route(async (req) => {
  const a = await requireActor(req);
  const sid = requireStudent(a);
  const i = await body(req, z.object({ case_id: z.uuid(), issue: z.string().max(1000).default('') }).strict());
  const d = await scoped(a, (c) => manualDraft(c, a, sid, i.case_id, i.issue));
  return json({ draft_id: d.id }, 201);
});
