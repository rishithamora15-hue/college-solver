import { z } from 'zod';
import { body, json, requireActor, requireStudent, route } from '@/server/http';
import { extractPreview } from '@/server/career';

export const POST = route(async (req) => {
  requireStudent(await requireActor(req));
  const { text } = await body(req, z.object({ text: z.string().min(1).max(20000) }));
  return json({ items: extractPreview(text) });
});
