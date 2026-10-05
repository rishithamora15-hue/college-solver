# Handoff — 5 Oct 2026, 14:40 IST

Status: the app is complete and verified **locally** on synthetic data (see [docs/RELEASE-EVIDENCE.md](docs/RELEASE-EVIDENCE.md)). It is **not deployed**. Live AI and Supabase auth are **untested**.

## Owner actions, in order (about 1–2 h with access)

1. **Approve spend and pick accounts.** Render web + worker (`starter` in [render.yaml](render.yaml); Render has no free worker tier), Supabase project, and Anthropic API usage with a daily ceiling. Check current prices yourself; this repo assumes none.
2. **Supabase.** Create the project. Copy the pooled Postgres connection string, `SUPABASE_URL` and the anon key. Disable public sign-ups.
3. **Anthropic.** Create an API key with a spend limit. Choose a model ID for `RUNTIME_MODEL` (for example `claude-sonnet-5-5`).
4. **Push the code.** Create a private GitHub repo and push: `git remote add origin <url> && git push -u origin master`.
5. **Render.** New Blueprint → this repo → fill the `sync:false` values. Set `APP_ORIGIN` to the exact `https://…onrender.com` origin. Deploy. `preDeployCommand` runs the migrations.
6. **Seed synthetic data once** from your machine: `DATABASE_URL=<supabase url> npm run db:seed`.
7. **Turn on live AI.** On both services set `AI_PROVIDER=anthropic`, then run one tutor question. The run banner must show "Live AI: <model>", not "Mock".
8. **Hosted smoke.** `/api/v1/health/ready` returns 200. Sign in as `asha` and complete the four journeys. Sign in as `meera` and confirm `/fees/00000000-0000-4000-8000-000000000073` shows "not found".
9. **Rollback rehearsal.** Render → web service → Rollback to the previous deploy, then confirm health. Record the result in RELEASE-EVIDENCE.md.
10. **Alerts.** Render notifications for deploy failures and health check failures, plus a Supabase usage alert.

Until step 7 passes, keep calling AI "mock / untested", not "live". Until steps 8–9 pass, don't call the app deployed.

## For a reviewer (e.g. Codex)

- Base revision: see `git log`. Product code is in `src/server` (domain + security), `src/worker`, `src/app` (UI + `/api/v1`) and `db/migrations`.
- Invariants to attack: tenant isolation (RLS + `college_id` in every query), complaint idempotency, lease fencing, `verified_closed` needing a ledger credit, no fixture AI in production, and model output rendered as text only.
- Commands: `npm run typecheck && npm test && npm run build && npm run e2e`.
- Known gaps: the 24 live AI eval cases (needs a key), the Supabase adapter, hosted backup/rollback/alerts, performance targets, and a nonce-based CSP.
