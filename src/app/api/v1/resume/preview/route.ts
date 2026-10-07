import { z } from 'zod';
import { AppError, body, fileFrom, formOf, json, requireActor, requireStudent, route } from '@/server/http';
import { extractPreview } from '@/server/career';
import { pdfPages } from '@/server/academics';

/** Resume text pasted (JSON) or a PDF upload (multipart, max 5 MB). Only the extracted facts come back; the file is not stored. */
export const POST = route(async (req) => {
  requireStudent(await requireActor(req));
  if (req.headers.get('content-type')?.startsWith('multipart/form-data')) {
    const f = await fileFrom(await formOf(req), 'file', 5 * 1024 * 1024, ['application/pdf']);
    const text = (await pdfPages(f.bytes)).join('\n');
    if (!text.trim()) throw new AppError(422, 'no_text', 'This PDF has no readable text (it may be a scan or protected). Paste the text instead.');
    return json({ items: extractPreview(text) });
  }
  const { text } = await body(req, z.object({ text: z.string().min(1).max(20000) }));
  return json({ items: extractPreview(text) });
});
