-- 007: running on real data in hosted Postgres (Supabase).
-- 1. The app talks to Postgres directly; nothing should be reachable through Supabase's REST/GraphQL Data API.
--    Older Supabase projects auto-grant every public table to anon/authenticated, which would expose app_users
--    (password hashes) and the job queue to anyone holding the public anon key. Revoke, now and for future tables.
-- 2. The administration office creates staff accounts from the UI. The runtime role still cannot write memberships;
--    this narrow function checks that the CALLER is an active admin of the current college.

do $$ declare r text; begin
  foreach r in array array['anon', 'authenticated'] loop
    if exists (select 1 from pg_roles where rolname = r) then
      execute format('revoke all on all tables in schema public from %I', r);
      execute format('revoke all on all sequences in schema public from %I', r);
      execute format('revoke all on all functions in schema public from %I', r);
      execute format('alter default privileges in schema public revoke all on tables from %I', r);
      execute format('alter default privileges in schema public revoke all on sequences from %I', r);
      execute format('alter default privileges in schema public revoke all on functions from %I', r);
    end if;
  end loop;
end $$;

create function set_staff_role(p_user uuid, p_role text, p_status text) returns void language plpgsql security definer set search_path = public as $$
declare col uuid := nullif(current_setting('app.college_id', true), '')::uuid;
        me uuid := nullif(current_setting('app.user_id', true), '')::uuid;
begin
  if p_role not in ('admin', 'placement', 'faculty') or p_status not in ('active', 'revoked') then raise exception 'invalid role or status'; end if;
  if col is null or me is null or not exists (select 1 from memberships where college_id = col and user_id = me and role = 'admin' and status = 'active')
    then raise exception 'only an active administrator can manage staff'; end if;
  if p_user = me then raise exception 'you cannot change your own roles'; end if;
  if exists (select 1 from memberships where user_id = p_user and (college_id <> col or role = 'student'))
    then raise exception 'account belongs to a student or another college'; end if;
  insert into memberships (college_id, user_id, role, status) values (col, p_user, p_role, p_status)
    on conflict (college_id, user_id, role) do update set status = excluded.status;
end $$;
revoke all on function set_staff_role(uuid, text, text) from public;
grant execute on function set_staff_role(uuid, text, text) to app_rw;

-- One subject code per college, so a subject shared by two branches' syllabi is one subject.
create unique index subjects_code on subjects (college_id, upper(code));
create unique index branches_code on branches (college_id, upper(code));
