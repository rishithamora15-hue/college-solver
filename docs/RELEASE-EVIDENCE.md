# Release evidence — evaluation pilot (synthetic data)

Recorded Mon 5 Oct 2026, 14:40 IST, on the build machine (Windows 11, Node 22.23.2, PostgreSQL 18.4 via embedded-postgres). Every result below comes from a command that was actually run. **Nothing is deployed.** No live model was called. Supabase auth was not exercised.

## Commands and results

| Check | Command | Result |
|---|---|---|
| Typecheck | `npm run typecheck` | Clean (0 errors) |
| Production build | `npm run build` | Passes; 33 routes (13 pages + 20 API handlers) |
| Domain + DB integration | `npm test` | **34/34 pass**: finance 5, access 11, queue 7, flows 11. Real PostgreSQL. AI = mock fixture |
| Browser journeys | `npm run e2e` | **6/6 pass**: 5 desktop (1280px) + 1 mobile (390px), system Edge. AI = mock fixture, labeled "Mock AI" in the UI |
| Production smoke | `next start` with `AI_PROVIDER=none` and `DEMO_AUTH=allow` | live/ready 200; unauthenticated API 401; unauthenticated page 307 to /signin; cross-origin POST 403; demo sign-in sets an HttpOnly + Secure cookie; AI run returns `provider_unavailable` 503; a complaint without `Idempotency-Key` returns 400; CSP, nosniff and Referrer-Policy headers present |
| Config guards | `env()` with `NODE_ENV=production` | Refuses `AI_PROVIDER=fixture`; refuses demo auth without `DEMO_AUTH=allow` |
| Dependencies | `npm audit` | 0 vulnerabilities |
| Secret scan | grep over tracked and untracked files (API-key, JWT, private-key and real-email patterns) | No secrets. Only false positives: doc URLs and the local throwaway DB password `postgres` |
| Backup/restore | `npx tsx scripts/restore-drill.ts` | Cold copy restored on a separate port in 7.9 s. Counts, assessed (46,000,000 paise) and settled (25,000,000 paise) totals, document hash and 30 RLS policies all match. `app_rw` with no tenant set reads 0 student rows |

## Release gates (from RELEASE.md)

| Gate | Status | Evidence / gap |
|---|---|---|
| Core flows | **Met locally** | All four flows persist and pass in the browser: scholarship → reviewed complaint → receipt → staff update; tutor with sources and download; resume/JD analysis; jobs with self-reported application. Disabled features are labeled (uploads, email, AI when not configured) |
| Authorization | **Met locally** | Two-tenant negative suite: guessed IDs, another college's case or document, a revoked staff member, a student self-escalating role (blocked by RLS), and tokens bound to the requesting user |
| Queue | **Met locally** | Real worker SIGKILL followed by recovery, two concurrent workers, stale lease fencing, retry to dead-letter, cancellation, and dedup giving one durable effect |
| AI behavior | **Not met** | Verifiers, budgets, kill switches and the prompt-injection data boundary are tested with the **mock** only. The 24 curated live cases and one real provider call are **untested**: no API key |
| UI | **Met locally** | Keyboard (skip link first, visible focus), 390px with no horizontal scroll on 8 screens, empty/error/not-found states, and an error boundary |
| Uploads | **Met (disabled)** | Uploads disabled. The resume is entered as pasted text |
| Recovery | **Partial** | Local restore rehearsed. Hosted backup/restore and rollback **not rehearsed** (no hosting) |
| Operations | **Not met** | No hosted alerts or destinations. Health endpoints and structured worker logs exist |

## Known issues and limits

- The production AI path (Anthropic) has never run. Treat it as unverified until a key is set and one synthetic run completes.
- The Supabase password sign-in adapter is untested. Demo sign-in is synthetic-only and refused in production unless explicitly allowed.
- The dev server logged one `The destination stream closed early` during navigation in the e2e run. No test failed. Not investigated.
- The CSP allows `'unsafe-inline'` scripts for Next's bootstrap. Moving to nonces is an option if stricter CSP is required.
- Performance targets in RELEASE.md were **not measured**.
- Real-data gates in SECURITY.md remain open. This build is for synthetic evaluation only.
