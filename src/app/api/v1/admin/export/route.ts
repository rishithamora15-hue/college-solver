import { csv, notFound, requireActor, route, scoped } from '@/server/http';
import { EXPORTS, exportRows } from '@/server/admin';

export const GET = route(async (req) => {
  const a = await requireActor(req, 'admin');
  const kind = req.nextUrl.searchParams.get('kind') as (typeof EXPORTS)[number];
  if (!EXPORTS.includes(kind)) throw notFound();
  return csv(`${kind}-${new Date().toISOString().slice(0, 10)}.csv`, await scoped(a, (c) => exportRows(c, a, kind)));
});
