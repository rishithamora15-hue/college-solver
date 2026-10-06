-- 004: digital college. Teaching faculty, timetable, attendance, marks, student requests, online document
-- uploads, office payments with receipts, placement eligibility and interview rounds.

alter table memberships drop constraint memberships_role_check;
alter table memberships add constraint memberships_role_check check (role in ('student', 'admin', 'placement', 'faculty'));

-- A class = curriculum + semester + section.
alter table students add column section text not null default 'A' check (section ~ '^[A-Z]$'),
  add column cgpa numeric(4,2) check (cgpa between 0 and 10);

-- One teacher per subject per section.
create table teaching_assignments (
  id uuid primary key default gen_random_uuid(), college_id uuid not null references colleges(id),
  faculty_user_id uuid not null references app_users(id), curriculum_subject_id uuid not null, section text not null check (section ~ '^[A-Z]$'),
  unique (curriculum_subject_id, section), unique (id, college_id),
  foreign key (curriculum_subject_id, college_id) references curriculum_subjects(id, college_id)
);
create table timetable_slots (
  id uuid primary key default gen_random_uuid(), college_id uuid not null, assignment_id uuid not null,
  day smallint not null check (day between 1 and 6), period smallint not null check (period between 1 and 8),
  starts_at time not null, ends_at time not null check (ends_at > starts_at), room text not null default '',
  unique (assignment_id, day, period),
  foreign key (assignment_id, college_id) references teaching_assignments(id, college_id) on delete cascade
);
create table attendance_sessions (
  id uuid primary key default gen_random_uuid(), college_id uuid not null, assignment_id uuid not null,
  held_on date not null, period smallint not null check (period between 1 and 8),
  marked_by uuid not null references app_users(id), updated_at timestamptz not null default now(),
  unique (assignment_id, held_on, period), unique (id, college_id),
  foreign key (assignment_id, college_id) references teaching_assignments(id, college_id)
);
create table attendance_marks (
  college_id uuid not null, session_id uuid not null, student_id uuid not null, present boolean not null,
  primary key (session_id, student_id),
  foreign key (session_id, college_id) references attendance_sessions(id, college_id),
  foreign key (student_id, college_id) references students(id, college_id)
);
create table assessments (
  id uuid primary key default gen_random_uuid(), college_id uuid not null, assignment_id uuid not null,
  name text not null, max_marks int not null check (max_marks between 1 and 1000),
  published boolean not null default false, created_at timestamptz not null default now(),
  unique (assignment_id, name), unique (id, college_id),
  foreign key (assignment_id, college_id) references teaching_assignments(id, college_id)
);
create table marks (
  college_id uuid not null, assessment_id uuid not null, student_id uuid not null,
  marks numeric(6,1) check (marks >= 0),                 -- null = absent
  primary key (assessment_id, student_id),
  foreign key (assessment_id, college_id) references assessments(id, college_id),
  foreign key (student_id, college_id) references students(id, college_id)
);

-- Certificates and leave, decided by the administration office.
create table service_requests (
  id uuid primary key default gen_random_uuid(), college_id uuid not null, student_id uuid not null,
  kind text not null check (kind in ('bonafide','study','conduct','transfer','other_certificate','leave')),
  reason text not null, from_date date, to_date date, check (kind <> 'leave' or (from_date is not null and to_date >= from_date)),
  status text not null default 'pending' check (status in ('pending','approved','rejected','ready')),
  admin_note text not null default '', decided_by uuid references app_users(id), decided_at timestamptz,
  created_at timestamptz not null default now(),
  unique (id, college_id),
  foreign key (student_id, college_id) references students(id, college_id)
);

-- Scholarship documents uploaded online by the student (PDF/JPEG/PNG, size-checked in the app).
create table document_uploads (
  id uuid primary key default gen_random_uuid(), college_id uuid not null, student_id uuid not null, requirement_id uuid not null,
  filename text not null, mime text not null, bytes bytea not null, uploaded_at timestamptz not null default now(),
  unique (id, college_id),
  foreign key (student_id, college_id) references students(id, college_id),
  foreign key (requirement_id, college_id) references document_requirements(id, college_id)
);

-- Office-recorded payments carry a receipt number (external_ref) and mode.
alter table payments add column mode text check (mode in ('cash','upi','card','bank_transfer','cheque','dd')),
  add column reference text, add column recorded_by uuid references app_users(id);
create sequence receipt_seq;

-- Placement eligibility and interview rounds.
alter table opportunities add column min_cgpa numeric(4,2) check (min_cgpa between 0 and 10),
  add column max_backlogs int check (max_backlogs >= 0), add column branches text[];
alter table application_tracking add column stage text check (stage in ('shortlisted','interview','selected','offer_accepted','rejected')),
  add column stage_updated_at timestamptz;

-- The runtime role can never write memberships (no self-granted staff roles). Admitting a student is the one narrow
-- exception: student role only, current tenant only, and only for an account that has no role anywhere yet.
create function admit_student(p_user uuid) returns void language plpgsql security definer set search_path = public as $$
begin
  if exists (select 1 from memberships where user_id = p_user) then raise exception 'account already has a role'; end if;
  insert into memberships (college_id, user_id, role) values (nullif(current_setting('app.college_id', true), '')::uuid, p_user, 'student');
end $$;
revoke all on function admit_student(uuid) from public;
grant execute on function admit_student(uuid) to app_rw;

grant select, insert, update on teaching_assignments, timetable_slots, attendance_sessions, attendance_marks, assessments, marks,
  service_requests, document_uploads to app_rw;
grant delete on teaching_assignments, timetable_slots to app_rw;
grant usage, select on receipt_seq to app_rw;
do $$ declare t text; begin
  foreach t in array array['teaching_assignments','timetable_slots','attendance_sessions','attendance_marks','assessments','marks',
    'service_requests','document_uploads'] loop
    execute format('alter table %I enable row level security', t);
    execute format('create policy tenant on %I to app_rw using (college_id = nullif(current_setting(''app.college_id'', true), '''')::uuid) with check (college_id = nullif(current_setting(''app.college_id'', true), '''')::uuid)', t);
  end loop;
end $$;
