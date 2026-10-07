import { z } from 'zod';
import { body, idempotent, json, requireActor, requireStudent, route, scoped } from '@/server/http';
import { listComplaints, submitComplaint } from '@/server/complaints';

const schema = z.object({ draft_id: z.uuid(), subject: z.string().trim().min(3).max(150), body: z.string().trim().min(20).max(3000), case_version: z.number().int().min(1) }).strict();

export const GET = route(async (req) => {
  const a = await requireActor(req);
  return json({ items: await scoped(a, (c) => listComplaints(c, a)) });
});

export const POST = route(async (req) => {
  const a = await requireActor(req);
  const sid = requireStudent(a);
  const i = await body(req, schema);
  const res = await scoped(a, (c) => idempotent(c, a, 'complaint.submit', req.headers.get('idempotency-key'), i, () => submitComplaint(c, a, sid, i)));
  return json(res, 201);
}, { drain: true });
