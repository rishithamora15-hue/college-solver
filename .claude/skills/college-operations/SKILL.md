---
name: college-operations
description: Implement College Solver observability, cost limits, backup restore, incident response and pilot support handoff.
---

# college-operations

Read [the project contract](../../../docs/RELEASE.md) for the active task. Resolve project paths relative to the repository root.

Instrument request/run correlation, queue age, worker heartbeat, provider usage/errors, rejected tools and delivery reconciliation without logging personal payloads or secrets. An alert requires a destination and an actual delivery test.

Reserve distributed usage budgets atomically and reconcile after crashes; enforce hard caps at runtime. Record the configured model and verified pricing source when estimating cost. Do not imply subscriptions or hosting are free.

Restore database and required objects into an isolated environment; check totals, document references, tenant access and deletion tombstones. Measure RPO/RTO evidence against agreed targets. Test AI/upload/delivery kill switches and document the named operator.

Deliver operational evidence, incident steps and unresolved capacity assumptions. During incidents contain the issue, preserve audit evidence, rotate affected credentials and verify recovery before reopening; do not erase evidence by resetting production.
