# Data, permissions, and API contracts

## Conventions

UUID IDs; UTC `timestamptz`; explicit institutional timezone for deadlines; integer paise for money; version columns for concurrent updates. Every tenant-owned table includes `college_id`, and composite foreign keys enforce same-tenant references. Add indexes on tenant + filter/order columns. Never accept a browser-supplied tenant ID as authorization.

Use migrations from the first change. Keep identity membership separate from editable student profile. Student profile never stores a self-editable staff role. RLS is defense in depth alongside server authorization; configure and test it using [Supabase RLS guidance](https://supabase.com/docs/guides/database/postgres/row-level-security). Privileged service keys bypass normal protections and stay server-only; workers still call scoped domain services.

## Logical schema to implement

| Domain | Tables and key fields / constraints |
|---|---|
| Identity | `colleges(id,name,timezone)`; `memberships(college_id,user_id,role,status)` unique membership/role; `students(id,college_id,user_id,branch_id,curriculum_id,current_semester)` |
| Finance | `fee_assessments(id,college_id,student_id,academic_year,category,amount_paise,due_at,policy_version,source_ref)`; `payments(id,...,external_ref,amount_paise,status,posted_at)` unique external source/ref; `payment_allocations(payment_id,assessment_id,amount_paise)`; corrections as reversal/adjustment records |
| Scholarships | `schemes(id,college_id,name,policy_document_id)`; `scholarship_cases(id,...,student_id,scheme_id,status,expected_paise,released_paise,credited_paise,source_ref,observed_at,version)`; `document_requirements`; `student_documents` with verification state/expiry |
| Complaints | `complaints(id,...,student_id,case_id,department_id,status,summary,version)`; `complaint_events` append-only; `departments` approved contact directory; `action_approvals` with actor/hash/expiry/version |
| Curriculum | `branches`; `curricula` regulation/version; `subjects`; `curriculum_subjects(curriculum_id,subject_id,semester)`; `topics`; `backlogs(student_id,curriculum_subject_id,status)` |
| Content | `documents(id,...,owner_id,type,storage_key,visibility,status,content_hash,version,source,license)`; `document_chunks(document_id,page,section,scope,embedding_model,embedding)`; `papers(subject_id,curriculum_id,exam_year,document_id)` |
| Learning | `learning_sessions(student_id,scope_ids)`; `learning_progress`; later `practice_items`, `attempts` and versioned answer rubrics |
| Career | `resume_versions(id,...,student_id,document_id,facts_json,confirmed_at,version)`; `resume_analyses(resume_version_id,job_id?,jd_hash,run_id,result_json)`; `training_plans`; later `assessments`,`assessment_attempts` |
| Jobs | `opportunities(id,college_id?,visibility,company,role,category,campus_type,jd,eligibility_json,source_url,apply_url,deadline_at,verified_at,status)`; `saved_jobs(student_id,job_id)`; `application_tracking` with user-reported state |
| Execution | `agent_runs(id,college_id,actor_id,state,context_refs,result_ref,prompt_version,model_id,token_usage,cost,version)`; `agent_steps`; `jobs(id,kind,payload_ref,state,run_at,locked_until,worker_id,lease_generation,attempt,dedup_key)` unique dedup key |
| Operations | `audit_events(actor,tenant,action,target,result,trace_id,time)`; `notification_preferences`; `notifications` unique recipient/event/channel key; `integration_receipts`; `usage_reservations`; `import_batches` and per-row errors |

Initially make all job listings tenant-owned. Add public cross-college listings only with explicit public visibility and separate tested policies; nullable tenant IDs alone do not mean public. Do not put resumes, income certificates, or private financial records in public indexes.

## Financial invariants

`outstanding = assessed + posted_adjustments - settled_allocated_payments - actual_allocated_scholarship_credits`. Expected or approved scholarship is displayed separately. Never subtract a credit both as a scholarship entry and a payment: normalize imported credit into one unique ledger source and allocate once. Distinguish refund, reversal, pending, and settled payments. Display overpayment as credit rather than discarding it with `max(0,...)` in storage.

The blueprint example INR 120,000 assessment, INR 80,000 expected scholarship, INR 20,000 student payment has an expected student remainder of INR 20,000, but an actual unsettled ledger balance of INR 100,000 until scholarship credit posts. Label the two values clearly. Approved scholarship never proves disbursement.

Import staging validates student identifiers, currency, academic period, duplicate source references, totals, and status mapping. Preview differences and reject invalid rows with reasons. Apply a batch transactionally where practical, record actor and provenance, reconcile totals after import. Never let an AI repair financial rows without an authorized deterministic correction workflow.

## State machines

- Scholarship: `not_applied -> applied -> under_verification -> approved -> released -> credited`; optional `rejected`, `needs_documents`, `cancelled`. Transitions are source/staff-authorized, versioned, with event history. Partial releases/credits use separate amounts; stale feed updates do not regress a newer state without an explicit correction event.
- Complaint: `draft -> submitted -> assigned -> in_progress -> awaiting_student -> resolved -> verified_closed`; may reopen. `resolved` means staff claims resolution; `verified_closed` records the verification basis (source credit receipt or explicitly attributed student confirmation). Student acknowledgment alone must not rewrite the scholarship ledger.
- Document: `quarantined -> scanning -> extracting -> review -> published`, or `rejected/failed/deleted`. Personal resume documents become `ready` rather than academically published.
- Notification: `scheduled -> sending -> delivered`, or `failed/delivery_unknown/suppressed`; suppression rechecks payment/case state at send time.
- Job listing: `draft -> published -> expired/withdrawn`; passing deadline suppresses normal recommendations.

## Access matrix

| Actor | Own profile/fees | Others' fees | Academic content | Private resumes | Complaints | Jobs |
|---|---|---|---|---|---|---|
| Student | Read own; limited profile edit | Deny | Published authorized content | Own only | Own only | Published eligible visibility |
| Finance/scholarship staff | Assigned tenant scope | Assigned duties only | Public student view | Deny | Assigned department | Published view |
| Faculty/content editor | No financial access | Deny | Manage assigned subjects | Deny | Deny unless assigned role | Published view |
| Placement staff | Limited placement profile | Deny | Published view | Only separately consented sharing | Deny | Manage tenant listings |
| College admin | Manage membership and assignments | Explicit extra permission required | Publish/admin scope | No blanket default access | Route/audit metadata | Admin scope |
| Worker | Only approved operation context | No unrestricted model access | Scoped ingestion/retrieval | Scoped run input | Scoped domain commands | Approved ingestion |

## API surface

All routes below are proposed under `/api/v1`. Authenticate every private route, derive tenant server-side, validate input, enforce object access on reads and writes. Return consistent `{error:{code,message,request_id}}`; avoid leaking whether another student's record exists. Pagination is cursor-based and bounded (default 20, max 100).

| Method and route | Contract / semantics |
|---|---|
| `GET /me`, `PATCH /me/profile` | Limited editable fields; reject role/tenant modifications |
| `GET /fees`, `GET /scholarships/:id` | Scoped read; amounts plus `source_ref`, `observed_at`, `stale` |
| `POST /complaint-drafts` | Case + issue; returns saved draft or 202 run ID |
| `POST /complaints` | Explicit reviewed draft/version; idempotency key; transactional receipt |
| `GET /complaints/:id`, `POST /complaints/:id/events` | Own/assigned access; event requires expected version |
| `GET /curriculum`, `GET /subjects/:id/materials`, `GET /papers` | Curriculum/tenant-filtered published resources |
| `POST /tutor/runs` | Selected curriculum/subject/topic + question; 202 with run ID |
| `POST /uploads`, `POST /uploads/:id/complete` | Signed constrained private upload; completion validates stored object, not browser assertion |
| `GET /documents/:id/download` | Reauthorize; short-lived signed URL; never permanent public URLs |
| `POST /resume-versions`, `POST /resume-analyses` | User-confirmed facts or safe parsed upload; version + JD/job; 202 run ID |
| `GET /jobs`, `GET /jobs/:id` | Filtered listing and authoritative source/apply URLs |
| `POST /saved-jobs`, `PATCH /applications/:id` | Idempotent bookmark and user-reported application state |
| `GET /runs/:id`, `POST /runs/:id/cancel` | Owner-scope; durable state/result; bounded polling with retry hint |
| `GET/PATCH /notification-preferences` | Own preferences; no sender/recipient injection |
| `POST /staff/imports`, `POST /staff/documents/:id/publish`, `POST /staff/jobs` | Role-scoped, validated, audited administration |
| `GET /health/live`, `GET /health/ready` | Liveness vs DB readiness; no secrets or tenant information |

For idempotent mutations require `Idempotency-Key` scoped to actor, tenant and operation. Store request hash + response/receipt; same key/different payload returns 409. Concurrent duplicates serialize on the unique key. Keep records through the defined retry horizon (proposed seven days for evaluation; choose institutional policy for production). Version conflicts return 409; long work returns 202; quota exhaustion returns 429 with retry guidance.

Generate an OpenAPI document from validated contracts during implementation and test actual server behavior against it. Do not maintain separate drifting UI and worker schemas. Treat this file as the design contract, not a generated executable API specification.
