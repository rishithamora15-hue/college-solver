# AI College Problem Solver: build kit

One product, four connected modules, one student identity. This kit consolidates all three supplied PDFs into an implementation plan and reusable Claude Code/Codex skills.

**Your constraints:** solo developer; Tuesday afternoon, assumed **6 October 2026, 14:00 IST**. Planning began around 00:32 IST on 5 October: approximately 37.5 elapsed hours remain. The exact afternoon cutoff needs confirmation; 14:00 is the planning assumption.

**Deliverable status (5 Oct 14:40 IST):** the application is built and verified **locally** on synthetic data. Evidence is in [RELEASE-EVIDENCE.md](docs/RELEASE-EVIDENCE.md) and next steps are in [HANDOFF.md](HANDOFF.md). The app is **not deployed**. Live AI and Supabase auth are **untested** because no credentials were supplied.

## Run locally (Node 22)

```bash
npm ci
cp .env.example .env            # set SESSION_SECRET (32+ chars); AI_PROVIDER=fixture for the labeled mock
npm run db:local                # terminal 1: PostgreSQL on :54329 (keep running)
npm run db:migrate && npm run db:seed
npm run dev                     # terminal 2: web on http://localhost:3000 → /signin, pick a synthetic user
npm run worker                  # terminal 3: background worker (AI runs, notifications, reminders)
npm test                        # 34 DB-backed tests (own throwaway DB on :54330)
npm run e2e                     # 6 browser journeys (own DB on :54331, uses installed Microsoft Edge)
```

`.env` is not loaded automatically by the worker and scripts. Export its variables in your shell first, or prefix the commands with them.

Start with [the implementation plan](docs/IMPLEMENTATION-PLAN.md), then [the ordered backlog](docs/BACKLOG.md). Use [the Claude/Codex workflow](docs/AI-BUILD-WORKFLOW.md) to execute one ticket at a time.

| File | Purpose |
|---|---|
| [Implementation plan](docs/IMPLEMENTATION-PLAN.md) | Scope, deadline, dependencies, cut lines, acceptance gates |
| [Design specification](docs/DESIGN.md) | Screens, journeys, components, accessibility, failure states |
| [Architecture](docs/ARCHITECTURE.md) | Distributed workers, runtime agents, failure handling, context |
| [Data and API contracts](docs/DATA-API.md) | Entities, permissions, state machines, endpoint contracts |
| [Security](docs/SECURITY.md) | Threats, privacy, hardening, real-data release gate |
| [Release and operations](docs/RELEASE.md) | Deployment sequence, verification, rollback, monitoring |
| [Backlog](docs/BACKLOG.md) | Executable tickets with dependencies and evidence |
| [AI build workflow](docs/AI-BUILD-WORKFLOW.md) | Copy-ready prompts, handoffs, skill installation |
| [Blueprint traceability](docs/TRACEABILITY.md) | Every major requested feature assigned to a release |
| [Sources and decisions](docs/SOURCES.md) | Source documents, official documentation, assumptions |
| [Skills catalog](SKILLS.md) | 18 task-specific skills, available for both tools |

Open **this folder** as the project root in Claude Code or Codex. Project skills are included in `.agents/skills` for Codex and `.claude/skills` for Claude Code. Canonical skill files live under `.agents/skills`; run `python scripts/sync_skills.py` after editing them. Run `python scripts/validate_kit.py` to check skill metadata, local links, and mirror parity.

The shared instructions are [AGENTS.md](AGENTS.md); [CLAUDE.md](CLAUDE.md) points Claude to them. These files do not grant permission to spend money, send messages, or deploy into unspecified accounts.

Tuesday's intended release is an **invite-only evaluation pilot using synthetic records**, with actual application persistence, hosted web and worker processes, real AI calls where keys are available, and clear integration labels. It becomes a real-student pilot only after the security, data-owner, operational, and integration gates pass. Unfinished gates remain visible; dates do not waive them.
