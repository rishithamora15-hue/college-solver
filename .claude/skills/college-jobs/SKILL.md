---
name: college-jobs
description: Implement College Solver opportunity catalog, eligibility filters, freshness, job-to-resume handoff and application links.
---

# college-jobs

Read [the project contract](../../../docs/DATA-API.md) for the active task. Resolve project paths relative to the repository root.

Use curated approved listings for Tuesday. Preserve campus/off-campus, IT/non-IT, fresher/internship category, company, role, eligibility, deadline, drive time, source and verified_at. Unknown salary/requirements remain unknown.

Validate application URLs and render safe external links. Do not fetch arbitrary submitted URLs on the server. Licensed feeds later require source permission, deduplication, bounded fetch and SSRF protections. Expired/withdrawn/stale records must not appear as confirmed active recommendations.

Carry exact job ID/JD version into resume analysis. Matching cannot override hard eligibility constraints; uncertain eligibility is explicit. Opening an application link is not verified application submission.

Test category filters, boundary timezone deadlines, withdrawn jobs, unsafe URLs and preserved resume handoff. Deliver one complete find-prepare-apply-link journey without inventing live vacancies or automating applications.
