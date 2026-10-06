import { z } from 'zod';
import { body, json, requireActor, route, scoped, uuidParam } from '@/server/http';
import { setStage, STAGES, type Stage } from '@/server/jobs';

export const PATCH = route(async (req, { params }: { params: Promise<{ id: string }> }) => {
  const a = await requireActor(req, 'placement');
  const id = uuidParam((await params).id);
  const i = await body(req, z.object({ student_id: z.uuid(), stage: z.enum(Object.keys(STAGES) as [Stage, ...Stage[]]).nullable() }).strict());
  return json(await scoped(a, (c) => setStage(c, a, id, i.student_id, i.stage)));
});
