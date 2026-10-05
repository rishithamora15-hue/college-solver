import { notFound, requireActor, route, scoped } from '@/server/http';
import { verifyFileToken } from '@/server/learn';
import { one } from '@/server/db';

/** Serves a published document only for the user the 60 s token was issued to, still within their tenant. */
export const GET = route(async (req, { params }: { params: Promise<{ token: string }> }) => {
  const a = await requireActor(req);
  const docId = verifyFileToken((await params).token, a.userId);
  if (!docId) throw notFound();
  const d = await scoped(a, (c) => one(c, `select title, mime, bytes from documents where college_id = $1 and id = $2 and status = 'published'`, [a.collegeId, docId]));
  if (!d) throw notFound();
  const name = d.title.replace(/[^\w .-]/g, '_').slice(0, 80);
  return new Response(new Uint8Array(d.bytes), { headers: {
    'content-type': d.mime, 'content-disposition': `attachment; filename="${name}${d.mime === 'text/plain' ? '.txt' : ''}"`,
    'cache-control': 'no-store', 'x-content-type-options': 'nosniff',
  } });
});
