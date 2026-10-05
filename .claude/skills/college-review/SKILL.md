---
name: college-review
description: Review a College Solver implementation diff for acceptance failures, correctness, security and unnecessary scope without editing.
---

# college-review

Read [the project contract](../../../docs/BACKLOG.md) for the active task. Resolve project paths relative to the repository root.

Read the active ticket, relevant contracts, actual diff and supplied execution evidence. Inspect surrounding code where necessary to confirm behavior. Focus on concrete acceptance regressions, tenant leaks, inaccurate financial state, unsupported AI claims, unsafe retries and release blockers.

Report each finding with severity, file/line, trigger, user impact and narrow fix. Separate confirmed bugs from missing evidence. Reviewers must not infer test success from test files existing or repeat the implementer's claims without checking.

Flag speculative services, duplicate frameworks or features beyond the deadline scope when they materially threaten delivery. Preserve legitimate distributed/multi-agent requirements rather than deleting them for convenience.

Deliver ordered actionable findings or explicitly state no confirmed findings plus untested risks. Do not edit code, deploy, send messages or expand into a whole-repository audit unless asked.
