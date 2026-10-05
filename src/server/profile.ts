import { z } from 'zod';
import type { Db } from './db';
import type { Actor } from './auth';

/** Only display name is self-editable. strict() rejects role/tenant/any other field. */
export const profileSchema = z.object({ display_name: z.string().trim().min(1).max(80) }).strict();

export async function updateProfile(c: Db, a: Actor, studentId: string, p: z.infer<typeof profileSchema>) {
  await c.query('update students set display_name = $3 where college_id = $1 and id = $2', [a.collegeId, studentId, p.display_name]);
}
