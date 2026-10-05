# Blueprint traceability and reconciliations

Source keys: **B1** = hackathon blueprint1.pdf (14 pages), **B3** = hackathon blueprint3.pdf (31 pages), **AC** = AI College Problem Solver.pdf (26 pages). Page references use physical PDF pages. All three were text-extracted and reviewed. No visual layout validation was completed because a PDF renderer was unavailable; this plan relies on their extractable requirements and text diagrams.

The documents describe one idea. B3 supplies the clearest module-by-module context/harness detail; B1 contains additional explicit statuses and training details; AC reinforces the unified student journey. None specifies a concrete technology stack, multi-service deployment, team staffing, budgets, or an implementation deadline. Those are user constraints or labeled engineering proposals in this kit.

| Requirement | Source | Tuesday / complete-vision tickets | Proof |
|---|---|---|---|
| Four modules in one student platform | B1 pp1,14; B3 pp1,30-31; AC pp1,25-26 | T02,T12 | Shared identity/navigation and linked workflows |
| Year/category fee totals, paid, balance, due, cleared | B1 pp1-2; B3 pp3-5; AC pp3-5 | T05; P01 | Integer arithmetic and source-record reconciliation |
| Penalty/attendance consequences configurable | B1 p2; B3 p5; AC p5 | P02 | Policy version; no default punitive enforcement |
| Scholarship eligibility, status, government/student share, release/credit | B1 pp2-5; B3 pp5-8; AC pp5-8 | T05; P01 | Expected funding separated from actual settled credits |
| Required/missing/expired/submitted documents and deadlines | B1 p4; B3 p7; AC p7 | T05,T11; P01 | Verified checklist metadata, expiry and reminders |
| Natural-language scholarship investigation | B1 pp3-5; B3 pp5-10,27-28; AC pp5-7,20-22 | T06 | Evidence and uncertainty instead of invented root cause |
| Department routing, complaint/email draft, tracking, resolution | B1 pp3-5; B3 pp6-10; AC pp6-7 | T06; P09 | Durable complaint receipt, approved directory, verified closure basis |
| Branch/year/eight semesters/subject/topic | B1 pp5-7; B3 pp10-12; AC pp8-10 | T08 sample; P03 full | Schema supports all semesters; content completeness tracked |
| Previous-semester backlog access | B1 p6; B3 p12; AC pp10-11 | T08 | Current second-year student accesses authorized first-year subject |
| Theory, examples, coding, syntax, output, practical explanation | B1 pp6-7; B3 pp11-13; AC pp9-11 | T08; P12 execution optional | Cited tutoring; code output labeled illustrative unless executed |
| Previous papers, year filtering/download/practice | B1 pp7-8; B3 pp13-14; AC p12 | T08; P03 | Authorized files and source/year filters |
| Exam patterns, repeat questions, topic frequency | B1 p8; B3 p14; AC pp12-13 | P04 | Counts computed from published corpus, sample size shown |
| Tech and non-tech recruitment preparation | B1 pp8-9,11-12; B3 pp16-18; AC pp13-14 | T09 next steps; P06 | Training and assessment linked to real observed gaps |
| Communication, aptitude, etiquette, behavior/body language | B1 pp9,11; B3 p17; AC p14 | P06,P07 | Coaching content and consented practice; no unsupported automated scoring |
| Resume creation, grammar, structure, projects, achievements | B1 pp9-11; B3 pp18-19; AC pp14-16 | T09 analysis; P05 builder/export | Editable facts, constructive suggestions, export checks |
| JD skills/qualifications/responsibilities and customization | B1 pp10,13; B3 pp18-19,29; AC pp15,18 | T09,T10 | Suggestions trace to actual resume evidence |
| Multi-dimensional readiness and personalized training | B1 p11; B3 pp19-22; AC pp16-17,24 | T09 suggestions; P06 scores | Published rubric and assessment history; unassessed stays unassessed |
| Campus/off-campus, IT/non-IT, fresher/internship opportunities | B1 pp12-14; B3 pp22-25; AC pp17-19 | T10; P08 | Categories, deadlines and source freshness |
| Company, role, eligibility, qualification, skills, salary, drive, links | B1 pp12-13; B3 pp22-23; AC pp17-18 | T10 | Unknown fields left unknown; expired jobs labeled |
| Job discovery -> resume -> student review -> application link | B1 p13; B3 pp23-25,29; AC pp18-19,24 | T09,T10,T12 | Preserved job/resume version context through handoff |
| Unified context, tools, action, verification | B1 p14; B3 pp25-31; AC pp19-26 | T04,T06,T08,T09,T12 | Scoped context and tools, durable state, observable verification |
| Distributed and multi-agent implementation | User request; PDFs describe general harness only | T04,T06,T08,T09,T12 | Separate processes, recovery/concurrency tests, typed specialists |
| Claude/Codex skills from foundation through security/deployment | User request | This kit; execution through T14 | 18 scoped skills, shared guidance and validation script |

## Resolved ambiguities

- B1 says three main modules then enumerates four. Adopt four, matching all final summaries.
- Document wording such as “I will capture this” is conversation residue, not instructions to execute tools or send email.
- Scholarship examples can appear to reduce balances before money arrives. Display expected student contribution separately from actual ledger outstanding.
- “Determine root cause” becomes an evidence-backed possible cause unless authoritative records establish it.
- “Verify resolution” requires an actual source receipt or clearly attributed acknowledgment; a generated explanation is insufficient.
- The example 72% readiness is illustrative. Do not initialize a score from it or invent an ATS/hiring guarantee.
- Curriculum/year and example INR amounts/dates are sample data. Real institutional curricula and policies must be supplied/approved.
- No blanket automated attendance restrictions, automatic job submissions, unrestricted web scraping, or payment processing are implied.

## Open decisions and safe defaults

| Decision | Default while unanswered | Must resolve before |
|---|---|---|
| Exact Tuesday afternoon cutoff | 6 Oct 2026 at 14:00 IST | Final handoff schedule |
| Accounts and spend cap | Existing accounts; no unauthorized spend | Provisioning/live model testing |
| Institution and data source permission | Two synthetic colleges | Real-data import |
| Runtime AI provider/model | First available official provider behind typed boundary | T06 live AI |
| Curriculum/material rights | Staff-approved synthetic/permitted sample content | Publication |
| Email recipient directory and delivery authorization | Test inbox, draft-only external messages | P09 |
| Hosting region/retention/student age handling | Explicitly unresolved | Real-data release |
| Operator/support ownership | Developer for evaluation only | Real-data release |

No plan can prove that every future gap is closed. This matrix, observable gates, and an explicit decision register make omissions visible and assign them to work rather than hiding them.
