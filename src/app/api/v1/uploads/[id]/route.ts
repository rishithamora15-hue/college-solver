import { requireActor, route, scoped, uuidParam } from '@/server/http';
import { uploadFile } from '@/server/requests';

/** The student who uploaded it, or the administration office. Always a download, never rendered inline. */
export const GET = route(async (req, { params }: { params: Promise<{ id: string }> }) => {
  const a = await requireActor(req);
  const id = uuidParam((await params).id);
  const f = await scoped(a, (c) => uploadFile(c, a, id));
  return new Response(new Uint8Array(f.bytes), { headers: {
    'content-type': f.mime, 'content-disposition': `attachment; filename="${f.filename}"`, 'cache-control': 'no-store', 'x-content-type-options': 'nosniff',
  } });
});
