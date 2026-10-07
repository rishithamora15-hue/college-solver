# AI College Problem Solver: build kit

One product, four connected modules, one student identity. This kit consolidates all three supplied PDFs into an implementation plan and reusable Claude Code/Codex skills.

**Your constraints:** solo developer; Tuesday afternoon, assumed **6 October 2026, 14:00 IST**. Planning began around 00:32 IST on 5 October: approximately 37.5 elapsed hours remain. The exact afternoon cutoff needs confirmation; 14:00 is the planning assumption.

**Deliverable status (6 Oct):** the application runs on real data entered through the app (local Postgres or Supabase), verified by automated tests on fixture data. Evidence is in [RELEASE-EVIDENCE.md](docs/RELEASE-EVIDENCE.md) and next steps are in [HANDOFF.md](HANDOFF.md). The app is **not deployed**. Live AI and Supabase auth are **untested** because no credentials were supplied.

## Run locally (Node 22)

On Windows PowerShell, run `./run.cmd`. It launches [run.sh](run.sh) through Git Bash (plain `bash` in PowerShell may start WSL, where Node is not installed). The launcher installs dependencies when missing, creates a `.env` when missing, starts the embedded database (or uses Supabase when `DATABASE_URL` points there), applies migrations, and runs the worker and website together. Press Ctrl+C to stop. A newly created `.env` uses clearly labeled mock AI; an existing `.env` keeps your settings.

### Sign in

The sign-in page has two choices only: **Student** and **Faculty & Staff**.

- Students sign in with their college email; the password is their **roll number** (not case-sensitive).
- Staff accounts are the **administration office**, the **placement cell** or **faculty** (teachers). Sign-in sends each one to its own dashboard.

| Role | What they do here |
|---|---|
| Student | Timetable, attendance (75% warning), grade card · fees, receipts, scholarship status and online document upload · certificate and leave requests · notes, papers and AI tutor · resume and jobs (eligibility, interview rounds) · complaints · live notices · mobile number and password |
| Faculty | Today's classes · mark attendance per period · create assessments, enter marks, publish · share notes and question papers |
| Administration office | Students (add one, Excel/CSV import, edit class/CGPA) · fees per class or student, payments with receipts, scholarship credits · document verification · certificate and leave approvals · teachers and timetable · notices to a student, a class or the whole college · complaints · Excel reports |
| Placement cell | Post drives with eligibility rules (CGPA, backlogs, branch) · who applied / opened but did not apply / has not looked · reminders · interview rounds · statistics and Excel export |

### Real data: first run

The app starts **empty**. There are no demo accounts. Do this once per college:

1. **Database.** Local: leave `DATABASE_URL` as in `.env.example`. Supabase: put the **Transaction pooler** connection string (port 6543) in `DATABASE_URL`, download the CA certificate (Supabase → Database settings → SSL configuration) and set `DATABASE_CA_CERT` to its path. `run.cmd` then uses Supabase instead of the local database.
2. **College and first administrator.** `npm run setup -- "<College name>" <admin email> <password> "<Admin name>"` (password: 10+ characters).
3. **Sign in** as that administrator (Faculty & Staff) and open **College setup**. Follow its *Getting started* list: branches and syllabus, faculty and placement accounts, students (one by one or from a spreadsheet), timetable, fees and scholarship schemes.
4. Students sign in with their college email and their roll number as the first password.

The fictional accounts in `scripts/seed.ts` exist only for the automated tests (`npm test`, `npm run e2e`), which use their own throwaway databases. The seed script refuses any database that is not on this machine.

### Manual commands (optional)

```bash
npm ci
cp .env.example .env            # set SESSION_SECRET (32+ chars); AI_PROVIDER=fixture for the labeled mock
npm run db:local                # terminal 1: PostgreSQL on :54329 (keep running)
npm run db:migrate && npm run setup -- "<College>" <admin email> <password> "<Admin name>"
npm run dev                     # terminal 2: web on http://localhost:3000 → /signin
npm run worker                  # terminal 3: background worker (AI runs, notifications, reminders)
npm test                        # DB-backed tests (own throwaway DB on :54330)
npm run e2e                     # browser checks (own DB on :54331, uses installed Microsoft Edge)
```

`.env` is not loaded automatically by the worker and scripts. Export its variables in your shell first, or prefix the commands with them.

Start with [the implementation plan](docs/IMPLEMENTATION-PLAN.md), then [the ordered backlog](docs/BACKLOG.md). Use [the Claude/Codex workflow](docs/AI-BUILD-WORKFLOW.md) to execute one ticket at a time.

For finding code by feature, open [CODEMAP.md](CODEMAP.md). VS Code hides generated test/build folders through `.vscode/settings.json` so the Explorer shows source files first.

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
