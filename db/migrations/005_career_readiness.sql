-- 005: career readiness. Each student's learning path (target role), LMS lesson completion and graded practice answers.
-- Modules and questions are versioned in code (src/server/prep-bank.ts); only student activity is stored here.

alter table students add column learning_path text check (learning_path in ('software', 'data', 'qa', 'business'));

create table module_progress (
  college_id uuid not null, student_id uuid not null, module_id text not null,
  completed_at timestamptz not null default now(),
  primary key (student_id, module_id),
  foreign key (student_id, college_id) references students(id, college_id)
);

-- The first answer to a question is the graded one. No update grant: a retry can never overwrite it and inflate a score.
create table practice_answers (
  college_id uuid not null, student_id uuid not null, question_id text not null,
  track text not null check (track in ('aptitude', 'communication', 'coding', 'interview')),
  choice smallint not null check (choice >= 0), correct boolean not null,
  answered_at timestamptz not null default now(),
  primary key (student_id, question_id),
  foreign key (student_id, college_id) references students(id, college_id)
);
create index practice_answers_recent on practice_answers (student_id, track, answered_at desc);

grant select, insert on module_progress, practice_answers to app_rw;
do $$ declare t text; begin
  foreach t in array array['module_progress', 'practice_answers'] loop
    execute format('alter table %I enable row level security', t);
    execute format('create policy tenant on %I to app_rw using (college_id = nullif(current_setting(''app.college_id'', true), '''')::uuid) with check (college_id = nullif(current_setting(''app.college_id'', true), '''')::uuid)', t);
  end loop;
end $$;
