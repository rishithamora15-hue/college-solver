import type { ReactNode } from 'react';
import { pageActor, q } from '@/server/page';
import { many } from '@/server/db';
import { NavLinks, SignOut } from '../client';
import { providerLabel } from '@/server/ai';

export const dynamic = 'force-dynamic';

export default async function AppLayout({ children }: { children: ReactNode }) {
  const a = await pageActor();
  const unread = await q(a, (c) => many(c, `select title, created_at from notifications where college_id = $1 and user_id = $2 order by created_at desc limit 5`, [a.collegeId, a.userId]));
  const p = providerLabel();
  const items: [string, string][] = a.studentId
    ? [['/', 'Overview'], ['/fees', 'Fees & Scholarships'], ['/learn', 'Learn'], ['/career', 'Career'], ['/jobs', 'Jobs'], ['/complaints', 'Complaints'], ['/settings', 'Settings']]
    : [['/jobs', 'Jobs']];
  if (a.roles.includes('finance_staff')) items.push(['/staff', 'Staff workspace']);
  return (
    <>
      <a className="skip" href="#main">Skip to content</a>
      <div className="shell">
        <aside className="side">
          <h1 style={{ fontSize: 18 }}>College Problem Solver</h1>
          <nav aria-label="Primary"><NavLinks items={items} /></nav>
        </aside>
        <div>
          <header className="top">
            <div><strong>{a.collegeName}</strong> <span className="muted">· {a.displayName} · {a.roles.join(', ')}</span></div>
            <details className="more">
              <summary>Notifications ({unread.length})</summary>
              <ul>{unread.map((n, i) => <li key={i}>{n.title}</li>)}</ul>
            </details>
            <SignOut />
          </header>
          <div className="banner warn" role="note" style={{ margin: '16px 24px 0' }}>
            Evaluation pilot with <strong>synthetic data only</strong>. Not for real student records.
            {' '}AI: {p ? (p.live ? `live (${p.model})` : 'MOCK fixture — not a real model') : 'not configured (manual options only)'}.
          </div>
          <main id="main">{children}</main>
        </div>
      </div>
    </>
  );
}
