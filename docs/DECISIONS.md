# Decisions register

Recorded during implementation. Each entry: decision, reason, consequence. Newest last.

| # | Date (IST) | Decision | Reason / consequence |
|---|---|---|---|
| D01 | 5 Oct 08:22 | Deadline confirmed as Tue 6 Oct 2026 14:00 IST; ~30 h remain at start of build. | Clock checked on the build machine. Tuesday scope per IMPLEMENTATION-PLAN §2; cut order per BACKLOG. |
| D02 | 5 Oct | Data mode: **synthetic only**, two synthetic colleges. | No institutional data-owner approval exists. Real-data gates in SECURITY.md stay open. |
| D03 | 5 Oct | One npm package instead of the `apps/*` + `packages/*` monorepo. Next.js app in `src/app`, shared server code in `src/server`, worker entrypoint `src/worker/main.ts` run as a **separate process**. | Solo developer; one tsconfig/lockfile. Web and worker still deploy and scale independently. Split into packages later only if a consumer needs it. |
| D04 | 5 Oct | Local/test PostgreSQL via `embedded-postgres` (real PostgreSQL binaries). Hosted DB via `DATABASE_URL` (Supabase Postgres intended). | No Docker or PostgreSQL install on the build machine. Tests run against real PostgreSQL, not mocks. |
| D05 | 5 Oct | Plain SQL migrations + small runner; `pg` with parameterized queries; no ORM. App connects as non-owner role `app_rw`; RLS policies on tenant tables keyed by `SET LOCAL app.college_id`. | Defense in depth beside server authorization. Migrations run as owner in a controlled release step. |
| D06 | 5 Oct | Auth: Supabase Auth adapter when `SUPABASE_URL`/`SUPABASE_ANON_KEY` are set. Otherwise a **synthetic demo sign-in** (HMAC-signed HttpOnly cookie, pick a seeded synthetic user) that refuses to start in production unless `DEMO_AUTH=allow` is explicit. Identity provider only supplies `user_id`; tenant and role always come from `memberships`. | No Supabase project credentials available. Supabase path is **untested** until credentials exist. |
| D07 | 5 Oct | Files: seeded sample papers stored in PostgreSQL (`bytea`), served only through an authorized route using a 60-second HMAC-signed link. Student uploads **disabled**; resume = manual text entry. | No Supabase Storage credentials; no malware scanner/safe PDF parser ready. SECURITY.md upload cut line. Deferred in BACKLOG (P05/T09 note). |
| D08 | 5 Oct | Runtime model provider: Anthropic Messages API (`@anthropic-ai/sdk`), model from `RUNTIME_MODEL` env. `AI_PROVIDER=fixture` is a deterministic **mock** for tests/local only, refused in production, labeled "Mock AI" in UI. | No runtime API key on the machine. Live AI = **untested/blocked** until a key is configured. |
| D09 | 5 Oct | Retrieval: PostgreSQL full-text search filtered by tenant/curriculum/subject before ranking. No pgvector/embeddings on Tuesday. | No embedding provider credential; keyword retrieval over small curated corpus is sufficient for the pilot and testable. |
| D10 | 5 Oct | AI output rendered as plain text (paragraphs + fenced code as `<pre>`), never as HTML. No markdown library. | Removes XSS surface from model output. |
| D11 | 5 Oct | Email/external delivery: none. Complaint routing records the approved department; notifications are in-app only. | Plan default; P09 deferred. |
| D12 | 5 Oct | Local git repository initialized (none existed). No remote configured. | Needed for revisions, lockfile commits and release pinning. |
| D13 | 5 Oct 14:30 | Browser tests (Playwright 1.63, system Edge channel) run against `next dev` with the fixture provider. Production mode is covered by a separate `next start` smoke with `AI_PROVIDER=none`. | Fixture AI is refused when `NODE_ENV=production` (by design); not weakening that guard for tests. |
| D14 | 5 Oct 14:35 | Local PostgreSQL runs with `io_method=sync`. | On Windows, PG18 `io_worker` children outlived `stop()` and held ports/shared memory, breaking reruns. |
| D15 | 5 Oct 14:36 | Restore rehearsal done as a cold physical copy (`scripts/restore-drill.ts`). | Installed `pg_dump` is v17 and refuses the v18 server. Hosted (Supabase) backup/restore still needs its own drill. |
| D16 | 5 Oct 14:38 | Migration 002 grants `app_rw` to the migrating owner. `render.yaml` written but **not applied**. | Hosted owners are not superusers and need membership to `SET ROLE`. No Render account access and no spend approval. |
