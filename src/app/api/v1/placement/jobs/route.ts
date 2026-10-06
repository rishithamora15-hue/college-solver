import { body, json, requireActor, route, scoped } from '@/server/http';
import { createJob, jobInput } from '@/server/jobs';

export const POST = route(async (req) => {
  const a = await requireActor(req, 'placement');
  const i = await body(req, jobInput);
  return json(await scoped(a, (c) => createJob(c, a, i)), 201);
});
