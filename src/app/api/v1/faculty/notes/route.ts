import { z } from 'zod';
import { AppError, fileFrom, formOf, json, requireActor, route, scoped } from '@/server/http';
import { addNote } from '@/server/academics';

const meta = z.object({
  assignment_id: z.uuid(), title: z.string().trim().min(3).max(150), kind: z.enum(['material', 'paper']),
  exam_year: z.preprocess((v) => (v ? Number(v) : null), z.number().int().min(2000).max(2100).nullable()),
});

/** Paste text (searchable by the AI tutor) or upload a .txt / PDF (PDF is download-only). Max 5 MB. */
export const POST = route(async (req) => {
  const a = await requireActor(req, 'faculty');
  const form = await formOf(req);
  const m = meta.safeParse(Object.fromEntries(['assignment_id', 'title', 'kind', 'exam_year'].map((k) => [k, form.get(k) ?? undefined])));
  if (!m.success) throw new AppError(400, 'validation', 'Invalid input', { fields: m.error.issues.map((i) => i.path.join('.')) });
  const text = String(form.get('text') ?? '').trim();
  const f = text ? { bytes: Buffer.from(text.slice(0, 200_000)), mime: 'text/plain' } : await fileFrom(form, 'file', 5 * 1024 * 1024, ['text/plain', 'application/pdf']);
  return json(await scoped(a, (c) => addNote(c, a, m.data.assignment_id, { ...m.data, mime: f.mime, bytes: f.bytes })), 201);
});
