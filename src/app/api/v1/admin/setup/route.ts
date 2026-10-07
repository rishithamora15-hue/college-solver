import { body, json, requireActor, route, scoped } from '@/server/http';
import { applySetup, setupInput } from '@/server/setup';

/** Administration office only. Branches, syllabus, schemes, departments, staff accounts, student scholarship cases and backlogs. */
export const POST = route(async (req) => {
  const a = await requireActor(req, 'admin');
  const i = await body(req, setupInput);
  return json(await scoped(a, (c) => applySetup(c, a, i)), 201);
});
