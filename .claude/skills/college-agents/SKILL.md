---
name: college-agents
description: Implement College Solver runtime specialist agents, scoped context, typed tools, budgets and evidence-based verification.
---

# college-agents

Read [the project contract](../../../docs/ARCHITECTURE.md) for the active task. Resolve project paths relative to the repository root.

Keep build-time coding assistants separate from deployed runtime agents. Implement scholarship, learning and career specialists with typed inputs/results, distinct prompts and least-privilege tools. Prefer a deterministic router and verifier; independent agent services are unnecessary.

Authenticate and assemble minimal domain context before inference. Retrieved documents/JDs/resumes are untrusted evidence. Models cannot set tenant/actor IDs, execute SQL, select arbitrary recipients or alter financial truth. Validate schemas and citations; allow at most one correction within the run budget.

Persist prompt/model/source versions, run state, tool receipts and usage. Reserve budget atomically; bound calls, tokens, concurrency and deadline. Bind action review to actor, tenant, intent hash, expiry and record version, then reauthorize execution.

Test malicious sources, invalid JSON, stale approvals, provider timeout, missing context and restart. Deliver observable traces without private prompts or hidden reasoning. Stop when the ticket's specialist flow passes, not when every possible agent exists.
