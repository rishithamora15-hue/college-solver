import { csv, isUuid, requireActor, route, scoped } from '@/server/http';
import { exportApplications } from '@/server/jobs';

export const GET = route(async (req) => {
  const a = await requireActor(req, 'placement');
  const job = req.nextUrl.searchParams.get('job');
  return csv(`applications-${new Date().toISOString().slice(0, 10)}.csv`, await scoped(a, (c) => exportApplications(c, a, isUuid(job) ? job : null)));
});
