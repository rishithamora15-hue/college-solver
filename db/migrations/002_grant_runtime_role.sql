-- Hosted Postgres (e.g. Supabase) connects as a non-superuser owner, which needs membership to `SET LOCAL ROLE app_rw`.
grant app_rw to current_user;
