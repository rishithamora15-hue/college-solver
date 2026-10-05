import { z } from 'zod';
import { AppError, body, json, notFound, requireActor, requireStudent, route, scoped } from '@/server/http';
import { createRun } from '@/server/runs';
import { route as pick } from '@/server/specialists';
import { scholarshipDetail } from '@/server/finance';
import { subjectAccess } from '@/server/learn';
import { one } from '@/server/db';

// Input contract per specialist. Ownership is checked here for a clear error AND again by the worker at run time.
const INPUT = {
  scholarship: z.object({ case_id: z.uuid(), issue: z.string().max(1000).default('') }).strict(),
  tutor: z.object({ curriculum_subject_id: z.uuid(), topic: z.string().max(100).optional(), question: z.string().trim().min(3).max(1000) }).strict(),
  career: z.object({ resume_version_id: z.uuid(), job_id: z.uuid().optional(), jd_text: z.string().trim().min(20).max(8000).optional() }).strict()
    .refine((x) => !!x.job_id !== !!x.jd_text, { message: 'Give a job or a job description', path: ['jd_text'] }),
};

export const POST = route(async (req) => {
  const a = await requireActor(req);
  const sid = requireStudent(a);
  const { screen, input } = await body(req, z.object({ screen: z.string().max(30), input: z.record(z.string(), z.unknown()) }));
  const kind = pick(screen);
  if (!kind) throw new AppError(400, 'unknown_screen', 'No assistant for this screen');
  const r = INPUT[kind].safeParse(input);
  if (!r.success) throw new AppError(400, 'validation', 'Invalid input', { fields: r.error.issues.map((x) => x.path.join('.')) });
  const i: any = r.data;
  const res = await scoped(a, async (c) => {
    if (kind === 'scholarship') await scholarshipDetail(c, a, sid, i.case_id);
    if (kind === 'tutor') await subjectAccess(c, a, sid, i.curriculum_subject_id);
    if (kind === 'career' && !(await one(c, 'select 1 from resume_versions where college_id = $1 and student_id = $2 and id = $3 and confirmed_at is not null', [a.collegeId, sid, i.resume_version_id]))) throw notFound();
    return createRun(c, a, sid, kind, i);
  });
  return json(res, 202);
});
