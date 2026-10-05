// Shared server-safe presentation helpers. Status always has a text label, never colour alone.
import type { ReactNode } from 'react';

export const inr = (paise: number) =>
  (paise < 0 ? '−' : '') + 'INR ' + (Math.abs(paise) / 100).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
export const when = (d: string | Date | null | undefined, tz = 'Asia/Kolkata') =>
  d ? new Date(d).toLocaleString('en-IN', { timeZone: tz, dateStyle: 'medium', timeStyle: 'short' }) + ' IST' : 'unknown';
export const day = (d: string | Date, tz = 'Asia/Kolkata') => new Date(d).toLocaleDateString('en-IN', { timeZone: tz, dateStyle: 'medium' });

const TONE: Record<string, string> = {
  credited: 'ok', accepted: 'ok', completed: 'ok', verified_closed: 'ok', published: 'ok',
  approved: 'info', released: 'info', submitted: 'info', assigned: 'info', in_progress: 'info', running: 'info', queued: 'info', resolved: 'info',
  missing: 'bad', expired: 'bad', rejected: 'bad', failed: 'bad', needs_documents: 'warn', awaiting_student: 'warn', unknown: 'warn', reopened: 'warn', cancelled: 'warn',
};
export function Status({ s }: { s: string }) {
  return <span className={`badge ${TONE[s] ?? 'info'}`}>{s.replaceAll('_', ' ')}</span>;
}

export function Source({ ref_, at, stale }: { ref_: string; at: string | Date; stale?: boolean }) {
  return (
    <p className="muted">
      Source: {ref_} · updated {when(at)} · <strong>synthetic data</strong>
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
