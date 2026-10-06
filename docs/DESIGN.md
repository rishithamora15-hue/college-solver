# Product and interface specification

## Creative direction: “one connected journey”

The presentation should feel like a polished student command centre, with the seriousness of a financial portal and the energy of a modern learning/career app. Visual storytelling follows **Support → Learn → Prepare → Apply**, the four stages of one journey. The current application already works locally; this specification guides its refinement, not a new mockup.

Brand shorthand: **College Solver**. Primary visual: a deep navy navigation rail and a luminous blue/teal welcome canvas. The four stages appear as compact chips and as a connected orbit motif on the overview. Distinguish meaning through structure and copy: verified facts sit in crisp white surfaces; pending/uncertain data gets explicit labels and source freshness. Decorative effects never obscure important figures.

Keep the app credible. No fake charts, animated success percentages, empty glass panels, unearned “AI magic” claims or simulated live job listings. A judge should understand a student action in seconds and trust what the UI says.

## Design tokens and composition

The initial implementation lives in `src/app/globals.css`. Starting palette: ink `#142340`, canvas `#f3f6fb`, white surface, action blue `#155fc7`, mint highlight, and semantic green/amber/red. Verify final text and component contrast in the actual rendered UI. Use an 8 px spacing rhythm, 16-25 px card padding, 16-18 px body, compact labels, 16-25 px radii, and restrained shadows. Large headings use tight tracking; important numbers use tabular numerals.

The shell is a 248 px dark rail on wide screens, a 205 px rail on medium widths, and a single row of horizontally scrollable labeled navigation on small screens. Main content uses a generous max width rather than stretching tables across ultrawide displays. A persistent, small evaluation strip makes synthetic data and mock/live AI status unambiguous. The top bar shows college identity, notifications and sign out.

The overview hero should present the product promise in one sentence, two relevant actions, and the four-module orbit. Below it, a two-column grid at desktop collapses to one column on tablet/mobile. The first card shows actual ledger outstanding, the second outstanding actions, the third learning continuity, and the fourth career opportunities. Those are real data projections. Screens beyond overview use an eyebrow, a concise task title and one-sentence explanation, then task-specific content.

## Motion language

Motion communicates state and relationships. Keep first paint fast. Use CSS transform and opacity for a 350-450 ms initial rise of the hero/card group, staggered by at most 50 ms per overview card. Hover lifts cards 3-4 px over about 200 ms and action buttons 2 px over about 160 ms. Active nav highlights shift immediately with a short color fade. The orbit floats slowly (about 7 seconds) as the sole continuous decoration and is hidden on mobile.

Meaningful transitions to build next: a status step becomes visually active after a verified backend update; queued AI work shows a calm indeterminate progress treatment and then a single completion reveal; complaint submission swaps the editable draft for a durable receipt; resume suggestions reveal original/proposed text without hiding either. These must reflect actual state and preserve keyboard focus. No animated counter may run ahead of the verified number. Do not use scroll parallax, bouncing finance figures, spinning loaders with no status, or motion that delays a click.

Respect `prefers-reduced-motion`: remove nonessential movement and smooth scrolling while preserving state cues, focus, color and text. W3C explains why interaction-triggered motion needs a way to be disabled in [WCAG 2.2 animation guidance](https://www.w3.org/WAI/WCAG22/Understanding/animation-from-interactions.html). Component boundaries and important status cues need sufficient contrast under [WCAG non-text contrast guidance](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html). If the team adds a React animation library later, use its reduced-motion support; CSS covers the current scope without a dependency.

## Judge demo choreography (3–4 minutes)

1. **The problem, 15 seconds.** Sign in as a synthetic student. The overview instantly shows the four linked stages and a real pending action. State that the dataset is fictional.
2. **Support, 50 seconds.** Open Fees. Show actual ledger outstanding alongside approved but uncredited scholarship. Open the case timeline and ask the scholarship specialist for an explanation. Review the complaint draft, edit it and submit; show the stored receipt. The judge should see the boundary between AI explanation and committed action.
3. **Learn, 40 seconds.** Open a previous-semester backlog subject, ask about DBMS, then point to source/page and paper download. Switch subjects to show the scope resets.
4. **Prepare and apply, 50 seconds.** In Career, compare a confirmed resume to a JD; highlight factual suggested edits and gaps. Open a linked job, show eligibility/source freshness, then the official application link.
5. **Engineering proof, 30 seconds.** Show the worker/run state and a concise recovery test result or log. Explain that the UI is backed by a separate worker and durable jobs. If live AI is unavailable, clearly identify the fixture provider.

The demo should require no manual URL edits or hidden setup after sign-in. Prepare one seed account, one pending scholarship, one backlog subject, one resume and one suitable job. Never call an example vacancy real. Rehearse both a 390 px phone viewport and a 1280 px desktop. Have a short recording as a presentation fallback, labeled as recorded.

## Visual QA acceptance

- Screens: sign-in, overview, fees, scholarship detail, complaint review/receipt, learn/tutor, career/results, jobs/detail, staff and settings.
- Viewports: 390×844, 768×1024 and 1280×800; no page-level horizontal overflow, clipped actions, overlapping menus or illegible labels.
- Browser journey still completes after styling; important button and link names remain stable.
- Motion: inspect default and reduced-motion modes; content remains available without animation and no continuous effect distracts on task screens.
- Forms: error summary and focus, visible loading/queued/completed states, preserved entries after transient failures.
- Contrast: text, focus ring, controls and semantic badges checked in rendered output. Status remains readable without color.
- Output evidence: screenshots of desktop overview, mobile overview, scholarship action, tutor citation, resume result and job detail; manually inspect them. The current project has no visual screenshot baseline, so do not claim one exists.

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
