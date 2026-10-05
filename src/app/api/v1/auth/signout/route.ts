import { json, route } from '@/server/http';
import { withSession } from '@/server/session';

export const POST = route(async () => withSession(json({ ok: true }), null));
