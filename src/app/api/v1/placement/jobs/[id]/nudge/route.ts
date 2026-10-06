import { z } from 'zod';
import { body, json, requireActor, route, scoped, uuidParam } from '@/server/http';
import { nudge } from '@/server/jobs';

export const POST = route(async (req, { params }: { params: Promise<{ id: string }> }) => {
  const a = await requireActor(req, 'placement');
  const id = uuidParam((await params).id);
  const { group } = await body(req, z.object({ group: z.enum(['opened', 'none']) }).strict());
  return json(await scoped(a, (c) => nudge(c, a, id, group)));
});
