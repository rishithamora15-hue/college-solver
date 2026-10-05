-- 001: core schema. Money = integer paise (bigint). Times = timestamptz (UTC).
-- Every tenant-owned table has college_id; composite FKs (id, college_id) enforce same-tenant references.

create table colleges (
  id uuid primary key,
  name text not null,
  timezone text not null default 'Asia/Kolkata'
);

create table app_users (
  id uuid primary key,
  auth_subject text not null unique,          -- Supabase auth.users.id or demo subject
  email text not null unique,
  display_name text not null
);

create table memberships (
  college_id uuid not null references colleges(id),
  user_id uuid not null references app_users(id),
  role text not null check (role in ('student','finance_staff','content_editor','placement_staff','college_admin')),
  status text not null default 'active' check (status in ('active','revoked')),
  primary key (college_id, user_id, role)
);

create table branches (
  id uuid primary key, college_id uuid not null references colleges(id),
  code text not null, name text not null, unique (id, college_id)
);
create table curricula (
  id uuid primary key, college_id uuid not null,
  branch_id uuid not null, regulation text not null, version int not null,
  unique (id, college_id), foreign key (branch_id, college_id) references branches(id, college_id)
);
create table subjects (
  id uuid primary key, college_id uuid not null references colleges(id),
  code text not null, name text not null, unique (id, college_id)
);
create table curriculum_subjects (
  id uuid primary key, college_id uuid not null,
  curriculum_id uuid not null, subject_id uuid not null,
  semester int not null check (semester between 1 and 8),
  unique (id, college_id), unique (curriculum_id, subject_id),
  foreign key (curriculum_id, college_id) references curricula(id, college_id),
  foreign key (subject_id, college_id) references subjects(id, college_id)
);
create table topics (
  id uuid primary key, college_id uuid not null,
  curriculum_subject_id uuid not null, name text not null, position int not null,
  unique (id, college_id),
  foreign key (curriculum_subject_id, college_id) references curriculum_subjects(id, college_id)
);

-- Editable profile is only display_name; role/tenant live in memberships.
create table students (
  id uuid primary key, college_id uuid not null,
  user_id uuid not null references app_users(id),
  curriculum_id uuid not null, current_semester int not null check (current_semester between 1 and 8),
  display_name text not null,
  unique (id, college_id), unique (college_id, user_id),
  foreign key (curriculum_id, college_id) references curricula(id, college_id)
);
create table backlogs (
  college_id uuid not null, student_id uuid not null, curriculum_subject_id uuid not null,
  status text not null check (status in ('active','cleared')),
  primary key (student_id, curriculum_subject_id),
  foreign key (student_id, college_id) references students(id, college_id),
  foreign key (curriculum_subject_id, college_id) references curriculum_subjects(id, college_id)
);

-- Finance
create table fee_assessments (
  id uuid primary key, college_id uuid not null, student_id uuid not null,
  academic_year text not null, category text not null check (category in ('tuition','transport','hostel','exam','other')),
  amount_paise bigint not null check (amount_paise >= 0),
  due_at timestamptz not null, policy_version text not null,
  source_ref text not null, observed_at timestamptz not null,
  unique (id, college_id),
  foreign key (student_id, college_id) references students(id, college_id)
);
create table schemes (
  id uuid primary key, college_id uuid not null references colleges(id),
  name text not null, policy_text text not null, policy_version text not null,
  unique (id, college_id)
);
create table scholarship_cases (
  id uuid primary key, college_id uuid not null, student_id uuid not null, scheme_id uuid not null,
  academic_year text not null,
  status text not null check (status in ('not_applied','applied','under_verification','approved','released','credited','rejected','needs_documents','cancelled','unknown')),
  expected_paise bigint not null check (expected_paise >= 0),
  released_paise bigint not null default 0 check (released_paise >= 0),
  source_ref text not null, observed_at timestamptz not null,
  version int not null default 1,
  unique (id, college_id),
  foreign key (student_id, college_id) references students(id, college_id),
  foreign key (scheme_id, college_id) references schemes(id, college_id)
);
create table scholarship_case_events (
  id uuid primary key default gen_random_uuid(), college_id uuid not null, case_id uuid not null,
  status text not null, note text not null default '', source_ref text not null, occurred_at timestamptz not null,
  foreign key (case_id, college_id) references scholarship_cases(id, college_id)
);
-- Single ledger: scholarship credits are payments of kind scholarship_credit, never a second balance source.
create table payments (
  id uuid primary key, college_id uuid not null, student_id uuid not null,
  kind text not null check (kind in ('student_payment','scholarship_credit','refund')),
  status text not null check (status in ('pending','settled','reversed')),
  source text not null, external_ref text not null,
  amount_paise bigint not null check (amount_paise > 0),
  scholarship_case_id uuid,
  posted_at timestamptz not null,
  unique (college_id, source, external_ref), unique (id, college_id),
  foreign key (student_id, college_id) references students(id, college_id),
  foreign key (scholarship_case_id, college_id) references scholarship_cases(id, college_id)
);
create table payment_allocations (
  college_id uuid not null, payment_id uuid not null, assessment_id uuid not null,
  amount_paise bigint not null check (amount_paise > 0),
  primary key (payment_id, assessment_id),
  foreign key (payment_id, college_id) references payments(id, college_id),
  foreign key (assessment_id, college_id) references fee_assessments(id, college_id)
);
create table document_requirements (
  id uuid primary key, college_id uuid not null, scheme_id uuid not null,
  name text not null, description text not null,
  unique (id, college_id),
  foreign key (scheme_id, college_id) references schemes(id, college_id)
);
create table student_documents (
  college_id uuid not null, student_id uuid not null, requirement_id uuid not null,
  state text not null check (state in ('missing','submitted','accepted','rejected','expired')),
  expires_at timestamptz, updated_at timestamptz not null,
  primary key (student_id, requirement_id),
  foreign key (student_id, college_id) references students(id, college_id),
  foreign key (requirement_id, college_id) references document_requirements(id, college_id)
);

-- Complaints
create table departments (
  id uuid primary key, college_id uuid not null references colleges(id),
  name text not null, handles text not null check (handles in ('scholarship','fees')),
  contact_label text not null,                -- approved directory entry; no external sending on Tuesday
  unique (id, college_id)
);
create table complaint_drafts (
  id uuid primary key default gen_random_uuid(), college_id uuid not null, student_id uuid not null,
  case_id uuid not null, case_version int not null, department_id uuid not null,
  subject text not null, body text not null, run_id uuid,
  created_at timestamptz not null default now(),
  unique (id, college_id),
  foreign key (student_id, college_id) references students(id, college_id),
  foreign key (case_id, college_id) references scholarship_cases(id, college_id),
  foreign key (department_id, college_id) references departments(id, college_id)
);
create sequence complaint_receipt_seq;
create table complaints (
  id uuid primary key default gen_random_uuid(), college_id uuid not null, student_id uuid not null,
  case_id uuid not null, department_id uuid not null, draft_id uuid,
  receipt_no text not null unique,
  status text not null check (status in ('submitted','assigned','in_progress','awaiting_student','resolved','verified_closed','reopened')),
  subject text not null, body text not null, content_hash text not null,
  version int not null default 1,
  created_at timestamptz not null default now(),
  unique (id, college_id),
  foreign key (student_id, college_id) references students(id, college_id),
  foreign key (case_id, college_id) references scholarship_cases(id, college_id),
  foreign key (department_id, college_id) references departments(id, college_id)
);
create table complaint_events (
  id uuid primary key default gen_random_uuid(), college_id uuid not null, complaint_id uuid not null,
  actor_user_id uuid not null references app_users(id), actor_role text not null,
  status text not null, note text not null default '',
  verification_basis text,                     -- required for verified_closed
  created_at timestamptz not null default now(),
  foreign key (complaint_id, college_id) references complaints(id, college_id)
);

-- Content (sample files stored in-DB, served only through authorized short-lived links)
create table documents (
  id uuid primary key, college_id uuid not null,
  curriculum_id uuid not null, subject_id uuid not null,
  kind text not null check (kind in ('material','paper')),
  title text not null, revision text not null, exam_year int,
  source text not null, license text not null,
  status text not null check (status in ('review','published','withdrawn')),
  mime text not null, bytes bytea not null, content_hash text not null,
  unique (id, college_id),
  foreign key (curriculum_id, college_id) references curricula(id, college_id),
  foreign key (subject_id, college_id) references subjects(id, college_id)
);
create table document_chunks (
  id uuid primary key default gen_random_uuid(), college_id uuid not null, document_id uuid not null,
  curriculum_id uuid not null, subject_id uuid not null, topic_id uuid,
  page int not null, section text not null, body text not null,
  tsv tsvector generated always as (to_tsvector('english', section || ' ' || body)) stored,
  foreign key (document_id, college_id) references documents(id, college_id)
);
create index document_chunks_scope on document_chunks (college_id, curriculum_id, subject_id);
create index document_chunks_tsv on document_chunks using gin (tsv);

-- Career
create table resume_versions (
  id uuid primary key default gen_random_uuid(), college_id uuid not null, student_id uuid not null,
  version int not null, facts jsonb not null, confirmed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (id, college_id), unique (student_id, version),
  foreign key (student_id, college_id) references students(id, college_id)
);

-- Jobs (tenant-owned listings; all seeded listings fictional)
create table opportunities (
  id uuid primary key, college_id uuid not null references colleges(id),
  company text not null, role text not null,
  category text not null check (category in ('it','non_it')),
  campus_type text not null check (campus_type in ('campus','off_campus')),
  level text not null check (level in ('fresher','internship')),
  location text not null, jd text not null, eligibility text not null, salary_text text,
  source_url text not null check (source_url like 'https://%'),
  apply_url text not null check (apply_url like 'https://%'),
  deadline_at timestamptz not null, verified_at timestamptz not null,
  status text not null check (status in ('draft','published','withdrawn')),
  is_fictional boolean not null default true,
  unique (id, college_id)
);
create table application_tracking (
  college_id uuid not null, student_id uuid not null, opportunity_id uuid not null,
  state text not null check (state in ('link_opened','reported_applied','reported_not_applied')),
  updated_at timestamptz not null default now(),
  primary key (student_id, opportunity_id),
  foreign key (student_id, college_id) references students(id, college_id),
  foreign key (opportunity_id, college_id) references opportunities(id, college_id)
);

-- Execution
create table agent_runs (
  id uuid primary key default gen_random_uuid(), college_id uuid not null references colleges(id),
  actor_user_id uuid not null references app_users(id), student_id uuid not null,
  kind text not null check (kind in ('scholarship','tutor','career')),
  state text not null check (state in ('queued','contextualizing','specialist','verifying','completed','failed','cancelled')),
  input jsonb not null, result jsonb, error text,
  prompt_version text, model_id text, provider text,
  model_calls int not null default 0, tool_calls int not null default 0,
  input_tokens int not null default 0, output_tokens int not null default 0,
  cancel_requested boolean not null default false,
  deadline_at timestamptz not null,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique (id, college_id),
  foreign key (student_id, college_id) references students(id, college_id)
);
create index agent_runs_actor_active on agent_runs (actor_user_id) where state in ('queued','contextualizing','specialist','verifying');
create table agent_steps (
  id bigserial primary key, college_id uuid not null, run_id uuid not null,
  kind text not null,                           -- tool:<name> | model | verify
  detail jsonb not null, created_at timestamptz not null default now(),
  foreign key (run_id, college_id) references agent_runs(id, college_id)
);

-- Durable queue = transactional outbox. No RLS: worker claims across tenants, then scopes domain work by job.college_id.
create table jobs (
  id uuid primary key default gen_random_uuid(),
  college_id uuid references colleges(id),
  kind text not null, payload jsonb not null,
  state text not null default 'queued' check (state in ('queued','running','succeeded','dead','cancelled')),
  run_at timestamptz not null default now(),
  locked_until timestamptz, worker_id text,
  lease_generation int not null default 0, attempt int not null default 0, max_attempts int not null default 3,
  dedup_key text not null unique, last_error text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index jobs_claimable on jobs (run_at) where state in ('queued','running');

-- Operations
create table notifications (
  id uuid primary key default gen_random_uuid(), college_id uuid not null references colleges(id),
  user_id uuid not null references app_users(id),
  event_key text not null, channel text not null default 'in_app',
  title text not null, body text not null,
  state text not null check (state in ('delivered','suppressed')),
  created_at timestamptz not null default now(),
  unique (college_id, user_id, event_key, channel)
);
create table notification_preferences (
  college_id uuid not null references colleges(id), user_id uuid not null references app_users(id),
  reminders_enabled boolean not null default true,
  primary key (college_id, user_id)
);
create table audit_events (
  id bigserial primary key, college_id uuid, actor_user_id uuid,
  action text not null, target text not null, result text not null,
  created_at timestamptz not null default now()
);
create table idempotency_keys (
  college_id uuid not null, user_id uuid not null, op text not null, key text not null,
  request_hash text not null, response jsonb not null, created_at timestamptz not null default now(),
  primary key (college_id, user_id, op, key)
);
create table feature_flags (
  name text primary key, enabled boolean not null, updated_at timestamptz not null default now()
);
insert into feature_flags (name, enabled) values
  ('ai_scholarship', true), ('ai_tutor', true), ('ai_career', true), ('complaints', true), ('reminders', true);

-- Least-privilege runtime role + RLS (defense in depth; server authorization is primary).
do $$ begin
  if not exists (select 1 from pg_roles where rolname = 'app_rw') then create role app_rw nologin; end if;
end $$;
grant usage on schema public to app_rw;
grant select, insert, update on all tables in schema public to app_rw;
grant usage, select on all sequences in schema public to app_rw;
revoke select, update on audit_events from app_rw;
revoke update on complaint_events, scholarship_case_events, agent_steps from app_rw; -- append-only

do $$ declare t text; begin
  foreach t in array array['branches','curricula','subjects','curriculum_subjects','topics','students','backlogs',
    'fee_assessments','schemes','scholarship_cases','scholarship_case_events','payments','payment_allocations',
    'document_requirements','student_documents','departments','complaint_drafts','complaints','complaint_events',
    'documents','document_chunks','resume_versions','opportunities','application_tracking','agent_runs','agent_steps',
    'notifications','notification_preferences','idempotency_keys'] loop
    execute format('alter table %I enable row level security', t);
    execute format('create policy tenant on %I to app_rw using (college_id = nullif(current_setting(''app.college_id'', true), '''')::uuid) with check (college_id = nullif(current_setting(''app.college_id'', true), '''')::uuid)', t);
  end loop;
end $$;
-- Membership lookup at sign-in happens before tenant is known: allow a user to read their own rows.
alter table memberships enable row level security;
create policy own_or_tenant on memberships to app_rw
  using (user_id = nullif(current_setting('app.user_id', true), '')::uuid
      or college_id = nullif(current_setting('app.college_id', true), '')::uuid)
  with check (false);
