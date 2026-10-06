import type { ReactNode } from 'react';
import Link from 'next/link';
import { pageActor, q } from '@/server/page';
import { many } from '@/server/db';
import { NavLinks, NoticeCenter, SignOut } from '../client';
import { providerLabel } from '@/server/ai';
import { initials } from '../ui';

export const dynamic = 'force-dynamic';

export default async function AppLayout({ children }: { children: ReactNode }) {
  const a = await pageActor();
  const notices = await q(a, (c) => many(c, `select id, title, body, sender, created_at, read_at from notifications
    where college_id = $1 and user_id = $2 and state = 'delivered' order by created_at desc limit 20`, [a.collegeId, a.userId]));
  const p = providerLabel();
  const items: [string, string][] = a.studentId
    ? [['/', 'Overview'], ['/academics', 'Academics'], ['/learn', 'Learn'], ['/fees', 'Fees & Scholarships'], ['/requests', 'Requests'],
      ['/career', 'Career'], ['/jobs', 'Jobs'], ['/complaints', 'Complaints']]
    : [];
  if (a.roles.includes('admin')) items.push(['/admin', 'Dashboard'], ['/admin/students', 'Students'], ['/admin/fees', 'Fees & payments'],
    ['/admin/academics', 'Academics'], ['/admin/requests', 'Requests'], ['/admin/notices', 'Notices'], ['/complaints', 'Complaints']);
  if (a.roles.includes('placement')) items.push(['/placement', 'Placement drives'], ['/placement/stats', 'Statistics']);
  if (a.roles.includes('faculty')) items.push(['/faculty', 'My classes']);
  items.push(['/settings', 'Settings']);
  const space = a.studentId ? 'Student' : a.roles.includes('admin') ? 'Administration office' : a.roles.includes('placement') ? 'Placement cell' : 'Faculty';
  return (
    <>
      <a className="skip" href="#main">Skip to content</a>
      <div className="shell">
        <aside className="side">
          <Link href="/" className="brand" aria-label="College Problem Solver home">
            <span className="brand-mark" aria-hidden="true">✦</span>
            <span className="brand-copy"><strong>College Solver</strong><small>{space}</small></span>
          </Link>
          <nav aria-label="Primary"><NavLinks items={items} /></nav>
          <div className="side-footer">
            <span className="side-art" aria-hidden="true" />
            Synthetic data · AI {p ? (p.live ? `live (${p.model})` : 'mock') : 'off'}
          </div>
        </aside>
        <div className="stage">
          <header className="top">
            <div className="top-identity">
              <span className="avatar" aria-hidden="true">{initials(a.displayName)}</span>
              <span><strong>{a.displayName}</strong><small>{a.collegeName}</small></span>
            </div>
            <div className="top-actions"><NoticeCenter initial={notices} /><SignOut /></div>
          </header>
          <main id="main">{children}</main>
        </div>
      </div>
    </>
  );
}
