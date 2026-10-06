import { AppError, fileFrom, formOf, isUuid, json, requireActor, requireStudent, route, scoped } from '@/server/http';
import { UPLOAD_MAX, UPLOAD_TYPES, uploadDocument } from '@/server/requests';

export const POST = route(async (req) => {
  const a = await requireActor(req);
  const sid = requireStudent(a);
  const form = await formOf(req);
  const reqId = form.get('requirement_id');
  if (!isUuid(reqId)) throw new AppError(400, 'validation', 'Invalid input', { fields: ['requirement_id'] });
  const f = await fileFrom(form, 'file', UPLOAD_MAX, UPLOAD_TYPES);
  return json(await scoped(a, (c) => uploadDocument(c, a, sid, reqId, f)), 201);
});
