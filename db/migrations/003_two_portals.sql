-- 003: two sign-in portals (student / staff). Staff collapses to the administration office and the placement cell.

alter table memberships drop constraint memberships_role_check;
delete from memberships where role = 'content_editor';
update memberships set role = 'admin' where role in ('finance_staff', 'college_admin');
update memberships set role = 'placement' where role = 'placement_staff';
alter table memberships add constraint memberships_role_check check (role in ('student', 'admin', 'placement'));
update complaint_events set actor_role = 'admin' where actor_role = 'finance_staff';

-- Local credentials: scrypt hash. Students start with their roll number as password. Null = cannot sign in locally.
alter table app_users add column password_hash text;

alter table students add column roll_no text, add column phone text check (phone ~ '^[6-9][0-9]{9}$');
create unique index students_roll_no on students (college_id, upper(roll_no));

-- Notices raised by the administration office / placement cell pop up on the student's screen until read.
alter table notifications add column sender text, add column read_at timestamptz;
create index notifications_unread on notifications (user_id, created_at desc) where read_at is null;
