import { z } from 'zod';

const schema = z.object({
  NODE_ENV: z.string().default('development'),
  DATABASE_URL: z.string().min(1),
  SESSION_SECRET: z.string().min(32),
  AUTH_MODE: z.enum(['local', 'supabase']).default('local'),
  SUPABASE_URL: z.string().url().optional().or(z.literal('')),
  SUPABASE_ANON_KEY: z.string().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
  AI_PROVIDER: z.enum(['anthropic', 'gemini', 'fixture', 'none']).default('none'),
  ANTHROPIC_API_KEY: z.string().optional(),
  GEMINI_API_KEY: z.string().optional(),
  RUNTIME_MODEL: z.string().optional(),
  WORKER_CONCURRENCY: z.coerce.number().int().min(1).max(8).default(2),
  APP_ORIGIN: z.string().default('http://localhost:3000'),
});

export type Env = z.infer<typeof schema>;
let cached: Env | undefined;

/** Lazily validated so `next build` does not need runtime secrets. Fails fast on first use. */
export function env(): Env {
  if (cached) return cached;
  const r = schema.safeParse(process.env);
  if (!r.success) throw new Error('Invalid configuration: ' + r.error.issues.map((i) => i.path.join('.')).join(', '));
  const e = r.data;
  const prod = e.NODE_ENV === 'production';
  if (e.AUTH_MODE === 'supabase' && (!e.SUPABASE_URL || !e.SUPABASE_ANON_KEY || !e.SUPABASE_SERVICE_ROLE_KEY))
    throw new Error('Supabase auth needs SUPABASE_URL, SUPABASE_ANON_KEY (publishable key) and SUPABASE_SERVICE_ROLE_KEY (secret key)');
  if (prod && e.AI_PROVIDER === 'fixture') throw new Error('AI_PROVIDER=fixture (mock) refused in production');
  if (e.AI_PROVIDER === 'anthropic' && (!e.ANTHROPIC_API_KEY || !e.RUNTIME_MODEL)) throw new Error('anthropic provider needs ANTHROPIC_API_KEY and RUNTIME_MODEL');
  if (e.AI_PROVIDER === 'gemini' && (!e.GEMINI_API_KEY || !e.RUNTIME_MODEL)) throw new Error('gemini provider needs GEMINI_API_KEY and RUNTIME_MODEL (for example gemini-3.8-flash)');
  return (cached = e);
}
