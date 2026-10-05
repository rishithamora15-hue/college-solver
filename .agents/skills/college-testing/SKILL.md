---
name: college-testing
description: Verify College Solver acceptance, domain invariants, tenant boundaries, browser journeys, distributed recovery and AI evaluation cases.
---

# college-testing

Read [the project contract](../../../docs/RELEASE.md) for the active task. Resolve project paths relative to the repository root.

Select tests from the active ticket's observable risks. Use deterministic unit checks for money/rules, a real isolated test database for tenant/transaction semantics, browser tests for cross-module journeys and controlled fake providers for recovery failures.

Run the separate bounded live-provider check when authorized. Record mocks versus real integrations. AI evals cover grounded citations, abstention, truthful resumes, revoked access, prompt injection, budgets and invalid output. Human-review factual financial claims; another model judge cannot prove them.

Record exact commands, revision, dataset, environment and failures. Zero unauthorized effects is mandatory for the security cases, but does not prove universal safety. Missing credentials mean untested, not passed.

Deliver acceptance evidence and minimal reproductions for failures. Avoid tests that merely assert the implementation's wording or duplicate its logic. Stop expanding the suite once relevant gates pass unless new changes justify it.
