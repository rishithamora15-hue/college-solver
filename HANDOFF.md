# Handoff — 5 Oct 2026, 14:40 IST

Status: the app is complete and verified **locally** on synthetic data (see [docs/RELEASE-EVIDENCE.md](docs/RELEASE-EVIDENCE.md)). It is **not deployed**. Live AI and Supabase auth are **untested**.

## Owner actions, in order (about 1–2 h with access)

Hosting: **Vercel** runs the Next.js app (pages + `/api/v1`); **Render** runs only the background worker ([render.yaml](render.yaml)). Both use the same Supabase database. Without the worker, AI runs, complaint notifications and reminders stay queued.

1. **Approve spend and pick accounts.** Vercel (Hobby is non-commercial use only; Pro otherwise), Render worker (`starter`; Render has no free worker tier), Supabase project, and Gemini API usage with a daily ceiling. Check current prices yourself; this repo assumes none.
2. **Supabase.** Create the project (region: Mumbai `ap-south-1`). Download the CA certificate (Database settings → SSL configuration) into `DATABASE_CA_CERT` (file path locally, PEM text on Vercel/Render). Use the **Transaction pooler** connection string (port 6543) as `DATABASE_URL` everywhere: Vercel, the Render worker and your `.env` (every query runs inside a transaction, so nothing needs a session connection). Migration 007 removes Supabase Data API access to every table; the app connects to Postgres directly and never uses the anon key.
3. **AI provider.** Gemini: create a key in Google AI Studio with a spend limit. Set the same `AI_PROVIDER=gemini`, `GEMINI_API_KEY` and `RUNTIME_MODEL` (for example `gemini-3.8-flash`) on **both** Vercel and Render.
4. **Push the code** to GitHub (`git push -u origin master`).
5. **Migrate** from your machine: `npm run db:migrate`. Vercel has no pre-deploy step: run this before every deploy that adds a migration.
6. **Vercel.** Add New → Project → import the repo (framework auto-detected; functions pinned to Mumbai `bom1` by [vercel.json](vercel.json)). Environment variables (Production): `DATABASE_URL`, `DATABASE_CA_CERT`, `SESSION_SECRET` (32+ random chars), `AUTH_MODE` (same as your `.env`; `supabase` also needs `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`), the AI values from step 3, `QUOTA_COLLEGE_DAILY=300`, `QUOTA_GLOBAL_DAILY=1000`. Deploy, then set `APP_ORIGIN` to the exact production origin (`https://….vercel.app` or your domain) and redeploy. Preview URLs fail the CSRF origin check by design.
7. **Render.** New Blueprint → this repo → fill the `sync:false` values (same `DATABASE_URL` as Vercel). Deploy. Its logs must show `worker_started`.
8. **Create the college once** from your machine: `npm run setup -- "<College name>" <admin email> <password> "<Admin name>"`. Add more sign-ins with `npm run user:add`. Then sign in and complete **College setup**. Never run the test fixtures against Supabase (the script refuses).
9. **Live AI check.** Ask one tutor question and submit one quiz. The run banner must show "Live AI: <model>", not "Mock".
10. **Hosted smoke.** `/api/v1/health/ready` returns 200. Add one real student, sign in as them (roll number as password) and complete the four journeys.
11. **Rollback rehearsal.** Vercel → Deployments → previous → Promote to Production (Instant Rollback), then confirm health. Record the result in RELEASE-EVIDENCE.md.
12. **Alerts.** Vercel deployment notifications, Render worker failure notifications, and a Supabase usage alert.

Until step 9 passes, keep calling AI "mock / untested", not "live". Until steps 10–11 pass, don't call the app deployed.

## For a reviewer (e.g. Codex)

- Base revision: see `git log`. Product code is in `src/server` (domain + security), `src/worker`, `src/app` (UI + `/api/v1`) and `db/migrations`.
- Invariants to attack: tenant isolation (RLS + `college_id` in every query), complaint idempotency, lease fencing, `verified_closed` needing a ledger credit, no fixture AI in production, and model output rendered as text only.
- Commands: `npm run typecheck && npm test && npm run build && npm run e2e`.
- Known gaps: the 24 live AI eval cases (needs a key), the Supabase adapter, hosted backup/rollback/alerts, performance targets, and a nonce-based CSP.
