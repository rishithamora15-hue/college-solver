---
name: college-security
description: Threat-model or harden College Solver authentication, uploads, AI tools, privacy, secrets and production release boundaries.
---

# college-security

Read [the project contract](../../../docs/SECURITY.md) for the active task. Resolve project paths relative to the repository root.

Start with the actual changed assets and trust boundaries, then select applicable threats from the security matrix. Trace browser identity through API, database, worker, model, tool and storage. Security decisions stay in deterministic code.

Check object-level authorization, role escalation, private storage, prompt injection effects, parser isolation, SSRF, session/CSRF controls, secret/client-bundle exposure, dependency risk and quota abuse. Minimize PII in model input/logs and account for deletion across vectors/cache/backups.

Reproduce findings in synthetic fixtures; report file/line, exploit preconditions, impact and smallest repair. Do not collect real sensitive student documents for testing. After fixes rerun the failing case and nearby relevant gates.

Deliver passed/failed/untested controls and real-data release blockers. Do not label a system secure or legally compliant from a scan or this skill alone. Keep safe evaluation release possible where its independent gates pass.
