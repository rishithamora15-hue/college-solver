import { z } from 'zod';
import { body, json, requireActor, route, scoped, uuidParam } from '@/server/http';
import { addEvent } from '@/server/complaints';

const schema = z.object({
  status: z.enum(['assigned', 'in_progress', 'awaiting_student', 'resolved', 'verified_closed', 'reopened']),
  note: z.string().max(2000).default(''), expected_version: z.number().int().min(1),
  verification_basis: z.enum(['source_credit_receipt', 'student_confirmation']).optional(),
}).strict();

export const POST = route(async (req, { params }: { params: Promise<{ id: string }> }) => {
  const a = await requireActor(req);
  const id = uuidParam((await params).id);
  const i = await body(req, schema);
  return json(await scoped(a, (c) => addEvent(c, a, id, i)));
});
