# Deployment, verification, and operations

## Accounts and environments

Use existing accounts where possible: source repository/CI, Supabase, Render, and one model provider. Budget and credentials are not supplied. Provisioning paid resources requires the user's chosen account and spend authorization; prepare config and a cost worksheet first. Do not assume free tiers support always-on workers, backups, storage volume, or required regions.

Keep local, staging/evaluation, and real-data pilot credentials and data separate. Tuesday can use local + hosted synthetic evaluation; create a distinct real-data environment before onboarding students. Never copy real data into development.

Required server configuration, to define during implementation: `DATABASE_URL`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, selected provider API key and model ID, embedding model ID if used, `APP_ORIGIN`, `DATA_MODE`, `UPLOADS_ENABLED`, `EXTERNAL_DELIVERY_ENABLED`, per-run and daily budgets, worker concurrency, telemetry destination. Public auth config may be browser-visible; server role/provider keys must never use a public environment prefix.

## Deployment sequence

1. T01 creates web/worker build scripts, environment validation, Docker/container configuration, runtime pin, and `.env.example` with names only. Local commands must actually exist before documenting them as runnable.
2. Create evaluation database, auth configuration and private buckets; configure sign-in redirect allowlist and disable public self-enrollment unless explicitly intended. Apply migrations with a dedicated migrator role.
3. Seed two synthetic tenants and role-specific test accounts. Confirm private storage and tenant policies before exposing routes.
4. Deploy thin web shell immediately; configure TLS, domain/origin, health checks and auth callbacks. Next.js documents self-hosted deployment considerations in [Self-Hosting](https://nextjs.org/docs/app/guides/self-hosting).
5. Deploy worker from the same revision with a separate start command. It polls jobs and reports heartbeat; it must not run as a request handler or process-local background task. Render describes long-running processes in [Background Workers](https://render.com/docs/background-workers).
6. Run one end-to-end queued test. Confirm production-like environment variables, schema version, storage access and provider connectivity with synthetic input only.
7. Add remaining vertical slices behind server-side flags. Run migrations as a singleton release step, never concurrently from every instance startup.
8. Freeze a candidate commit/image; run staging tests; promote the same artifact; smoke-test hosted user journeys and alert routing.

The kit intentionally contains no pretend deployment YAML with guessed account IDs or executable app paths. T01/T14 must produce reviewed concrete config for the created codebase and selected hosting plan.

## CI gates to implement

PR gate: format/lint, TypeScript check, deterministic domain tests, SQL migration on clean test DB, cross-tenant API/storage tests, queue recovery integration tests, dependency/secret scan, build web and worker. Add four browser journeys using synthetic fixtures. Provider-dependent evals use a small bounded budget in a separate authorized job; missing credentials should report that gate untested, never mark it passed.

Do not rely solely on mocks for database isolation, transaction semantics or recovery. Local fake model tools are useful for state-machine tests, but at least one actual provider call must validate the deployed runtime before calling AI integration live.

## Release gates and pass criteria

| Gate | Evaluation release | Additional real-data pilot requirement |
|---|---|---|
| Core flows | All four flows complete and persist; disabled features visibly labeled | Representative real integration workflows verified by source owner |
| Authorization | Two-tenant/two-student negative suite has zero unauthorized reads/writes | Staff access review, institutional identity lifecycle, MFA |
| Queue | Kill/restart, duplicate delivery, stale lease, cancellation tests pass | Sustained workload and operator replay procedures tested |
| AI behavior | At least 24 curated cases: 6/domain, plus 6 cross-domain/injection cases; zero unauthorized actions; citations resolve | Expand at least 100 representative reviewed cases; proposed grounded-answer threshold >=90%, human review and stratified error analysis |
| UI | Keyboard/mobile paths, empty/error/loading states usable | Accessibility review with actual student/operator feedback |
| Uploads | Bounded safe pipeline passes or uploads disabled | Real document pipeline approved and verified |
| Recovery | Backup created/restored in isolated DB; candidate rollback rehearsed | Defined recovery objectives met with measured evidence |
| Operations | Health/queue/provider alerts received, flags tested, known issues recorded | Named primary/backup operator and incident process accepted |

Evaluation cases must include missing documents, conflicting scholarship state, two semesters sharing a subject name, unavailable material, fabricated resume instruction, expired listing, manipulated tenant ID, and model provider timeout. Grade evidence and actions, not just pleasant wording. Human review of factual correctness is required; another model judge is not sufficient for financial claims or access-control outcomes.

Proposed performance targets (not measured claims): non-AI API p95 <1 second under 20 concurrent evaluation users; queued job acceptance <1 second; normal AI run p95 <30 seconds with available provider; 50 simultaneous requests must not exceed quota/concurrency limits. Run measured tests and record hardware/plan, dataset, provider and errors. If missed, reduce promised capacity or improve the bottleneck.

## Monitoring and cost

Track request error rate/latency, auth failures, queue age/depth, worker heartbeat, expired leases, retry/dead-letter count, provider latency/errors, token use/cost per run, rejected tool calls, citation failures, upload failures and storage growth. Correlate with trace/run IDs without storing private payloads.

Initial alert suggestions: worker heartbeat missing >2 minutes; oldest interactive queued job >2 minutes; API error rate >5% for 5 minutes with at least 20 requests; database unreachable; repeated authorization denials; daily budget at 80% and hard stop at 100%. Tune after measuring; an alert needs an actual destination and operator test.

Before provisioning, fill a budget sheet: hosting web + worker(s), DB/backups/storage, model input/output tokens, embeddings, email, logging and network egress. Model cost estimate = sum(input tokens/1M * current input price + output tokens/1M * current output price), using exact configured models. No current price is assumed by this plan. Start with 10-20 invited synthetic evaluation users and an explicitly chosen hard daily AI ceiling.

## Backup, rollback and migrations

Set proposed real-data objectives RPO <=24 hours, RTO <=4 hours, subject to selected paid plan capability and institutional agreement. Provider defaults are not proof. Back up database and required objects; preserve the relation between database manifests and object versions. Restore into a separate environment, reconcile financial totals/document counts, confirm login and tenant boundaries, and measure duration.

Use expand/contract migrations: add backward-compatible fields/indexes, deploy compatible readers/writers, backfill with checkpoints, verify, remove old fields in a later release. Do not run destructive down migrations during an incident. App rollback deploys the prior immutable image if schema-compatible; otherwise pause writes and apply a reviewed forward repair. Record the decision.

Before Tuesday handoff: freeze schema, keep previous image, export synthetic fixture/backup, verify kill switches for AI/uploads/external delivery, and document exact release IDs and rollback commands for the chosen hosting service.

## Handoff package

Hosted URL and data mode; release commit/image; setup guide with real tested commands; account invitations via private channel; four-flow test evidence; distribution/recovery evidence; model/prompt/source versions; cost cap; known limitations; operator and rollback instructions. No credentials in README/screenshots. A demo recording can be a fallback for presentation, but label it as a recording, never a live system.
