import { pageActor, q } from '@/server/page';
import { one } from '@/server/db';
import { PrefsForm } from '../../client';
import { Empty } from '../../ui';

export default async function Settings() {
  const a = await pageActor();
  if (!a.studentId) return <Empty>Settings are available to students in this pilot.</Empty>;
  const sid = a.studentId;
  const [pref, st] = await q(a, async (c) => [
    await one(c, 'select reminders_enabled from notification_preferences where college_id = $1 and user_id = $2', [a.collegeId, a.userId]),
    await one(c, 'select display_name from students where college_id = $1 and id = $2', [a.collegeId, sid]),
  ] as const);
  return (
    <>
      <h1>Settings</h1>
      <PrefsForm enabled={pref?.reminders_enabled ?? true} displayName={st?.display_name ?? ''} />
    </>
  );
}
