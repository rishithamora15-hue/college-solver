---
name: college-auth
description: Implement or review College Solver identity, memberships, role scopes, session security and tenant/object authorization.
---

# college-auth

Read [the project contract](../../../docs/SECURITY.md) for the active task. Resolve project paths relative to the repository root.

Read the access matrix in docs/DATA-API.md. Derive actor/tenant from verified server session and active membership. Validate object scope on every read, mutation, run-status poll and signed download. Student profile edits cannot grant staff roles or change membership.

Apply database row policies as defense in depth and test the actual credential path. Privileged workers still use scoped domain services; never expose service credentials to the browser. Reauthorize queued work after membership revocation.

Test two tenants, two students, finance/faculty/placement roles, expired sessions, guessed IDs, direct storage access, altered approval contents and cross-origin cookie-auth mutations. Finance access does not imply resume access.

Deliver passing negative access evidence and list any untested policy path. Stop on a real authorization blocker; do not mask it with UI-only restrictions.
