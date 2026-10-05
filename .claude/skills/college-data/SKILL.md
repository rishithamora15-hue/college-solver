---
name: college-data
description: Implement College Solver database schemas, scoped repositories, migrations, financial records or data import contracts.
---

# college-data

Read [the project contract](../../../docs/DATA-API.md) for the active task. Resolve project paths relative to the repository root.

Identify domain invariants before creating tables. Use tenant-owned records, composite same-tenant foreign keys, integer paise, UTC instants, source references and versions. Membership and editable profile remain separate.

Financial imports stage and validate rows, deduplicate external references, preserve reversals and distinguish expected scholarship from actual settled credit. Never subtract the same credit twice. Preview and reconcile batch totals; failures produce row-level reasons.

Use migrations with expand/contract compatibility. Test a clean database and an upgrade from the previous schema. Add realistic negative cases for cross-tenant foreign keys, duplicate source records, partial/reversed payments and concurrent version updates.

Deliver migrations, scoped repositories, fixtures and relevant test evidence. Do not claim rollback safety without verifying compatibility; avoid destructive schema changes during deadline pressure.
