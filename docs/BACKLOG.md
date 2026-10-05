# Ordered implementation backlog

All tickets start **not implemented**. Estimates are focused engineering time and can exceed the deadline if integrations or reviews fail. Follow dependency order. Record actual evidence alongside tickets during implementation; this document contains acceptance targets, not results.

**Status at 5 Oct 14:40 IST** (evidence: [RELEASE-EVIDENCE.md](RELEASE-EVIDENCE.md)):

- **T00–T13 implemented and verified locally.** T07 uses seeded curated documents. T09 uses pasted text because uploads are disabled.
- **T14 partial.** Done: `render.yaml`, the production smoke and the local restore drill. Blocked: the hosted deploy, hosted smoke, rollback and alerts. These need Render/Supabase access and spend approval.
- **Live-AI acceptance is untested.** There is no key, so every AI check ran on the labeled mock.

| ID / estimate | Depends on | Deliverable / likely files | Done when | Primary skill |
|---|---|---|---|---|
| T00 / 30m | None | Confirm cutoff, synthetic vs real-data gate, accounts, runtime provider; decisions record | Assumptions, account access and budget boundary explicit | `college-scope` |
| T01 / 1h | T00 | TypeScript workspace, web + worker build targets, env validation, health endpoints, lockfiles, CI skeleton | Clean install/build works; no secrets; both entrypoints launch | `college-bootstrap` |
| T02 / 45m | T01 | Shell, screen routes, tokens, reusable status/empty/error components | Mobile/keyboard shell works across four modules | `college-design` |
| T03 / 1.5h | T01 | Auth/membership, migrations, private storage, synthetic fixtures, scoped repositories | Two tenants isolated; student cannot grant staff role | `college-data`, `college-auth` |
| T04 / 1.5h | T03 | Job leases, dedup, retries, run status API, separate worker; first hosted shell | Restart and two-worker tests preserve one durable effect | `college-distributed` |
| T05 / 1h | T02,T03 | Read-only fee dashboard, scholarship timeline/checklist, source freshness | Exact money cases including expected vs credited distinction pass | `college-finance` |
| T06 / 1.5h | T04,T05 | Scholarship agent, draft/review/submit complaint, scoped staff response | Persistent complaint and receipt, duplicate submit stable, no unauthorized email | `college-agents`, `college-finance` |
| T07 / 1h | T03,T04 | Approved material ingestion, document provenance, tenant/subject retrieval | Wrong tenant/curriculum never retrieved; source/page preserved | `college-ingestion` |
| T08 / 1.5h | T02,T07 | Tutor specialist, backlog navigation, paper downloads and citations | Correct scoped answer; unsupported question abstains; inaccessible links denied | `college-lms` |
| T09 / 1.5h | T02,T04 | Safe resume parser or text fallback, resume version, JD analysis, training next steps | Correct extraction preview, truthful edits, no invented readiness percentage | `college-career` |
| T10 / 1h | T03,T09 | Curated jobs/filter/detail, JD-to-resume link, external apply | All job categories, expiry and link safety tested; click not called application | `college-jobs` |
| T11 / 45m | T04,T06 | In-app reminder schedule/preferences, dedup/suppression | No reminder after recorded payment/resolution; repeated job no duplicate | `college-integrations` |
| T12 / 1.5h | T06,T08,T09,T10,T11 | Browser flows, API contracts, adversarial AI cases, stale-source tests | Evidence for all core flows; failures mapped to owner/ticket | `college-testing` |
| T13 / 1.5h | T12 | Threat-focused review, secret/dependency scans, negative access suite, hardening | All evaluation blockers resolved; real-data blockers explicitly recorded | `college-security` |
| T14 / 2h | T13 | Deployment config, immutable candidate, smoke tests, restore/rollback and alerts | Release gate evidence, tested rollback, operator handoff | `college-release`, `college-operations` |

Timeboxes overlap conceptually with the calendar's review/buffer windows, not permission to skip acceptance. At the end of each ticket, stop adding features and record the next dependency.

## Stretch and full-vision tickets

| ID | Depends on | Feature and acceptance |
|---|---|---|
| P01 | T14 + data-owner access | Real ERP/scholarship adapters: signed/authenticated feeds, staged imports, duplicate/reversal/partial-credit reconciliation, source timestamps |
| P02 | P01 + institution policy | Configurable fee penalties and deadline rules; approved policy version drives display; no automatic attendance enforcement |
| P03 | T08 + licensed content | All branches/eight semesters/regulations and backlogs populated from approved curriculum sources; content completeness report |
| P04 | P03 | Past-paper exam analysis: deduplicated questions, topic mapping, transparent counts and sample years; no exam prediction guarantee |
| P05 | T09 | Resume builder/export with version history, truthful edits, accessible templates and rendered export verification |
| P06 | T09 + rubric owner | Technical/nontechnical training, aptitude, communication, HR/technical interview practice, assessment history; readiness score computed from published measured rubric |
| P07 | P06 | Professional behavior/body-language educational coaching; no unsupported biometric/emotion-based employability scoring; optional consented practice input |
| P08 | T10 + authorized feeds | Approved job feeds, dedup, freshness/expiry rechecks, personalized matching and reminders, application tracking distinguished from external confirmation |
| P09 | T11 + delivery approval | External complaint email and notification integration: verified directory, preview/authorization, delivery receipts, uncertain-send reconciliation |
| P10 | T14 + operational owner | Real-data pilot approval, privacy lifecycle/export/deletion, institutional SSO/invitation lifecycle, full staff permissions |
| P11 | P10 + load evidence | HA capacity plan, worker pools if needed, database failover proof, larger eval suite, disaster recovery drill |
| P12 | T08 + sandbox requirements | Optional sandboxed code execution; network isolation, quotas, cleanup and adversarial verification before enabling |

## Ticket handoff format

```text
Ticket and acceptance:
Base revision and owned paths:
Relevant contract / skill:
Implementation summary:
Commands actually run and result:
Screenshots/log IDs/receipts (no private data):
Unverified integrations and blockers:
Next dependency:
```

## Deadline cuts, in order

Cut animation/polish, resume export, advanced scores, auto-job feeds, external email, full curriculum population, OCR, and arbitrary uploads if the safe pipeline is missing. Keep manual text and curated sources explicit. Never cut tenant isolation, correct balances, truthful status, source attribution, bounded AI cost, or persistence and retry safety while still claiming those capabilities work.
