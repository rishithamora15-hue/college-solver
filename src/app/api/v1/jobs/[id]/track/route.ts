import { z } from 'zod';
import { body, json, requireActor, requireStudent, route, scoped, uuidParam } from '@/server/http';
import { track } from '@/server/jobs';

export const POST = route(async (req, { params }: { params: Promise<{ id: string }> }) => {
  const a = await requireActor(req);
  const sid = requireStudent(a);
  const id = uuidParam((await params).id);
  const { state } = await body(req, z.object({ state: z.enum(['link_opened', 'reported_applied', 'reported_not_applied']) }).strict());
  return json(await scoped(a, (c) => track(c, a, sid, id, state)));
});
