import { env } from '@/server/env';
import { many, tx } from '@/server/db';
import { DemoSignIn, PasswordSignIn } from '../client';

export const dynamic = 'force-dynamic';

export default async function SignIn() {
  const demo = env().AUTH_MODE === 'demo';
  // Synthetic demo accounts only (auth_subject 'demo:*'); app_users holds no secrets.
  const users = demo ? await tx((c) => many(c, `select substr(auth_subject, 6) handle, display_name from app_users where auth_subject like 'demo:%' order by display_name`)) : [];
  return (
    <main id="main" style={{ maxWidth: 640, margin: '0 auto' }}>
      <h1>College Problem Solver</h1>
      <div className="banner warn" role="note">Evaluation pilot with <strong>synthetic data only</strong>. Do not enter real student records.</div>
      {demo ? <>
        <h2>Choose a synthetic demo account</h2>
        <DemoSignIn users={users.map((u) => ({ handle: u.handle, name: u.display_name }))} />
      </> : <PasswordSignIn />}
    </main>
  );
}
