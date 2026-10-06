import { z } from 'zod';
import { body, json, requireActor, route, scoped, uuidParam } from '@/server/http';
import { setJobStatus } from '@/server/jobs';

export const PATCH = route(async (req, { params }: { params: Promise<{ id: string }> }) => {
  const a = await requireActor(req, 'placement');
  const id = uuidParam((await params).id);
  const { status } = await body(req, z.object({ status: z.enum(['published', 'withdrawn']) }).strict());
  return json(await scoped(a, (c) => setJobStatus(c, a, id, status)));
});
