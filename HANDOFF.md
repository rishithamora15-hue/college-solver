# Handoff — 5 Oct 2026, 14:40 IST

Status: the app is complete and verified **locally** on synthetic data (see [docs/RELEASE-EVIDENCE.md](docs/RELEASE-EVIDENCE.md)). It is **not deployed**. Live AI and Supabase auth are **untested**.

## Owner actions, in order (about 1–2 h with access)

1. **Approve spend and pick accounts.** Render web + worker (`starter` in [render.yaml](render.yaml); Render has no free worker tier), Supabase project, and Anthropic API usage with a daily ceiling. Check current prices yourself; this repo assumes none.
2. **Supabase.** Create the project (region: Mumbai `ap-south-1`). Copy the **Session pooler** connection string into `DATABASE_URL` and download the CA certificate (Database settings → SSL configuration) into `DATABASE_CA_CERT` (file path locally, PEM text on Render). Migration 007 removes Supabase Data API access to every table; the app connects to Postgres directly and never uses the anon key.
3. **AI provider.** Gemini (chosen by the owner): create a key in Google AI Studio with a spend limit, set `AI_PROVIDER=gemini`, `GEMINI_API_KEY` and `RUNTIME_MODEL` (for example `gemini-3.8-flash`) on **both** web and worker. Anthropic still works with `AI_PROVIDER=anthropic`.
4. **Push the code.** Create a private GitHub repo and push: `git remote add origin <url> && git push -u origin master`.
5. **Render.** New Blueprint → this repo → fill the `sync:false` values. Set `APP_ORIGIN` to the exact `https://…onrender.com` origin. Deploy. `preDeployCommand` runs the migrations.
6. **Create the college once** from your machine (with the Supabase values in `.env`): `npm run db:migrate` then `npm run setup -- "<College name>" <admin email> <password> "<Admin name>"`. Then sign in and complete **College setup**. Never run the test fixtures against Supabase (the script refuses).
7. **Turn on live AI.** On both services set `AI_PROVIDER=gemini` (with key and model), then ask one tutor question and submit one quiz. The run banner must show "Live AI: <model>", not "Mock".
8. **Hosted smoke.** `/api/v1/health/ready` returns 200. Add one real student, sign in as them (roll number as password) and complete the four journeys.
9. **Rollback rehearsal.** Render → web service → Rollback to the previous deploy, then confirm health. Record the result in RELEASE-EVIDENCE.md.
10. **Alerts.** Render notifications for deploy failures and health check failures, plus a Supabase usage alert.

Until step 7 passes, keep calling AI "mock / untested", not "live". Until steps 8–9 pass, don't call the app deployed.

## For a reviewer (e.g. Codex)

- Base revision: see `git log`. Product code is in `src/server` (domain + security), `src/worker`, `src/app` (UI + `/api/v1`) and `db/migrations`.
- Invariants to attack: tenant isolation (RLS + `college_id` in every query), complaint idempotency, lease fencing, `verified_closed` needing a ledger credit, no fixture AI in production, and model output rendered as text only.
- Commands: `npm run typecheck && npm test && npm run build && npm run e2e`.
- Known gaps: the 24 live AI eval cases (needs a key), the Supabase adapter, hosted backup/rollback/alerts, performance targets, and a nonce-based CSP.
