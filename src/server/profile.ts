import { z } from 'zod';
import { audit, one, type Db } from './db';
import { checkPassword, hashPassword, type Actor } from './auth';
import { AppError } from './http';

export const passwordSchema = z.object({ current: z.string().min(1).max(200), next: z.string().min(8, 'Use at least 8 characters').max(200) }).strict();

/** Any role. Students' first password is their roll number (accepted in any letter case). */
export async function changePassword(c: Db, a: Actor, i: z.infer<typeof passwordSchema>) {
  const u = await one(c, 'select password_hash from app_users where id = $1', [a.userId]);
  const ok = (await checkPassword(i.current, u?.password_hash)) || (!!a.studentId && (await checkPassword(i.current.toUpperCase(), u?.password_hash)));
  if (!ok) throw new AppError(400, 'bad_password', 'Current password is incorrect', { fields: ['current'] });
  if (i.next.toUpperCase() === i.current.toUpperCase()) throw new AppError(400, 'validation', 'Choose a different password', { fields: ['next'] });
  await c.query('update app_users set password_hash = $2 where id = $1', [a.userId, await hashPassword(i.next)]);
  await audit(c, { collegeId: a.collegeId, actor: a.userId, action: 'password.change', target: a.userId, result: 'ok' });
}

/** Self-editable: display name and mobile number ("" clears it). strict() rejects role/tenant/any other field. */
export const profileSchema = z.object({
  display_name: z.string().trim().min(1).max(80),
  phone: z.string().transform((s) => s.replace(/[\s-]/g, '').replace(/^(\+91|91)(?=\d{10}$)/, ''))
    .pipe(z.string().regex(/^([6-9]\d{9})?$/, 'Enter a 10-digit mobile number')).optional(),
}).strict();

export async function updateProfile(c: Db, a: Actor, studentId: string, p: z.infer<typeof profileSchema>) {
  await c.query(`update students set display_name = $3, phone = case when $4 then nullif($5, '') else phone end where college_id = $1 and id = $2`,
    [a.collegeId, studentId, p.display_name, p.phone !== undefined, p.phone ?? null]);
}
