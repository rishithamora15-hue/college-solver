import { body, json, requireActor, route, scoped, uuidParam } from '@/server/http';
import { creditInput, recordScholarshipCredit } from '@/server/admin';

export const POST = route(async (req, { params }: { params: Promise<{ id: string }> }) => {
  const a = await requireActor(req, 'admin');
  const id = uuidParam((await params).id);
  const i = await body(req, creditInput);
  return json(await scoped(a, (c) => recordScholarshipCredit(c, a, id, i)), 201);
});
