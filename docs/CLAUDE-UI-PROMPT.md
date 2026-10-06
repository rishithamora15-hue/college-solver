# Paste this into Claude Code for the remaining visual pass

```text
I want the existing College Solver app to feel polished enough for a hackathon judging demo. This is a UI and UX implementation task on an already working application, not another planning exercise.

Read AGENTS.md, docs/DESIGN.md, docs/BACKLOG.md (T15), docs/RELEASE-EVIDENCE.md, and .claude/skills/college-design/SKILL.md. Inspect src/app and the current git diff first. The shared shell, overview, sign-in and design specification have already received an initial pass; preserve and improve that work.

Finish T15 across fees/scholarship, complaint review/receipt, learn/tutor/sources, career/resume/results, jobs/detail, staff and settings. Use the “one connected journey” direction in DESIGN.md: premium dark navigation rail, light readable workspace, clear four-stage storytelling, real data as the centre of each card, concise copy, cohesive typography and spacing. Make every main screen feel designed rather than default HTML, with strong page hierarchy and useful calls to action.

Add purposeful motion: short entry/reveal transitions, interactive hover/press feedback, meaningful status transitions and calm queued AI feedback. Keep motion smooth and restrained. Respect prefers-reduced-motion. Do not animate figures or state before persistence. Preserve keyboard access, focus behavior, screen-reader status and contrast.

Use the existing CSS approach unless a concrete interaction truly needs an animation library. Do not add an external visual dependency or decorative stock imagery merely to make the page look busy. Improve mobile and tablet layouts as seriously as desktop. Avoid horizontal page overflow, clipped menus and tiny tap targets.

Do not change authentication, authorization, financial calculations, model behavior, tool permissions or the actual source labels. Keep synthetic-data and mock-AI notices visible. Do not fabricate live jobs, outcomes, scores or financial confirmations. Preserve existing accessible button/link names that tests rely on unless the new copy is clearly better and you update the tests accordingly.

Run typecheck, build and all relevant browser journeys. Capture and inspect screenshots at 390x844, 768x1024 and 1280x800 for sign-in, overview, scholarship detail, complaint, tutor, career result and job detail. Fix visible spacing, clipping, contrast and content hierarchy issues found. Test reduced-motion mode. If screenshot tooling is unavailable, report that explicitly and finish all other verification.

Record exactly what you changed, what you visually inspected, what tests passed, and what remains incomplete in docs/RELEASE-EVIDENCE.md. Stop once T15 acceptance is met. Do not claim hosted deployment or live-AI verification from local UI tests.
```
