// Shared server-safe presentation helpers. Status always has a text label, never colour alone.
import type { ReactNode } from 'react';
import Link from 'next/link';
import { SECTIONS, type Section } from './sections';

export const inr = (paise: number) =>
  (paise < 0 ? '−' : '') + 'INR ' + (Math.abs(paise) / 100).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
export const when = (d: string | Date | null | undefined, tz = 'Asia/Kolkata') =>
  d ? new Date(d).toLocaleString('en-IN', { timeZone: tz, dateStyle: 'medium', timeStyle: 'short' }) + ' IST' : 'unknown';
export const day = (d: string | Date, tz = 'Asia/Kolkata') => new Date(d).toLocaleDateString('en-IN', { timeZone: tz, dateStyle: 'medium' });

const TONE: Record<string, string> = {
  credited: 'ok', accepted: 'ok', completed: 'ok', verified_closed: 'ok', published: 'ok',
  approved: 'info', released: 'info', submitted: 'info', assigned: 'info', in_progress: 'info', running: 'info', queued: 'info', resolved: 'info',
  missing: 'bad', expired: 'bad', rejected: 'bad', failed: 'bad', needs_documents: 'warn', awaiting_student: 'warn', unknown: 'warn', reopened: 'warn', cancelled: 'warn',
  cleared: 'ok', overdue: 'bad', pending: 'neutral', applied: 'info', under_verification: 'info', withdrawn: 'neutral',
  reported_applied: 'ok', link_opened: 'warn', reported_not_applied: 'neutral', not_seen: 'neutral',
};
const LABEL: Record<string, string> = { reported_applied: 'applied', link_opened: 'opened, not applied', reported_not_applied: 'not applying', accepted: 'verified', published: 'live', withdrawn: 'closed' };
export function Status({ s }: { s: string }) {
  return <span className={`badge ${TONE[s] ?? 'info'}`}>{LABEL[s] ?? s.replaceAll('_', ' ')}</span>;
}

export function Source({ ref_, at, stale }: { ref_: string; at: string | Date; stale?: boolean }) {
  return (
    <p className="muted">
      Source: {ref_} · updated {when(at)}
      {stale && <> · <span className="badge warn">stale</span></>}
    </p>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <div className="card muted" role="status">{children}</div>;
}
export function NotFound({ what }: { what: string }) {
  return <div className="banner bad" role="alert">{what} was not found, or you do not have access to it.</div>;
}

export function Stat({ label, value, tone, href }: { label: string; value: ReactNode; tone: 'violet' | 'teal' | 'amber' | 'rose' | 'sky'; href?: string }) {
  const inner = <><span className="stat-label">{label}</span><strong className="stat-value">{value}</strong></>;
  return href ? <a className={`stat tone-${tone}`} href={href}>{inner}</a> : <div className={`stat tone-${tone}`}>{inner}</div>;
}

/** Stacked bar: applied / opened-not-applied / not applying / not seen. Numbers are always shown as text too. */
export function Funnel({ applied, opened, declined, total }: { applied: number; opened: number; declined: number; total: number }) {
  const none = Math.max(0, total - applied - opened - declined);
  const pct = (n: number) => `${total ? (n / total) * 100 : 0}%`;
  return (
    <div className="funnel">
      <div className="funnel-bar" aria-hidden="true">
        <span className="f-applied" style={{ width: pct(applied) }} /><span className="f-opened" style={{ width: pct(opened) }} />
        <span className="f-declined" style={{ width: pct(declined) }} /><span className="f-none" style={{ width: pct(none) }} />
      </div>
      <ul className="funnel-legend">
        <li><i className="f-applied" />{applied} applied</li><li><i className="f-opened" />{opened} opened, not applied</li>
        <li><i className="f-declined" />{declined} not applying</li><li><i className="f-none" />{none} not seen</li>
      </ul>
    </div>
  );
}

/** Select options for "who is this for": whole college, a class (all sections or one). */
export function targetOptions(classes: { curriculum_id: string; branch: string; semester: number; section: string }[]): [string, string][] {
  const out: [string, string][] = [['all', 'Whole college (all students)']];
  for (const k of classes) {
    const all = `class:${k.curriculum_id}:${k.semester}:*`;
    if (!out.some(([v]) => v === all)) out.push([all, `${k.branch} semester ${k.semester} (all sections)`]);
    out.push([`class:${k.curriculum_id}:${k.semester}:${k.section}`, `${k.branch} semester ${k.semester} section ${k.section}`]);
  }
  return out;
}

/** A subject as one clickable tile: code badge, name, semester and state. */
export function SubjectTiles({ subjects, selected }: { subjects: { id: string; code: string; name: string; semester: number; backlog?: unknown; is_current?: boolean }[]; selected?: string }) {
  return (
    <ul className="subject-list">{subjects.map((s) => (
      <li key={s.id}>
        <Link className="subject-tile" href={`/learn?s=${s.id}`} aria-current={s.id === selected ? 'page' : undefined}>
          <span className="subject-code">{s.code}</span>
          <span className="subject-name">{s.name}
            <small>Semester {s.semester}{!!s.backlog && <span className="badge warn">backlog</span>}{s.is_current && <span className="badge info">current</span>}</small>
          </span>
        </Link>
      </li>
    ))}</ul>
  );
}

export const initials =(name: string) => name.replace(/\(.*\)/, '').trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase()).join('');

/** Tab bar shared by the pages of one student section. `current` is the href of this page. */
export function SectionTabs({ section, current }: { section: Section; current: string }) {
  return (
    <nav className="tabs" aria-label="Section pages">
      {SECTIONS[section].map(([href, label]) => <Link key={href} href={href} aria-current={href === current ? 'page' : undefined}>{label}</Link>)}
    </nav>
  );
}
