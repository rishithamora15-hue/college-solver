---
name: college-distributed
description: Implement or diagnose College Solver durable jobs, separate workers, leases, idempotency, retries, cancellation and recovery.
---

# college-distributed

Read [the project contract](../../../docs/ARCHITECTURE.md) for the active task. Resolve project paths relative to the repository root.

Implement the documented at-least-once job protocol. Commit domain intent and job atomically; claim with a short locking transaction; perform network calls outside transactions. Persist lease generation, expiry, attempt and workflow version. Reject stale worker commits.

Bound retries and concurrency; reauthorize before effects. Use deterministic dedup keys for complaints/reminders. A timeout after external delivery is uncertain, not proof of failure: reconcile with provider receipt/idempotency support or mark delivery_unknown.

Prove behavior by terminating a worker mid-job, running two workers, repeating browser requests, expiring leases, revoking membership, cancelling a run and simulating provider ambiguity. A queue library or architectural diagram alone does not prove recovery.

Deliver the working protocol, exact commands/process evidence and limitations. Do not add a broker or claim exactly-once external delivery without a demonstrated contract.
