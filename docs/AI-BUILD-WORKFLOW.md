# Build with Claude Code and Codex

## Setup

Open `college-solver-kit` as your project root. This folder can become the application repository; the app folders are created by T01. No global skill installation is required. Codex reads project skills in `.agents/skills`; Claude Code reads `.claude/skills`. These locations follow [OpenAI skill documentation](https://learn.chatgpt.com/docs/build-skills) and [Claude Code skill documentation](https://code.claude.com/docs/en/skills).

Canonical files are `.agents/skills/<name>/SKILL.md`. Claude mirrors contain identical content. Run `python scripts/sync_skills.py` after changes, then `python scripts/validate_kit.py`. Restart/reload the tool if skills do not appear. If automatic discovery is unavailable in a particular client, explicitly ask it to read the relevant `SKILL.md` by path. Skills are instructions, not installed SDKs or autonomous runtime agents.

Do not install all skills globally; they describe this project. A regular Claude web chat does not automatically read local files: use Claude Code with folder access, or manually provide the required documents.

## Solo workflow

You remain product owner and integrator. Choose one assistant as implementer for each ticket and the other as reviewer. Either can handle frontend, backend or architecture; do not assume one product is intrinsically better at a fixed role. Keep one writer per branch/worktree. Share artifacts and actual diffs rather than copying an entire conversation.

1. Give the implementer one ticket, relevant contract files, skill, and acceptance target.
2. It inspects current code, implements, runs relevant checks, and produces a handoff.
3. Give the reviewer the ticket, diff and test evidence. Ask for concrete blocking findings and missing acceptance evidence.
4. Return findings to implementer, resolve, then integrate. Re-run checks affected by fixes.
5. Update evidence and proceed to the next ticket. Stop feature work at the Tuesday freeze.

For explicitly authorized concurrent coding agents, use separate Git worktrees and branch/file ownership. One owner handles migrations/shared contracts/lockfiles. Independent UI fixtures or read-only review can proceed while backend work runs, but do not let two agents edit shared contracts concurrently. Do not merge unreviewed generated code because two agents agree.

No special multi-agent framework is needed for this build workflow. Runtime specialist agents are specified separately in [ARCHITECTURE.md](ARCHITECTURE.md).

## Copy-ready starting prompt

```text
Read AGENTS.md, docs/IMPLEMENTATION-PLAN.md, docs/BACKLOG.md, and
.agents/skills/college-bootstrap/SKILL.md.
I am building solo for Tuesday 6 October 2026 at 14:00 IST.
Execute T00-T01 only. Use synthetic data. Inspect this folder first.
Create the minimal TypeScript web and separate Node worker foundation,
validated environment configuration, lockfiles, and runnable build/test commands.
Do not provision paid services or claim deployment without an authorized account.
Record assumptions and actual validation results. Stop after T01 acceptance
and tell me precisely which account/configuration inputs remain necessary.
```

## Next-ticket prompt

```text
Implement ticket T03 from docs/BACKLOG.md using college-data and college-auth.
Read docs/DATA-API.md and the relevant sections of docs/SECURITY.md.
Preserve existing work. Enforce tenant/object authorization in server code
and test it with two tenants and two students. Do not implement later tickets.
Provide changed files, tests actually run, failures/blockers, and handoff evidence.
```

Change the ticket/skills as needed; the backlog maps every ticket to its skill.

## Independent review prompt

```text
Read the active ticket and relevant contract. Review the supplied diff and
execution evidence. Focus on acceptance failures, authorization, incorrect state,
and recovery risks. Give file/line, concrete reproduction, impact, and smallest fix.
Distinguish confirmed bugs from untested assumptions. Do not edit or expand scope.
```

## Runtime-agent implementation prompt

```text
Implement the runtime agents for the current ticket using college-agents.
Follow docs/ARCHITECTURE.md. Use the configured official provider SDK.
Create typed specialist inputs/results, server-scoped tools, persisted run state,
budgets and deterministic verification. Treat retrieved text as untrusted data.
Prove a worker restart can resume without duplicating domain side effects.
Do not call a set of disconnected chatbot pages an orchestrated multi-agent system.
```

## Release prompt

```text
Use college-release and college-operations to prepare T14.
Read docs/RELEASE.md and actual evidence. List each gate as passed, failed,
or untested. Produce concrete deployment and rollback configuration for the
existing code and selected host. Deploy only within already authorized scope.
If real-data gates are incomplete, keep synthetic evaluation mode explicit.
Report the hosted revision and smoke-test results only after actually verifying them.
```

Keep session summaries compact: active ticket, current revision, accepted decisions, owned paths, commands run, blockers, next action. Do not paste secrets or real student information into either coding assistant.
