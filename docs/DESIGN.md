# Product and interface specification

## Shared shell

Desktop: sidebar with Overview, Fees & Scholarships, Learn, Career, Jobs; top bar with college, profile, notifications. Mobile: compact primary navigation with a labeled More menu; content remains usable at 360 px width. Staff sees an additional scoped Workspace entry. Never show unauthorized navigation as the only access control.

Use one neutral background, one primary accent, high-contrast text, 8 px spacing rhythm, readable 16 px body, restrained cards and clear tables. Prefer existing accessible components. Status always has a text label, not only a color. Dates show locale and timezone when ambiguity matters. Money shows INR and grouping; calculations remain integer paise on the server.

Global states: loading/skeleton, empty with next action, validation error, access denied, stale data, provider unavailable, queued/running job, cancelled/failed job, successful action with durable receipt. Preserve user input on transient failure. Render AI markdown safely; no raw HTML execution.

## Screens and acceptance

| Screen | Required content and action | Acceptance |
|---|---|---|
| Sign in / onboarding | Invited identity, verified institution membership, branch/regulation/year/semester | Editing profile cannot change role or institution membership |
| Overview | Outstanding actions, deadline cards, continue studying, resume/job shortcuts | Cards reflect stored module state and show data freshness |
| Fees | Year/category breakdown, assessed/paid/balance, expected scholarship separate from received credit | No approved-but-uncredited scholarship counted as received payment |
| Scholarship detail | Status timeline, required/missing/expired documents, cited policy, dispute action | Unknown status is displayed as unknown, with source timestamp |
| Complaint workspace | Evidence, tentative explanation, responsible department, editable draft, Submit | Review shows recipient/content; receipt and tracking ID after save |
| Complaint timeline | Submitted, assigned, response, evidence, resolution verification, reopen | Administrative closure and verified credited amount are visibly distinct |
| Subject library | Branch/regulation/semester/subject/topic selectors, backlog access | Current-year student can access authorized earlier-semester subject |
| Tutor | Scope breadcrumb, question, answer, source/page references, follow-up | Changing subject clears or re-scopes chat; stale context not carried over |
| Papers | Subject/year filters, accessible download, source/license | Unauthorized document download denied even with guessed URL |
| Career | Resume editor/upload, target role/JD, extraction preview, suggestions and gaps | User can correct extraction; suggestions never fabricate achievements |
| Training | Evidence-based next steps, practice links, completion state | Missing assessment displays unassessed instead of a invented score |
| Jobs | Campus/off-campus, IT/non-IT, location, deadline filters; source verification time | Expired/stale records labeled; source link opens safely |
| Job detail | Eligibility, JD, requirements, optional salary, customize resume, official apply | Click tracking is not displayed as confirmed application submission |
| Staff workspace | Scoped complaints, content publishing, jobs, import status | Financial staff cannot read resumes by default; actions audited |
| Settings | Notification preferences, active sessions, data export/deletion request | Controls have real effects or clearly state pending operator handling |

## Key wireframes

```text
Fees & Scholarships
[Balance: INR 40,000] [Due: 15 Oct] [Source updated: ...]
[Fee year selector] [College | Transport | Other]
Scholarship: Approved -> Released -> Awaiting credit confirmation
Required documents: 2 accepted | 1 missing [View checklist]
[Explain this status] [Report an issue]
```

```text
Learn / CSE / Regulation Rxx / Semester 4 / DBMS
[Switch subject, including backlog] [Materials] [Past papers]
[Question field................................] [Ask]
Answer with inline [1] and [2] source references
Sources: document title, revision, page, accessible preview
Run state: completed | source coverage: sufficient
```

```text
Job detail -> Prepare my resume
Left: JD and required skills | Right: verified resume facts
Suggestions: original -> proposed -> reason -> source fact
[Accept selected edits] [Save version] [Open official application]
```

## Usability verification

Keyboard-only complete complaint and resume flows; focus enters error summary after failed submit; dialogs trap/return focus correctly. Check labels, contrast, zoom at 200%, screen-reader live announcement of completion (not every streamed token), reduced motion, mobile table overflow, and long names/amounts. Test slow network and a failed AI call. Keep a plain usable form available when AI is unavailable.

Tuesday demo fixture: one student in second year with a first-year backlog; pending fee, approved scholarship without credit; one correctly missing document; one staff contact; two subjects and three permitted sample papers; two truthful resume variants; at least eight synthetic listings covering all categories. Label fictional jobs clearly and do not invent live vacancies.
