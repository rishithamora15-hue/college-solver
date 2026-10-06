# Where each part of the app lives

Open `college-solver-kit` as the VS Code workspace root. `(app)` is a Next.js route group: it organizes signed-in pages but does **not** appear in URLs. `page.tsx` renders a screen; `route.ts` handles an HTTP API request. The `.vscode/settings.json` file hides generated folders from the Explorer and search; it does not delete them.

| Feature | Screen (`src/app/(app)`) | API (`src/app/api/v1`) | Business rules (`src/server`) | Browser check (`e2e`) |
|---|---|---|---|---|
| Overview | `page.tsx` | `me`, `health` | `page.ts`, `profile.ts`, `notify.ts` | `visual.spec.ts`, `mobile.spec.ts` |
| Fees and scholarships | `fees/page.tsx`, `fees/[caseId]/page.tsx` | `runs` | `finance.ts`, `ai.ts`, `runs.ts`, `specialists.ts` | `journeys.spec.ts` |
| Complaints | `complaints/page.tsx`, `complaints/new/page.tsx`, `complaints/[id]/page.tsx` | `complaint-drafts`, `complaints`, `complaints/[id]/events` | `complaints.ts`, `notify.ts` | `journeys.spec.ts` |
| Learning and tutor | `learn/page.tsx`, `learn/tutor.tsx` | `runs`, `documents/[id]/download` | `learn.ts`, `ai.ts`, `runs.ts`, `specialists.ts` | `journeys.spec.ts` |
| Resume and career | `career/page.tsx` | `resume/preview`, `resume-versions`, `runs` | `career.ts`, `ai.ts`, `runs.ts`, `specialists.ts` | `journeys.spec.ts` |
| Jobs | `jobs/page.tsx`, `jobs/[id]/page.tsx` | `jobs/[id]/track` | `jobs.ts` | `journeys.spec.ts`, `mobile.spec.ts` |
| Settings (name, mobile number) | `settings/page.tsx` | `notification-preferences`, `me/profile` | `profile.ts` | `journeys.spec.ts` |
| Administration office | `admin/page.tsx`, `admin/students/[id]/page.tsx`, `complaints/*` | `notices`, `admin/documents`, `admin/cases/[id]` | `admin.ts`, `complaints.ts`, `notify.ts` | `journeys.spec.ts`, `visual.spec.ts` |
| Placement cell | `placement/page.tsx`, `placement/jobs/[id]/page.tsx` | `placement/jobs`, `placement/jobs/[id]`, `placement/jobs/[id]/nudge` | `jobs.ts` | `journeys.spec.ts`, `visual.spec.ts` |
| Academics (timetable, attendance, marks, notes) | `academics/page.tsx`, `faculty/page.tsx`, `faculty/classes/[id]/page.tsx`, `admin/academics/page.tsx` | `faculty/attendance`, `faculty/assessments`, `faculty/notes`, `admin/assignments`, `admin/timetable` | `academics.ts` | `college.spec.ts` |
| Requests and uploads | `requests/page.tsx`, `requests/[id]/page.tsx` (certificate), `admin/requests/page.tsx`, `fees/[caseId]/page.tsx` | `requests`, `admin/requests/[id]`, `uploads`, `uploads/[id]` | `requests.ts` | `college.spec.ts` |
| Office money and records | `admin/students/*`, `admin/fees/page.tsx`, `admin/notices/page.tsx`, `receipts/[id]/page.tsx` | `admin/students`, `admin/fees`, `admin/payments`, `admin/cases/[id]/credit`, `admin/broadcast`, `admin/export` | `admin.ts`, `finance.ts` | `college.spec.ts` |
| Placement rounds and stats | `placement/jobs/[id]/page.tsx`, `placement/stats/page.tsx` | `placement/jobs/[id]/stage`, `placement/export` | `jobs.ts` | `college.spec.ts` |
| Notices (live pop-ups) | `client.tsx` (`NoticeCenter`) in `(app)/layout.tsx` | `notifications` | `notify.ts` | `journeys.spec.ts` |
| Sign-in (Student / Faculty & Staff) | `src/app/signin/page.tsx` | `auth/password`, `auth/signout` | `auth.ts`, `session.ts` | `journeys.spec.ts`, `e2e/sign-in.ts` |

Shared code:

- `src/app/(app)/layout.tsx`: signed-in navigation and top bar. `src/app/layout.tsx`: root layout.
- `src/app/client.tsx`: browser interactions used across screens (sign-in, AI run display, complaint forms, resume editor, job tracking, preferences). Search for the component name shown in a page import to find its implementation.
- `src/app/ui.tsx`: reusable display helpers (money, dates, status, empty/not-found states).
- `src/app/globals.css`: global styles, layout, responsive rules and motion.
- `src/server/db.ts`, `http.ts`, `page.ts`, `env.ts`: database access, HTTP helpers, server page context and configuration.
- `src/worker/main.ts` and `src/server/queue.ts`: background jobs. `db/migrations/`: database schema and permissions.
- `tests/`: server/domain tests. `e2e/`: browser journeys and visual captures. `scripts/`: local DB, migrations, seed, restore drill and validation tools.
- `run.cmd`: one-command PowerShell launcher; calls `run.sh` with Git Bash to start database, worker and website.
- `docs/`: product, design, architecture, security, release and evidence. `.agents/skills/`: canonical Codex skills; `.claude/skills/`: Claude mirrors.

Start from the screen you want to change. Follow its imports to the client interaction and server rule, then the matching API handler and browser test. For example, scholarship complaint review runs through `fees/[caseId]/page.tsx` → `client.tsx` (`Investigate`) → `api/v1/complaint-drafts/route.ts` → `server/complaints.ts` → `complaints/new/page.tsx`.
