# Security and privacy implementation gates

## Scope and assets

Protect student identity, fee records, scholarship documents, resumes, staff permissions, uploaded content, action approvals, model credentials, and institution data boundaries. Trust boundaries are browser/server, server/database, worker/model provider, upload/parser, content/retrieval, and external integration. The AI is outside the authorization boundary.

The controls below are proposed engineering requirements, not a claim of audited security or legal compliance. Data residency, retention, student age/consent, institutional policy, and vendor processing terms need decisions before real-data use.

## Threat-to-control-to-test map

| Risk | Implementation | Evidence needed |
|---|---|---|
| Cross-student/tenant access | Server identity scope, object checks, tenant FK constraints, RLS, private storage | Guess IDs for fees, runs, resumes, citations, downloads, complaints from other users/tenants; all denied |
| Privilege escalation | Membership/role changes staff-only, no role fields in editable profile, staff MFA | Student PATCH role rejected; revoked staff token/job cannot act |
| Session theft/CSRF | Secure HttpOnly SameSite cookies where used; token verification; origin/CSRF protection on cookie-auth mutations; logout/revocation | Cross-origin state-changing requests fail; expired sessions denied |
| Injection/XSS | Parameterized SQL, validated enums/IDs, sanitized markdown, CSP, no raw AI HTML | Script-bearing resume/JD renders inert; SQL payload cannot alter scope |
| Prompt injection | Treat sources as data; fixed tool registry; schema validation; backend permission checks | Malicious PDF/JD asks for other student's records/email; tools refuse and no data leaks |
| Unsafe uploads | Private quarantine, MIME signature/type allowlist, 10 MB / 50-page starting limits, malware scanner, parser CPU/memory/time limits | Oversize, disguised executable, parser bomb, unsupported/scanned PDF all rejected or controlled |
| SSRF and malicious job URLs | Tuesday curated URLs only; no arbitrary server fetch. Later allowlisted egress, public IP checks after DNS/redirects, size/time caps | Loopback, private/link-local, metadata addresses, redirects, non-HTTPS schemes blocked |
| Tool overreach | No arbitrary SQL/shell/browser tools; reauthorize every operation; action hash and receipt | Altered/expired approval rejected; tool call outside scope denied |
| Duplicate side effects | DB uniqueness, idempotency keys, leases/fencing, provider reconciliation | Retry/crash tests yield one complaint/reminder effect |
| Secret exposure | Server-only secret store, separate environments/keys, scanning, log redaction | Build output/client bundle/logs contain no server secrets |
| Cost/availability abuse | Durable per-user/tenant/global quota, bounded concurrency/tokens, upload limits, rate limits | Burst requests limited; provider outage ends in clear failure state |
| Supply-chain risk | Lockfiles, dependency/container scans, least-privilege CI tokens, reviewed changes | Critical reachable vulnerabilities block release; exceptions explicitly owned |
| Excessive staff access | Per-role data projection and scoped tools, audit trails, access review | Finance role denied resume access; placement role denied financial data |

Prompt separation and model guardrails are defense in depth, not reliable authorization enforcement. This follows the layered approach discussed in [OWASP prompt injection guidance](https://cheatsheetseries.owasp.org/cheatsheets/LLM_Prompt_Injection_Prevention_Cheat_Sheet.html). Apply quarantine and file constraints before parser use, following [OWASP upload guidance](https://cheatsheetseries.owasp.org/cheatsheets/File_Upload_Cheat_Sheet.html).

## Upload cut line

If a safe bounded parser and scanner cannot be operational by Tuesday, disable public/student uploads and offer manual resume text entry plus administrator-seeded documents. Explicitly mark PDF upload deferred. Do not make an unrestricted parser endpoint to satisfy a UI checkbox. The complete pilot still needs the upload pipeline before real documents are accepted.

Code examples in tutoring are displayed as text. Real execution is a later opt-in service with disposable sandbox, no network by default, no credentials, CPU/memory/time/output quotas, filesystem isolation, and language-specific tests. Never run student code inside the web/worker host.

## Data lifecycle

Classify public job metadata, internal academic material, personal profile/resume, and highly restricted financial/support records. Minimize model input: remove contact details and identifiers not required by the task. Default provider data handling must be verified for the exact account/product before real student data is sent.

Proposed evaluation policy: synthetic data only; purge evaluation uploads and AI runs after 7 days unless needed for an explicitly agreed demonstration. Production retention is **undecided**: institutional owner must specify per-category purpose, period, deletion exclusions, and backup expiry. Do not adopt the evaluation policy automatically for official financial records.

Export and deletion requests require identity verification and an auditable workflow. Deletion covers source objects, parsed text, vectors, caches, resume analyses, and relevant provider artifacts where supported. Backups age out under a documented policy; restoring an older backup must reapply deletion tombstones. Financial retention obligations may require preserving specific ledger records while minimizing unrelated personal data; institution decides.

No Aadhaar/bank documents are required for the synthetic pilot. Do not collect them because a generic scholarship example mentions required documents. Record checklist status only until a legitimate need and secure process exist.

Logs contain request/run IDs, status, timing, provider usage and error class. Redact tokens, raw prompts, resumes, income certificates, financial details, and email content. Separate security audit events from debug logs; restrict audit read/write access and retain tamper-evident exports as the production policy requires.

## Release blockers for real student data

1. College owner approves scope, authorized data sources, roles, policies, and support responsibility.
2. Privacy notice, student access/consent handling, provider processing terms, region and retention decisions are recorded.
3. Tenant and object authorization tests pass through both APIs and storage links; no unresolved critical/high exploitable issue.
4. Safe uploads are enabled with evidence, or uploads are explicitly disabled.
5. Secret rotation, staff MFA, backup restore, monitoring alerts and rollback are proven.
6. AI evaluations show no unauthorized effects/data access in the adversarial suite; reviewed answers use valid sources and abstain appropriately.
7. Real integration reconciliation is demonstrated; imported financial truth is verified by the source owner.

If any gate fails, real-data rollout is blocked; the synthetic evaluation mode can still be released if its own gates pass.

## Incident procedure

Disable affected capability with a server-side flag; pause relevant workers if needed; preserve redacted evidence and immutable audit IDs. Revoke exposed credentials/sessions, scope affected data, involve the named institutional operator, and follow that institution's notification process. Restore a known-good version, verify isolation and consistency, then reopen. Record cause, corrective test, owner and follow-up date. Do not erase evidence by casually resetting the database.
