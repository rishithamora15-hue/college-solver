-- 006: quiz sessions for self-evaluation, their history (progress tracker), and the AI coach that reviews a finished quiz.

alter table agent_runs drop constraint agent_runs_kind_check;
alter table agent_runs add constraint agent_runs_kind_check check (kind in ('scholarship', 'tutor', 'career', 'coach'));
insert into feature_flags (name, enabled) values ('ai_coach', true) on conflict do nothing;

-- question_ids fixes the paper when the quiz starts; results is filled once, on submit.
create table quiz_attempts (
  id uuid primary key default gen_random_uuid(), college_id uuid not null, student_id uuid not null,
  track text not null check (track in ('aptitude', 'communication', 'coding', 'interview')),
  learning_path text not null, question_ids text[] not null check (cardinality(question_ids) between 1 and 20),
  results jsonb, correct int check (correct >= 0), total int not null check (total = cardinality(question_ids)),
  coach_run_id uuid, created_at timestamptz not null default now(), submitted_at timestamptz,
  check ((submitted_at is null) = (results is null) and (results is null) = (correct is null)),
  unique (id, college_id),
  foreign key (student_id, college_id) references students(id, college_id)
);
create index quiz_attempts_history on quiz_attempts (student_id, track, submitted_at desc);

grant select, insert, update on quiz_attempts to app_rw;
alter table quiz_attempts enable row level security;
create policy tenant on quiz_attempts to app_rw
  using (college_id = nullif(current_setting('app.college_id', true), '')::uuid)
  with check (college_id = nullif(current_setting('app.college_id', true), '')::uuid);
