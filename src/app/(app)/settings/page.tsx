import { pageActor, q } from '@/server/page';
import { one } from '@/server/db';
import { env } from '@/server/env';
import { PasswordForm, PrefsForm } from '../../client';

export default async function Settings() {
  const a = await pageActor();
  const local = env().AUTH_MODE === 'local';
  if (!a.studentId) return (
    <>
      <span className="page-eyebrow">Your account</span><h1>Settings</h1>
      <p className="page-lead">{a.displayName} · {a.collegeName}</p>
      {local ? <div className="settings-grid"><PasswordForm student={false} /></div> : <p className="muted">Your password is managed by the college sign-in provider.</p>}
    </>
  );
  const sid = a.studentId;
  const [pref, st] = await q(a, async (c) => [
    await one(c, 'select reminders_enabled from notification_preferences where college_id = $1 and user_id = $2', [a.collegeId, a.userId]),
    await one(c, 'select st.display_name, st.phone, st.roll_no, u.email from students st join app_users u on u.id = st.user_id where st.college_id = $1 and st.id = $2', [a.collegeId, sid]),
  ] as const);
  return (
    <>
      <span className="page-eyebrow">Your preferences</span><h1>Settings</h1>
      <p className="page-lead">Roll number <strong>{st?.roll_no ?? '—'}</strong> · {st?.email}. Your role and college come from the college records.</p>
      <PrefsForm enabled={pref?.reminders_enabled ?? true} displayName={st?.display_name ?? ''} phone={st?.phone ?? ''} />
      {local && <div className="settings-grid"><PasswordForm student /></div>}
    </>
  );
}
