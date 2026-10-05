import { NextResponse } from 'next/server';
import { requireActor, requireStudent, route, scoped, uuidParam } from '@/server/http';
import { downloadLink } from '@/server/learn';

/** Re-authorizes, then redirects to a 60 s link bound to this user + document. */
export const GET = route(async (req, { params }: { params: Promise<{ id: string }> }) => {
  const a = await requireActor(req);
  const sid = requireStudent(a);
  const id = uuidParam((await params).id);
  const link = await scoped(a, (c) => downloadLink(c, a, sid, id));
  return NextResponse.redirect(new URL(link, req.url), { status: 303, headers: { 'cache-control': 'no-store' } });
});
