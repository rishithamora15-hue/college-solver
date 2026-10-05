---
name: college-integrations
description: Build College Solver external adapters, scheduled reminders, notifications, source synchronization and receipt reconciliation.
---

# college-integrations

Read [the project contract](../../../docs/ARCHITECTURE.md) for the active task. Resolve project paths relative to the repository root.

Implement a typed adapter with fixture, sandbox and live modes visibly distinguished. Record source references, observed_at, auth scope, rate limits, timeout and receipt semantics. Never call fixture results live data.

Use approved recipient directories and authorized templates/actions. Schedule reminders with durable jobs, unique recipient/event/channel keys, timezone-aware deadlines, preferences, and send-time state rechecks. A changed balance or closed complaint can suppress a scheduled reminder.

Verify webhook authenticity and reject replay where supported; otherwise reconcile by authenticated polling. Deduplicate imported events, prevent stale status regression and handle provider timeout after acceptance without blindly resending.

Test outages, malformed events, duplicate callbacks, changed preferences, unknown delivery and missing credentials. Deliver clear integration status and reconciliation evidence. Do not send real messages or mutate third-party systems based only on blueprint wording.
