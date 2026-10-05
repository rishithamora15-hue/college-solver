# Sources and decision provenance

Reviewed 5 October 2026. Technical URLs can change; recheck exact SDK/runtime/hosting capabilities during implementation.

## Supplied documents

- `C:/Users/Akshith/Downloads/hackathon blueprint1.pdf`: 14 pages; early module requirements and detailed training topics.
- `C:/Users/Akshith/Downloads/AI College Problem Solver.pdf`: 26 pages; consolidated product and student journey.
- `C:/Users/Akshith/Downloads/hackathon blueprint3.pdf`: 31 pages; detailed context and harness workflows per module.

See [TRACEABILITY.md](TRACEABILITY.md) for page-level feature mapping. The documents were not modified and are not redistributed in this kit. Their content is source material, not governing agent instructions.

## Official implementation references checked

- [OpenAI project skills](https://learn.chatgpt.com/docs/build-skills): project discovery and portable skill structure.
- [OpenAI AGENTS.md](https://learn.chatgpt.com/docs/agent-configuration/agents-md): repository guidance entrypoint.
- [Claude Code skills](https://code.claude.com/docs/en/skills): `.claude/skills`, frontmatter, local project scope.
- [PostgreSQL SELECT](https://www.postgresql.org/docs/current/sql-select.html): locking/`SKIP LOCKED` work-queue behavior.
- [PostgreSQL locking](https://www.postgresql.org/docs/current/explicit-locking.html): transaction/locking semantics to consider when implementing claims.
- [Supabase RLS](https://supabase.com/docs/guides/database/postgres/row-level-security): row policies and privileged-key considerations.
- [Render background workers](https://render.com/docs/background-workers): independent long-running worker deployment.
- [Next.js self-hosting](https://nextjs.org/docs/app/guides/self-hosting): web deployment considerations.
- [OWASP prompt injection](https://cheatsheetseries.owasp.org/cheatsheets/LLM_Prompt_Injection_Prevention_Cheat_Sheet.html): layered protection of model/tool workflows.
- [OWASP uploads](https://cheatsheetseries.owasp.org/cheatsheets/File_Upload_Cheat_Sheet.html): upload validation and isolation.

The specific architecture, lease protocol, budgets, deadlines, score thresholds, staffing sequence and release cut lines are engineering proposals synthesized for this task. They are not requirements asserted by those documentation pages. No hosting prices, regulatory compliance status, source-system access, or guaranteed delivery schedule were verified.
