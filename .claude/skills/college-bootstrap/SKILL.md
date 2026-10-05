---
name: college-bootstrap
description: Create or repair the College Solver TypeScript web and worker foundation, local setup, environment validation, and build commands.
---

# college-bootstrap

Read [the project contract](../../../docs/IMPLEMENTATION-PLAN.md) for the active task. Resolve project paths relative to the repository root.

Inspect the existing tree and package scripts before scaffolding. Use one TypeScript workspace, Next.js web, and a separately runnable Node worker unless a recorded decision changes the stack. Check current official runtime and framework guidance, then pin supported versions and lock dependencies.

Create only folders consumed by the active ticket. Include .env.example with names and safe placeholders, fail-fast server configuration validation, liveness/readiness separation, and secret-safe logging. Keep server role/model keys out of public bundles.

Create actual install, typecheck, test, build and process-start scripts; run them before documenting success. The initial deployment should be a thin authenticated shell with a persisted test job, not four mock-only pages.

Deliver reproducible setup commands and missing account inputs. Do not provision unspecified paid resources. Stop at the active foundation ticket's acceptance conditions.
