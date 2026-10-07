import { flagEnabled, one, tx, type Db } from './db';
import { resolveActor, type Actor } from './auth';
import { AppError, notFound } from './http';
import { callModel, LIMITS, parseJson, providerLabel } from './ai';
import { SPECIALISTS, type ToolOut } from './specialists';
import { enqueue, fenced, type Job } from './queue';

export type Kind = keyof typeof SPECIALISTS;
const ACTIVE = `('queued','contextualizing','specialist','verifying')`;
export const QUOTA = { perUserActive: 2, perCollegeDaily: Number(process.env.QUOTA_COLLEGE_DAILY ?? 300), globalDaily: Number(process.env.QUOTA_GLOBAL_DAILY ?? 1000) };

/** Durable quota reservation (transactional, multi-instance safe) + run row + job in one transaction. */
export async function createRun(c: Db, a: Actor, studentId: string, kind: Kind, input: unknown) {
  if (!(await flagEnabled(c, `ai_${kind}`))) throw new AppError(503, 'capability_disabled', 'This AI capability is temporarily disabled. Manual options remain available.');
  const p = providerLabel();
  if (!p) throw new AppError(503, 'provider_unavailable', 'AI is not configured for this deployment. Manual options remain available.');
  await c.query('select pg_advisory_xact_lock(hashtextextended($1, 0))', ['quota']); // ponytail: one global lock; per-tenant locks if run creation contends
  const q = await one(c, `select
      (select count(*) from agent_runs where college_id = $1 and actor_user_id = $2 and state in ${ACTIVE})::int user_active,
      (select count(*) from agent_runs where college_id = $1 and created_at > now() - interval '1 day')::int college_day`, [a.collegeId, a.userId]);
  const g = await one(c, `select count(*)::int n from jobs where kind = 'ai_run' and created_at > now() - interval '1 day'`);
  if (q.user_active >= QUOTA.perUserActive) throw new AppError(429, 'too_many_active_runs', 'Wait for your current AI requests to finish', { retry_after_s: 10 });
  if (q.college_day >= QUOTA.perCollegeDaily || g.n >= QUOTA.globalDaily) throw new AppError(429, 'quota_exhausted', 'Daily AI limit reached; manual options remain available', { retry_after_s: 3600 });
  const run = await one(c, `insert into agent_runs (college_id, actor_user_id, student_id, kind, state, input, prompt_version, provider, model_id, deadline_at)
    values ($1,$2,$3,$4,'queued',$5,$6,$7,$8, now() + interval '10 minutes') returning id, state`,
    [a.collegeId, a.userId, studentId, kind, JSON.stringify(input), SPECIALISTS[kind].promptVersion, p.provider, p.model]);
  await enqueue(c, { collegeId: a.collegeId, kind: 'ai_run', payload: { run_id: run.id }, dedupKey: `ai_run:${run.id}` });
  return { run_id: run.id, state: run.state };
}

export async function getRun(c: Db, a: Actor, id: string) {
  const r = await one(c, `select id, kind, state, result, error, provider, model_id, prompt_version, model_calls, tool_calls, input_tokens, output_tokens, created_at, updated_at
    from agent_runs where college_id = $1 and id = $2 and actor_user_id = $3`, [a.collegeId, id, a.userId]);
  if (!r) throw notFound();
  return { ...r, live_ai: r.provider === 'anthropic' || r.provider === 'gemini', retry_after_s: ['completed', 'failed', 'cancelled'].includes(r.state) ? null : 2 };
}

export async function cancelRun(c: Db, a: Actor, id: string) {
  const r = await one(c, `update agent_runs set cancel_requested = true,
      state = case when state = 'queued' then 'cancelled' else state end, updated_at = now()
    where college_id = $1 and id = $2 and actor_user_id = $3 and state in ${ACTIVE} returning state`, [a.collegeId, id, a.userId]);
  if (!r) throw notFound();
  if (r.state === 'cancelled') await c.query(`update jobs set state = 'cancelled', updated_at = now() where dedup_key = $1 and state = 'queued'`, [`ai_run:${id}`]);
  return r;
}

const setState = (job: Job, runId: string, state: string, extra = '', params: unknown[] = []) =>
  fenced(job, (c) => c.query(`update agent_runs set state = $2, updated_at = now() ${extra} where id = $1`, [runId, state, ...params]));
const step = (c: Db, collegeId: string, runId: string, kind: string, detail: unknown) =>
  c.query('insert into agent_steps (college_id, run_id, kind, detail) values ($1,$2,$3,$4)', [collegeId, runId, kind, JSON.stringify(detail)]);

/** Worker side. Every persisted transition is fenced by the job lease; model calls happen outside transactions. */
export async function executeRun(job: Job, signal: AbortSignal) {
  const runId = job.payload.run_id as string;
  const run = await fenced(job, (c) => one(c, 'select r.*, u.auth_subject from agent_runs r join app_users u on u.id = r.actor_user_id where r.id = $1', [runId]));
  if (!run || ['completed', 'failed', 'cancelled'].includes(run.state)) return fenced(job, async () => {}, 'succeeded');
  if (run.cancel_requested) return fenced(job, (c) => c.query(`update agent_runs set state = 'cancelled' where id = $1`, [runId]), 'cancelled');
  if (Date.now() > +new Date(run.deadline_at)) return finishFailed(job, runId, 'deadline_exceeded');

  // Reauthorize at execution time: membership may have been revoked while queued.
  const actor = await resolveActor(run.auth_subject);
  if (!actor || actor.collegeId !== run.college_id || actor.studentId !== run.student_id) return finishFailed(job, runId, 'access_revoked');
  if (!(await tx((c) => flagEnabled(c, `ai_${run.kind}`)))) return finishFailed(job, runId, 'capability_disabled');

  const spec = SPECIALISTS[run.kind as Kind];
  await setState(job, runId, 'contextualizing');
  let tools: ToolOut;
  try {
    tools = await tx((c) => spec.tools(c, actor, run.student_id, run.input), { collegeId: run.college_id, userId: run.actor_user_id });
  } catch (e) {
    return finishFailed(job, runId, `context_error: ${(e as Error).message}`.slice(0, 200));
  }
  if (run.tool_calls + tools.receipts.length > LIMITS.toolCallsPerRun) return finishFailed(job, runId, 'tool_budget_exhausted');
  await fenced(job, async (c) => {
    for (const r of tools.receipts) await step(c, run.college_id, runId, `tool:${r.tool}`, r);
    await c.query('update agent_runs set tool_calls = tool_calls + $2 where id = $1', [runId, tools.receipts.length]);
  });

  let result = spec.preempt?.(tools.context) ?? null;
  if (!result) {
    let errors: string[] = [];
    let calls = run.model_calls;
    for (let attempt = 0; attempt < 2 && !result; attempt++) { // initial + one bounded repair
      if ((await tx((c) => one(c, 'select cancel_requested from agent_runs where id = $1', [runId]), { collegeId: run.college_id }))?.cancel_requested)
        return fenced(job, (c) => c.query(`update agent_runs set state = 'cancelled' where id = $1`, [runId]), 'cancelled');
      if (calls >= LIMITS.modelCallsPerRun) return finishFailed(job, runId, 'model_budget_exhausted');
      await setState(job, runId, 'specialist');
      calls++;
      // Count the call BEFORE making it so a crash mid-call still consumes budget.
      await fenced(job, (c) => c.query('update agent_runs set model_calls = model_calls + 1 where id = $1', [runId]));
      const reply = await callModel({
        system: spec.system, maxTokens: LIMITS.maxOutputTokens, signal: AbortSignal.any([signal, AbortSignal.timeout(LIMITS.runMs)]),
        user: spec.user(tools.context, run.input) + (errors.length ? `\nYour previous reply was rejected: ${errors.join('; ')}. Fix these and reply with valid JSON only.` : ''),
        fixture: () => spec.fixture(tools, run.input),
      });
      await setState(job, runId, 'verifying', ', input_tokens = input_tokens + $3, output_tokens = output_tokens + $4, model_id = $5', [reply.inputTokens, reply.outputTokens, reply.model]);
      let parsed: any;
      try { parsed = spec.schema.parse(parseJson(reply.text)); errors = spec.verify(parsed, tools); } catch (e) { errors = [`invalid JSON/schema: ${(e as Error).message.slice(0, 200)}`]; }
      await fenced(job, (c) => step(c, run.college_id, runId, 'verify', { attempt, passed: errors.length === 0, errors }));
      if (!errors.length) result = parsed;
    }
    if (!result) return finishFailed(job, runId, 'verification_failed');
  }

  // Side effects only after a final cancellation check, inside the fenced completion transaction.
  return fenced(job, async (c) => {
    const cur = await one(c, 'select cancel_requested from agent_runs where id = $1 for update', [runId]);
    if (cur.cancel_requested) return c.query(`update agent_runs set state = 'cancelled', updated_at = now() where id = $1`, [runId]);
    const extra: Record<string, unknown> = {};
    if (run.kind === 'scholarship' && result.draft) {
      const d = await one(c, `insert into complaint_drafts (college_id, student_id, case_id, case_version, department_id, subject, body, run_id)
        values ($1,$2,$3,$4,$5,$6,$7,$8) returning id`, [run.college_id, run.student_id, run.input.case_id, tools.context.case_version, tools.context.department.id, result.draft.subject, result.draft.body, runId]);
      extra.draft_id = d.id;
    }
    if (run.kind === 'tutor') extra.sources = tools.context.sources.map(({ text, ...s }: any) => s);
    if (run.kind === 'coach') extra.modules = tools.context.modules;
    if (run.kind === 'career') Object.assign(extra, { gaps: tools.context.gaps, matched: tools.context.matched, resume_version: tools.context.resume_version, readiness: 'unassessed' });
    await c.query(`update agent_runs set state = 'completed', result = $2, updated_at = now() where id = $1`, [runId, JSON.stringify({ ...result, ...extra, evidence: tools.evidence })]);
  }, 'succeeded');
}

async function finishFailed(job: Job, runId: string, reason: string) {
  return fenced(job, (c) => c.query(`update agent_runs set state = 'failed', error = $2, updated_at = now() where id = $1`, [runId, reason]), 'succeeded');
}
export const markRunFailed = (c: Db, runId: string, reason: string) =>
  c.query(`update agent_runs set state = 'failed', error = $2, updated_at = now() where id = $1 and state not in ('completed','cancelled')`, [runId, reason]);
