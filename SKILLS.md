# Skills catalog

These 18 project-specific skills cover the implementation lifecycle. Canonical files are linked below; identical Claude Code copies live in `.claude/skills`. They do not implement application features by themselves.

| Skill | Use |
|---|---|
| [college-scope](.agents/skills/college-scope/SKILL.md) | Reconcile College Solver requirements, prioritize a release, or resolve a scope decision against the supplied blueprints. |
| [college-bootstrap](.agents/skills/college-bootstrap/SKILL.md) | Create or repair the College Solver TypeScript web and worker foundation, local setup, environment validation, and build commands. |
| [college-design](.agents/skills/college-design/SKILL.md) | Design or implement College Solver screens, shared components, navigation, responsive behavior and accessibility. |
| [college-data](.agents/skills/college-data/SKILL.md) | Implement College Solver database schemas, scoped repositories, migrations, financial records or data import contracts. |
| [college-auth](.agents/skills/college-auth/SKILL.md) | Implement or review College Solver identity, memberships, role scopes, session security and tenant/object authorization. |
| [college-distributed](.agents/skills/college-distributed/SKILL.md) | Implement or diagnose College Solver durable jobs, separate workers, leases, idempotency, retries, cancellation and recovery. |
| [college-agents](.agents/skills/college-agents/SKILL.md) | Implement College Solver runtime specialist agents, scoped context, typed tools, budgets and evidence-based verification. |
| [college-ingestion](.agents/skills/college-ingestion/SKILL.md) | Build College Solver upload parsing, document provenance, publication, indexing and access-filtered retrieval. |
| [college-finance](.agents/skills/college-finance/SKILL.md) | Implement College Solver fee displays, scholarship checklists and states, complaint routing, reminders or resolution verification. |
| [college-lms](.agents/skills/college-lms/SKILL.md) | Implement College Solver academic navigation, backlog access, scoped tutoring, past papers and exam analysis. |
| [college-career](.agents/skills/college-career/SKILL.md) | Implement College Solver resume parsing, truthful JD customization, skill-gap feedback and evidence-based training assessments. |
| [college-jobs](.agents/skills/college-jobs/SKILL.md) | Implement College Solver opportunity catalog, eligibility filters, freshness, job-to-resume handoff and application links. |
| [college-integrations](.agents/skills/college-integrations/SKILL.md) | Build College Solver external adapters, scheduled reminders, notifications, source synchronization and receipt reconciliation. |
| [college-testing](.agents/skills/college-testing/SKILL.md) | Verify College Solver acceptance, domain invariants, tenant boundaries, browser journeys, distributed recovery and AI evaluation cases. |
| [college-security](.agents/skills/college-security/SKILL.md) | Threat-model or harden College Solver authentication, uploads, AI tools, privacy, secrets and production release boundaries. |
| [college-release](.agents/skills/college-release/SKILL.md) | Prepare or execute College Solver CI, hosting configuration, migrations, release gates, smoke tests and rollback. |
| [college-operations](.agents/skills/college-operations/SKILL.md) | Implement College Solver observability, cost limits, backup restore, incident response and pilot support handoff. |
| [college-review](.agents/skills/college-review/SKILL.md) | Review a College Solver implementation diff for acceptance failures, correctness, security and unnecessary scope without editing. |

In Codex, explicitly request `$college-security` (or another name). In Claude Code, use `/college-security` when discovered, or ask it to read the skill file. Load only the skills relevant to the active ticket. See [the workflow](docs/AI-BUILD-WORKFLOW.md).
