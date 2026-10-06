import { z } from 'zod';
import { body, json, requireActor, route, scoped } from '@/server/http';
import { paymentInput, recordPayment } from '@/server/admin';

export const POST = route(async (req) => {
  const a = await requireActor(req, 'admin');
  const { student_id, ...i } = await body(req, paymentInput.extend({ student_id: z.uuid() }));
  return json(await scoped(a, (c) => recordPayment(c, a, student_id, i)), 201);
});
