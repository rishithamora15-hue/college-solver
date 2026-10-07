'use client';
// Interactive pieces. All mutations go through /api/v1 with JSON + Idempotency-Key where required.
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useId, useRef, useState, type FormEvent, type ReactNode } from 'react';
import type { ClientQuestion } from '@/server/prep';
import type { Explain } from '@/server/prep-explain';

type RunKind = 'scholarship' | 'tutor' | 'career' | 'coach';
type ApiErr = { code: string; message: string; request_id: string; fields?: string[]; retry_after_s?: number; problems?: string[] };
export async function api<T = any>(path: string, method = 'POST', body?: unknown, idemKey?: string): Promise<T> {
  const res = await fetch(path, {
    method, headers: { 'content-type': 'application/json', ...(idemKey ? { 'idempotency-key': idemKey } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({ error: { code: 'network', message: 'Unexpected response', request_id: '-' } }));
  if (!res.ok) throw data.error as ApiErr;
  return data;
}

async function upload<T = any>(path: string, form: FormData): Promise<T> {
  const res = await fetch(path, { method: 'POST', body: form });
  const data = await res.json().catch(() => ({ error: { code: 'network', message: 'Unexpected response', request_id: '-' } }));
  if (!res.ok) throw data.error as ApiErr;
  return data;
}

export function ErrorBox({ err }: { err: ApiErr | null }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => { if (err) ref.current?.focus(); }, [err]);
  if (!err) return null;
  return (
    <div ref={ref} tabIndex={-1} role="alert" className="banner bad">
      {err.message}{err.fields?.length ? ` (${err.fields.join(', ')})` : ''} <span className="muted">· ref {err.request_id}</span>
      {err.problems?.length ? <ul className="problems">{err.problems.map((p) => <li key={p}>{p}</li>)}</ul> : null}
    </div>
  );
}

const ICONS: Record<string, string> = {
  home: 'M3 10.5 12 3l9 7.5V21h-6v-6H9v6H3z',
  fees: 'M4 3h16v18l-4-2-4 2-4-2-4 2z M8 8h8 M8 12h8',
  learn: 'M3 5c4-2 7-1 9 1 2-2 5-3 9-1v14c-4-2-7-1-9 1-2-2-5-3-9-1z M12 6v14',
  career: 'M3 8h18v13H3z M8 8V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v3 M3 13h18',
  jobs: 'M4 7h16v14H4z M9 7V4h6v3 M4 13h16',
  complaints: 'M4 4h16v13H9l-5 4z M8 9h8 M8 13h5',
  settings: 'M12 3v3 M12 18v3 M3 12h3 M18 12h3 M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8z',
  admin: 'M3 3h7v9H3z M14 3h7v5h-7z M14 12h7v9h-7z M3 16h7v5H3z',
  placement: 'M12 2l3 6 6 .9-4.5 4.3 1 6.3L12 16.5 6.5 19.5l1-6.3L3 8.9 9 8z',
  academics: 'M3 4h18v17H3z M3 9h18 M8 2v4 M16 2v4 M7 13h3 M14 13h3 M7 17h3',
  requests: 'M6 2h9l5 5v15H6z M14 2v6h6 M9 13h8 M9 17h6',
  faculty: 'M12 3 2 8l10 5 10-5z M6 10v6c3 2 9 2 12 0v-6',
  students: 'M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z M2 21c0-4 3-6 7-6s7 2 7 6 M17 11a3 3 0 1 0 0-6 M22 21c0-3-2-5-5-5',
  notices: 'M3 11v2l13 5V6z M16 8a4 4 0 0 1 0 8 M6 13l1 6h3l-1-5',
  stats: 'M4 20V10 M10 20V4 M16 20v-7 M22 20H2',
  setup: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z M19 12h2 M3 12h2 M12 3v2 M12 19v2 M17 7l1.5-1.5 M5.5 18.5 7 17 M17 17l1.5 1.5 M5.5 5.5 7 7',
  prep: 'M5 21V4 M5 4h12l-2.5 4L17 12H5',
  aptitude: 'M6 3h12v18H6z M9 7h6 M9 11h.01 M12 11h.01 M15 11h.01 M9 15h.01 M12 15h.01 M15 15h.01',
  communication: 'M3 5h12v9H8l-5 4z M18 9h3v10l-4-3h-6v-2',
  coding: 'M8 7l-5 5 5 5 M16 7l5 5-5 5 M14 4l-4 16',
};

/** An entry is active when the path is under its href or any of its extra paths; the longest match wins. */
export function NavLinks({ items }: { items: [string, string, string[]?][] }) {
  const path = usePathname();
  const hit = (h: string) => (h === '/' ? path === '/' : path === h || path.startsWith(h + '/'));
  const active = items.flatMap(([href, , more = []]) => [href, ...more].filter(hit).map((m) => [href, m.length] as const)).sort((x, y) => y[1] - x[1])[0]?.[0];
  return <>{items.map(([href, label]) => {
    const tone = href.split('/').pop() || 'home';
    return (
      <Link key={href} href={href} data-tone={tone} aria-current={href === active ? 'page' : undefined}>
        <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={ICONS[tone] ?? ICONS.home} /></svg>{label}
      </Link>
    );
  })}</>;
}

export function SignOut() {
  const r = useRouter();
  return <button className="secondary" onClick={async () => { await api('/api/v1/auth/signout'); r.push('/signin'); r.refresh(); }}>Sign out</button>;
}

/** Two portals only. Students: college email + roll number. Staff: assigned credentials; the server routes admin vs placement. */
const CAP = 'M2 9l10-5 10 5-10 5z M6 11v5c3 2.5 9 2.5 12 0v-5 M22 9v6';
const DESK = 'M3 21h18 M5 21V8l7-5 7 5v13 M9 21v-5h6v5 M9 10h.01 M15 10h.01 M12 10h.01';

export function SignInPortal({ initial = null }: { initial?: 'student' | 'staff' | null }) {
  const [portal, setPortal] = useState<'student' | 'staff' | null>(initial);
  const [err, setErr] = useState<ApiErr | null>(null);
  const [busy, setBusy] = useState(false);
  const r = useRouter();
  if (!portal) return (
    <div className="portal-choice">
      {([['student', 'Student', 'Sign in with your college email', CAP], ['staff', 'Faculty & Staff', 'Faculty · Administration office · Placement cell', DESK]] as const).map(([k, title, sub, icon]) => (
        <button key={k} type="button" className={`portal-card portal-${k}`} onClick={() => setPortal(k)}>
          <span className="portal-art" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d={icon} /></svg></span>
          <span className="portal-text"><strong>{title}</strong><small>{sub}</small></span>
          <span className="portal-go" aria-hidden="true">→</span>
        </button>
      ))}
    </div>
  );
  const student = portal === 'student';
  return (
    <form className={`portal-form portal-${portal}`} onSubmit={async (e) => {
      e.preventDefault(); setBusy(true); setErr(null);
      const f = new FormData(e.currentTarget);
      try {
        const res = await api('/api/v1/auth/password', 'POST', { portal, email: f.get('email'), password: f.get('password') });
        r.push(res.next); r.refresh();
      } catch (x) { setErr(x as ApiErr); setBusy(false); }
    }}>
      <button type="button" className="back-link" onClick={() => { setPortal(null); setErr(null); }}>← Back</button>
      <h2>{student ? 'Student sign-in' : 'Faculty & staff sign-in'}</h2>
      <ErrorBox err={err} />
      <label htmlFor="email">{student ? 'College email' : 'Staff email'}</label>
      <input id="email" name="email" type="email" autoComplete="username" required autoFocus placeholder={student ? 'you@college.edu' : 'name@college.edu'} />
      <label htmlFor="password">{student ? 'Password (your roll number)' : 'Password'}</label>
      <input id="password" name="password" type="password" autoComplete="current-password" required />
      <button className="wide" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
    </form>
  );
}

type Notice = { id: string; title: string; body: string; sender: string | null; created_at: string; read_at: string | null };
const ago = (d: string) => { const m = Math.round((Date.now() - +new Date(d)) / 60000); return m < 1 ? 'just now' : m < 60 ? `${m} min ago` : m < 1440 ? `${Math.round(m / 60)} h ago` : new Date(d).toLocaleDateString('en-IN', { dateStyle: 'medium' }); };

/**
 * Bell + pop-ups. Polls every 5 s while the tab is visible, so a notice raised by the office appears within seconds.
 * ponytail: polling; switch to SSE + LISTEN/NOTIFY if thousands of students are online at once.
 */
const TOAST_MAX = 2, TOAST_MS = 8000;
export function NoticeCenter({ initial }: { initial: Notice[] }) {
  const [items, setItems] = useState(initial);
  const [toasts, setToasts] = useState<Notice[]>(() => initial.filter((n) => !n.read_at && n.sender).slice(0, TOAST_MAX));
  const [open, setOpen] = useState(false);
  const seen = useRef(new Set(initial.map((n) => n.id)));
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  const box = useRef<HTMLDivElement>(null);
  const r = useRouter();
  // Pop-ups tuck themselves away so they never sit on top of the page; they stay unread in the bell.
  useEffect(() => {
    for (const n of toasts) if (!timers.current.has(n.id))
      timers.current.set(n.id, setTimeout(() => setToasts((ts) => ts.filter((x) => x.id !== n.id)), TOAST_MS));
  }, [toasts]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);
  useEffect(() => {
    let t: ReturnType<typeof setTimeout>;
    const poll = async () => {
      if (document.visibilityState === 'visible') {
        try {
          const next = (await api<{ items: Notice[] }>('/api/v1/notifications', 'GET')).items;
          const fresh = next.filter((n) => !seen.current.has(n.id) && !n.read_at);
          fresh.forEach((n) => seen.current.add(n.id));
          setItems(next);
          if (fresh.length) { setToasts((ts) => [...fresh, ...ts].slice(0, TOAST_MAX)); r.refresh(); }
        } catch { /* offline or signed out: try again next tick */ }
      }
      t = setTimeout(poll, 5000);
    };
    t = setTimeout(poll, 5000);
    return () => clearTimeout(t);
  }, [r]);
  useEffect(() => {
    if (!open) return;
    const close = (e: Event) => { if (e instanceof KeyboardEvent ? e.key === 'Escape' : !box.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', close); document.addEventListener('keydown', close);
    return () => { document.removeEventListener('mousedown', close); document.removeEventListener('keydown', close); };
  }, [open]);
  const markRead = (ids?: string[]) => {
    api('/api/v1/notifications', 'PATCH', ids ? { ids } : { all: true }).catch(() => {});
    const now = new Date().toISOString();
    setItems((xs) => xs.map((n) => (!ids || ids.includes(n.id) ? { ...n, read_at: n.read_at ?? now } : n)));
    setToasts((ts) => (ids ? ts.filter((x) => !ids.includes(x.id)) : []));
  };
  const unread = items.filter((n) => !n.read_at).length;
  return (
    <>
      <div className="bell-wrap" ref={box}>
        <button type="button" className="bell" aria-expanded={open} aria-label={`Notifications, ${unread} unread`} onClick={() => setOpen(!open)}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9 M10.3 21a1.94 1.94 0 0 0 3.4 0" /></svg>
          {unread > 0 && <span className="bell-count">{unread}</span>}
        </button>
        {open && (
          <div className="bell-panel" role="dialog" aria-label="Notifications">
            <div className="bell-head"><strong>Notifications</strong>{unread > 0 && <button type="button" className="text-btn" onClick={() => markRead()}>Mark all read</button>}</div>
            {!items.length ? <p className="muted">You're all caught up.</p> : (
              <ul>{items.map((n) => (
                <li key={n.id} className={n.read_at ? '' : 'unread'}>
                  {n.sender && <span className="notice-from">{n.sender}</span>}
                  <strong>{n.title}</strong>{n.body && <p>{n.body}</p>}
                  <small>{ago(n.created_at)}{!n.read_at && <> · <button type="button" className="text-btn" onClick={() => markRead([n.id])}>Mark read</button></>}</small>
                </li>
              ))}</ul>
            )}
          </div>
        )}
      </div>
      <div className="toast-stack" aria-live="polite">
        {toasts.map((n) => (
          <div key={n.id} className="toast" role="status">
            <span className="toast-dot" aria-hidden="true" />
            <div>
              <span className="notice-from">{n.sender ?? 'Update'}</span>
              <strong>{n.title}</strong>{n.body && <p>{n.body}</p>}
            </div>
            <button type="button" className="text-btn" onClick={() => markRead([n.id])}>Got it</button>
          </div>
        ))}
      </div>
    </>
  );
}

/** Polls a durable run (bounded, honours retry hint). Survives reloads because state lives in the database. */
export function RunView({ runId, render }: { runId: string; render: RunKind }) {
  const [run, setRun] = useState<any>(null);
  const [err, setErr] = useState<ApiErr | null>(null);
  useEffect(() => {
    let stop = false, n = 0;
    const tick = async () => {
      try {
        const r = await api(`/api/v1/runs/${runId}`, 'GET');
        if (stop) return;
        setRun(r);
        if (r.retry_after_s && n++ < 90) setTimeout(tick, r.retry_after_s * 1000);
      } catch (e) { setErr(e as ApiErr); }
    };
    tick();
    return () => { stop = true; };
  }, [runId]);
  if (err) return <ErrorBox err={err} />;
  if (!run) return <p role="status">Loading run…</p>;
  const done = run.state === 'completed';
  return (
    <section className="card" aria-live="polite" aria-busy={!['completed', 'failed', 'cancelled'].includes(run.state)}>
      <p className="muted">
        Run {run.state.replaceAll('_', ' ')} · {run.live_ai ? `Live AI: ${run.model_id}` : <strong>Mock AI (fixture, not a real model)</strong>} · prompt {run.prompt_version}
        {' '}· model calls {run.model_calls}, tool calls {run.tool_calls}
      </p>
      {!done && !['failed', 'cancelled'].includes(run.state) && (
        <button className="secondary" onClick={() => api(`/api/v1/runs/${runId}/cancel`).then(() => location.reload())}>Cancel</button>
      )}
      {run.state === 'failed' && <div className="banner bad" role="alert">The AI step failed ({run.error}). Nothing was submitted. You can use the manual option instead.</div>}
      {done && <RunResult kind={render} r={run.result} />}
    </section>
  );
}

function Text({ t }: { t: string }) {
  const parts = t.split(/```[a-z0-9+#-]*\n?/i);
  return <>{parts.map((p, i) => (i % 2 ? <pre key={i}><code>{p}</code></pre> : <p key={i} style={{ whiteSpace: 'pre-wrap' }}>{p.trim()}</p>))}</>;
}

function RunResult({ kind, r }: { kind: string; r: any }) {
  if (kind === 'tutor') {
    const idx = new Map<string, number>((r.sources ?? []).map((s: any, i: number) => [s.id, i + 1]));
    return (
      <>
        {r.abstained && <div className="banner warn" role="status">The tutor did not answer this from your approved notes.</div>}
        {r.from_notes === false && <div className="banner info" role="note"><strong>Not found in your notes.</strong> This is a general explanation from the AI, so check it against your faculty&apos;s material.</div>}
        {r.key_points?.length > 0 && <div className="key-points"><h3>Points to remember</h3><ul>{r.key_points.map((p: string, i: number) => <li key={i}>{p}</li>)}</ul></div>}
        <Text t={r.answer} />
        {r.claims?.length > 0 && <><h3>Cited points</h3><ul>{r.claims.map((c: any, i: number) => <li key={i}>{c.text} {c.source_ids.map((s: string) => <sup key={s}>[{idx.get(s) ?? '?'}]</sup>)}</li>)}</ul></>}
        {r.supplemental && <><h3>Supplemental (general knowledge, not from your sources)</h3><Text t={r.supplemental} /></>}
        {r.sources?.length > 0 && <><h3>Sources</h3><ol>{r.sources.map((s: any) => <li key={s.id}>{s.title} · {s.revision} · page {s.page} · {s.section} · <a href={`/api/v1/documents/${s.document_id}/download`}>open</a></li>)}</ol></>}
        {r.uncertainties?.length > 0 && <p className="muted">Uncertain: {r.uncertainties.join(' ')}</p>}
        <p className="muted">Code shown is illustrative and was not executed.</p>
      </>
    );
  }
  if (kind === 'coach') {
    const mod = (id: string) => r.modules?.find((m: any) => m.id === id);
    const at = (id: string) => (mod(id) ? <Link href={mod(id).href}>{mod(id).title}</Link> : id);
    return (
      <>
        <p><strong>{r.summary}</strong></p>
        <div className="coach-grid">
          {r.strengths?.length > 0 && <div><h3>What you did well</h3><ul>{r.strengths.map((x: any, i: number) => <li key={i}>{at(x.module_id)}: {x.text}</li>)}</ul></div>}
          {r.gaps?.length > 0 && <div><h3>Where you are lacking</h3><ul>{r.gaps.map((x: any, i: number) => <li key={i}>{at(x.module_id)}: {x.text}</li>)}</ul></div>}
        </div>
        <h3>What to learn next</h3>
        <ol>{r.next_steps?.map((x: any, i: number) => <li key={i}>{x.action} ({at(x.module_id)})</li>)}</ol>
        <p className="banner info" role="note">{r.encouragement}</p>
      </>
    );
  }
  if (kind === 'scholarship') {
    return (
      <>
        <Text t={r.answer} />
        <p><strong>Possible cause (not confirmed):</strong> {r.possible_cause}</p>
        <h3>Evidence</h3>
        <ul>{r.claims.map((c: any, i: number) => <li key={i}>{c.text} <span className="muted">[{c.source_ids.join(', ')}]</span></li>)}</ul>
        {r.uncertainties?.length > 0 && <p className="muted">Uncertain: {r.uncertainties.join(' ')}</p>}
        {r.draft_id && <p><Link className="btn" href={`/complaints/new?draft=${r.draft_id}`}>Review complaint draft</Link></p>}
        <p className="muted">This is an AI explanation, not proof that any money moved.</p>
      </>
    );
  }
  return (
    <>
      <Text t={r.answer} />
      <p className="muted">The AI never scores you. Your ATS match with each open role is computed by the published formula on the Career page.</p>
      <h3>Matched skills</h3><p>{r.matched?.join(', ') || 'none found'}</p>
      <h3>Gaps</h3><ul>{r.gaps?.map((g: any) => <li key={g.skill}><strong>{g.skill}</strong> — {g.evidence}</li>)}</ul>
      <h3>Suggested edits (based only on your confirmed facts)</h3>
      <div className="scroll"><table><thead><tr><th>Fact</th><th>Proposed</th><th>Reason</th></tr></thead>
        <tbody>{r.suggestions?.map((s: any, i: number) => <tr key={i}><td>{s.original_fact_id}</td><td>{s.proposed}</td><td>{s.reason}</td></tr>)}</tbody></table></div>
      <h3>Feedback</h3><ul>{r.feedback?.map((f: any, i: number) => <li key={i}><strong>{f.area}:</strong> {f.text}</li>)}</ul>
      <h3>Training next steps</h3><ul>{r.training?.map((t: any, i: number) => <li key={i}><strong>{t.skill}:</strong> {t.next_step}</li>)}</ul>
    </>
  );
}

/** Starts an AI run through the deterministic router, then shows its durable state. */
export function StartRun({ screen, input, label, render, children }: { screen: string; input: Record<string, unknown>; label: string; render: RunKind; children?: ReactNode }) {
  const [runId, setRunId] = useState<string | null>(null);
  const [err, setErr] = useState<ApiErr | null>(null);
  const [busy, setBusy] = useState(false);
  return (
    <>
      <ErrorBox err={err} />
      {children}
      <button disabled={busy} onClick={async () => {
        setBusy(true); setErr(null);
        try { setRunId((await api('/api/v1/runs', 'POST', { screen, input })).run_id); } catch (e) { setErr(e as ApiErr); } finally { setBusy(false); }
      }}>{label}</button>
      {runId && <RunView key={runId} runId={runId} render={render} />}
    </>
  );
}

export function Investigate({ caseId }: { caseId: string }) {
  const [issue, setIssue] = useState('');
  const r = useRouter();
  const [err, setErr] = useState<ApiErr | null>(null);
  return (
    <div>
      <label htmlFor="issue">Describe the problem (optional)</label>
      <textarea id="issue" maxLength={1000} rows={3} value={issue} onChange={(e) => setIssue(e.target.value)} />
      <div className="row" style={{ marginTop: 8 }}>
        <StartRun screen="scholarship" input={{ case_id: caseId, issue }} label="Explain this status (AI)" render="scholarship" />
        <div>
          <ErrorBox err={err} />
          <button className="secondary" onClick={async () => {
            try { const d = await api('/api/v1/complaint-drafts', 'POST', { case_id: caseId, issue }); r.push(`/complaints/new?draft=${d.draft_id}`); } catch (e) { setErr(e as ApiErr); }
          }}>Write a complaint manually</button>
        </div>
      </div>
    </div>
  );
}

export function ComplaintReview({ draft }: { draft: { id: string; subject: string; body: string; case_version: number; department: string; contact_label: string } }) {
  const [subject, setSubject] = useState(draft.subject);
  const [body, setBody] = useState(draft.body);
  const [err, setErr] = useState<ApiErr | null>(null);
  const [busy, setBusy] = useState(false);
  const key = useRef(crypto.randomUUID()); // stable across retries of this review => duplicate submits return the same receipt
  const r = useRouter();
  const submit = async (e: FormEvent) => {
    e.preventDefault(); setBusy(true); setErr(null);
    try {
      const res = await api('/api/v1/complaints', 'POST', { draft_id: draft.id, subject, body, case_version: draft.case_version }, key.current);
      r.push(`/complaints/${res.complaint_id}?receipt=1`);
    } catch (x) { setErr(x as ApiErr); setBusy(false); }
  };
  return (
    <form className="card" onSubmit={submit}>
      <ErrorBox err={err} />
      <p><strong>Recipient:</strong> {draft.department} <span className="muted">({draft.contact_label}; from the college's approved directory)</span></p>
      <p className="muted">Nothing is sent until you press Submit. Submission records a complaint in this system; no external email is sent in this pilot.</p>
      <label htmlFor="subject">Subject</label><input id="subject" value={subject} maxLength={150} required minLength={3} onChange={(e) => setSubject(e.target.value)} />
      <label htmlFor="body">Message</label><textarea id="body" rows={10} value={body} maxLength={3000} required minLength={20} onChange={(e) => setBody(e.target.value)} />
      <p><button disabled={busy}>{busy ? 'Submitting…' : 'Submit complaint'}</button></p>
    </form>
  );
}

export function EventForm({ id, version, options, staff }: { id: string; version: number; options: string[]; staff: boolean }) {
  const [err, setErr] = useState<ApiErr | null>(null);
  const r = useRouter();
  if (!options.length) return null;
  return (
    <form className="card" onSubmit={async (e) => {
      e.preventDefault();
      const f = new FormData(e.currentTarget);
      const status = String(f.get('status'));
      try {
        await api(`/api/v1/complaints/${id}/events`, 'POST', { status, note: String(f.get('note') ?? ''), expected_version: version,
          ...(status === 'verified_closed' && staff ? { verification_basis: 'source_credit_receipt' } : {}) });
        r.refresh();
      } catch (x) { setErr(x as ApiErr); }
    }}>
      <ErrorBox err={err} />
      <label htmlFor="status">{staff ? 'Update status' : 'Your response'}</label>
      <select id="status" name="status">{options.map((o) => <option key={o} value={o}>{o.replaceAll('_', ' ')}</option>)}</select>
      <label htmlFor="note">Note</label><textarea id="note" name="note" rows={3} maxLength={2000} />
      {staff && <p className="muted">"verified closed" requires a settled scholarship credit in the ledger; otherwise use "resolved" (staff-reported).</p>}
      <p><button>Save</button></p>
    </form>
  );
}

export function ResumeEditor({ initial }: { initial: { section: string; text: string }[] }) {
  const [text, setText] = useState('');
  const [items, setItems] = useState(initial);
  const [err, setErr] = useState<ApiErr | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const r = useRouter();
  const sections = ['summary', 'education', 'skill', 'project', 'experience', 'achievement'];
  const read = async (get: () => Promise<{ items: { section: string; text: string }[] }>) => {
    setErr(null); setBusy(true);
    try { setItems((await get()).items); } catch (e) { setErr(e as ApiErr); } finally { setBusy(false); }
  };
  return (
    <div className="card">
      <ErrorBox err={err} />
      <h2>1. Upload your resume</h2>
      <p className="muted">PDF, up to 5 MB. We read its text and list every fact below for you to check. The file itself is not stored.</p>
      <form onSubmit={(e) => { e.preventDefault(); const form = new FormData(e.currentTarget); read(() => upload('/api/v1/resume/preview', form)); }}>
        <label htmlFor="rf">Resume PDF</label>
        <input id="rf" name="file" type="file" accept="application/pdf,.pdf" required />
        <p><button className="secondary" disabled={busy}>{busy ? 'Reading…' : 'Read my resume'}</button></p>
      </form>
      <details>
        <summary>No PDF, or a scanned one? Paste the text instead</summary>
        <label htmlFor="rt">Resume text</label>
        <textarea id="rt" rows={6} maxLength={20000} value={text} onChange={(e) => setText(e.target.value)} />
        <p><button className="secondary" disabled={busy} onClick={() => read(() => api('/api/v1/resume/preview', 'POST', { text }))}>Preview extraction</button></p>
      </details>
      <h2>2. Check and correct each fact</h2>
      {items.map((it, i) => (
        <div className="row" key={i}>
          <div style={{ flex: '0 0 150px' }}>
            <label htmlFor={`s${i}`}>Section</label>
            <select id={`s${i}`} value={it.section} onChange={(e) => setItems(items.map((x, j) => (j === i ? { ...x, section: e.target.value } : x)))}>{sections.map((s) => <option key={s}>{s}</option>)}</select>
          </div>
          <div><label htmlFor={`t${i}`}>Fact</label><input id={`t${i}`} value={it.text} maxLength={300} onChange={(e) => setItems(items.map((x, j) => (j === i ? { ...x, text: e.target.value } : x)))} /></div>
          <button type="button" className="secondary" style={{ flex: '0 0 auto' }} aria-label={`Remove fact ${i + 1}`} onClick={() => setItems(items.filter((_, j) => j !== i))}>Remove</button>
        </div>
      ))}
      <p className="row">
        <button type="button" className="secondary" onClick={() => setItems([...items, { section: 'project', text: '' }])}>Add fact</button>
        <button type="button" onClick={async () => {
          try { const v = await api('/api/v1/resume-versions', 'POST', { items: items.filter((x) => x.text.trim()), confirm: true }); setSaved(`Saved and confirmed version ${v.version}`); r.refresh(); } catch (e) { setErr(e as ApiErr); }
        }}>I confirm these facts are true — save version</button>
      </p>
      {saved && <p role="status" className="ok">{saved}</p>}
    </div>
  );
}

/** Compare the confirmed resume with an open listing, or with any pasted job description. */
export function JdAnalysis({ resumeVersionId, jobs = [] }: { resumeVersionId: string; jobs?: { id: string; label: string }[] }) {
  const [jd, setJd] = useState('');
  const [job, setJob] = useState('');
  return (
    <>
      {jobs.length > 0 && <>
        <label htmlFor="jd-job">Pick an open role</label>
        <select id="jd-job" value={job} onChange={(e) => setJob(e.target.value)}>
          <option value="">Paste a job description instead</option>{jobs.map((j) => <option key={j.id} value={j.id}>{j.label}</option>)}
        </select>
      </>}
      {!job && <><label htmlFor="jd">Paste a job description</label>
        <textarea id="jd" rows={6} maxLength={8000} value={jd} onChange={(e) => setJd(e.target.value)} /></>}
      <div style={{ marginTop: 8 }}>
        <StartRun key={job} screen="career" input={job ? { resume_version_id: resumeVersionId, job_id: job } : { resume_version_id: resumeVersionId, jd_text: jd }} label="Analyse against my resume" render="career" />
      </div>
    </>
  );
}

export function ApplyButtons({ id, url, state }: { id: string; url: string; state: string | null }) {
  const [s, setS] = useState(state);
  const set = async (st: string) => setS((await api(`/api/v1/jobs/${id}/track`, 'POST', { state: st })).state);
  return (
    <div className="row" style={{ alignItems: 'center' }}>
      <button onClick={async () => { await set('link_opened'); window.open(url, '_blank', 'noopener,noreferrer'); }}>Open official application (external site)</button>
      <button className="secondary" onClick={() => set('reported_applied')}>I applied (self-reported)</button>
      <p className="muted" role="status" style={{ flexBasis: '100%' }}>
        {s === 'reported_applied' ? 'You reported applying. This is not confirmation from the employer.' : s === 'link_opened' ? 'You opened the official link. This does not mean an application was submitted.' : 'Not opened yet.'}
      </p>
    </div>
  );
}

export function PrefsForm({ enabled, displayName, phone }: { enabled: boolean; displayName: string; phone: string }) {
  const [err, setErr] = useState<ApiErr | null>(null);
  const [msg, setMsg] = useState('');
  return (
    <>
      <ErrorBox err={err} />
      <div className="settings-grid">
        <form className="card tone-violet" onSubmit={async (e) => {
          e.preventDefault(); setErr(null); setMsg('');
          const f = new FormData(e.currentTarget);
          try { await api('/api/v1/me/profile', 'PATCH', { display_name: f.get('dn'), phone: f.get('phone') }); setMsg('Profile saved'); } catch (x) { setErr(x as ApiErr); }
        }}>
          <h2>Profile</h2>
          <label htmlFor="dn">Display name</label><input id="dn" name="dn" defaultValue={displayName} maxLength={80} required />
          <label htmlFor="phone">Mobile number</label>
          <input id="phone" name="phone" type="tel" inputMode="tel" autoComplete="tel" defaultValue={phone} placeholder="10-digit mobile number" maxLength={16} pattern="(\+?91)?[\s-]*[6-9](?:[\s-]*\d){9}" />
          <p className="muted">The college office uses this number to find you and send you notices.</p>
          <p><button>Save profile</button></p>
        </form>
        <form className="card tone-teal" onSubmit={async (e) => {
          e.preventDefault(); setErr(null); setMsg('');
          const f = new FormData(e.currentTarget);
          try { await api('/api/v1/notification-preferences', 'PATCH', { reminders_enabled: f.get('rem') === 'on' }); setMsg('Preferences saved'); } catch (x) { setErr(x as ApiErr); }
        }}>
          <h2>Reminders</h2>
          <label className="check"><input type="checkbox" name="rem" defaultChecked={enabled} /> Fee and document reminders</label>
          <p className="muted">Notices from the administration office and placement cell always reach you.</p>
          <p><button>Save preferences</button></p>
        </form>
      </div>
      {msg && <p role="status" className="ok">{msg}</p>}
    </>
  );
}

// ---- Administration office

const TEMPLATES: [string, string][] = [
  ['Document verification pending', 'Your scholarship document verification is pending. Please submit the required documents at the administration office.'],
  ['Fee payment reminder', 'Your fee payment is due. Please clear the outstanding amount before the due date.'],
  ['Scholarship update', 'There is an update on your scholarship. Open Fees & Scholarships for details.'],
  ['Visit the administration office', 'Please visit the administration office at the earliest.'],
];

export function NoticeForm({ studentId, name }: { studentId: string; name: string }) {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [err, setErr] = useState<ApiErr | null>(null);
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const r = useRouter();
  return (
    <form onSubmit={async (e) => {
      e.preventDefault(); setBusy(true); setErr(null); setMsg('');
      try { await api('/api/v1/notices', 'POST', { student_id: studentId, title, body }); setMsg(`Sent. It pops up on ${name}'s screen now.`); setTitle(''); setBody(''); r.refresh(); }
      catch (x) { setErr(x as ApiErr); } finally { setBusy(false); }
    }}>
      <ErrorBox err={err} />
      <div className="chips" role="group" aria-label="Quick templates">
        {TEMPLATES.map(([t, b]) => <button key={t} type="button" className={`chip${title === t ? ' on' : ''}`} onClick={() => { setTitle(t); setBody(b); }}>{t}</button>)}
      </div>
      <label htmlFor="ntitle">Title</label><input id="ntitle" value={title} onChange={(e) => setTitle(e.target.value)} required minLength={3} maxLength={120} />
      <label htmlFor="nbody">Message</label><textarea id="nbody" rows={3} value={body} onChange={(e) => setBody(e.target.value)} maxLength={1000} />
      <p><button disabled={busy}>{busy ? 'Sending…' : 'Send notice'}</button></p>
      {msg && <p role="status" className="ok">{msg}</p>}
    </form>
  );
}

const DOC_LABEL: Record<string, string> = { missing: 'Missing', submitted: 'Submitted — verify', accepted: 'Verified', rejected: 'Rejected' };

/** Change a document's verification state (student is notified), or remind the student about a missing/rejected one. */
export function DocState({ studentId, reqId, state, compact }: { studentId: string; reqId: string; state: string; compact?: boolean }) {
  const [s, setS] = useState(state);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState<ApiErr | null>(null);
  const r = useRouter();
  const save = async (v: string) => {
    setErr(null); setMsg('');
    try { await api('/api/v1/admin/documents', 'PATCH', { student_id: studentId, requirement_id: reqId, state: v }); setS(v); setMsg(v === 'submitted' ? 'Saved' : 'Saved · student notified'); r.refresh(); }
    catch (x) { setErr(x as ApiErr); }
  };
  const remind = s === 'rejected' ? 'rejected' : 'missing';
  return (
    <div className="doc-state">
      {!compact && (
        <select aria-label="Verification state" value={DOC_LABEL[s] ? s : 'missing'} onChange={(e) => save(e.target.value)}>
          {Object.entries(DOC_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
      )}
      {s === 'submitted' && compact
        ? <><button type="button" className="small" onClick={() => save('accepted')}>Verify</button><button type="button" className="small secondary" onClick={() => save('rejected')}>Reject</button></>
        : s !== 'accepted' && s !== 'submitted' && <button type="button" className="small secondary" onClick={() => save(remind)}>Remind</button>}
      {msg && <span role="status" className="ok small-note">{msg}</span>}
      {err && <span role="alert" className="bad small-note">{err.message}</span>}
    </div>
  );
}

export function CaseStatusForm({ caseId, status, options }: { caseId: string; status: string; options: readonly string[] }) {
  const [err, setErr] = useState<ApiErr | null>(null);
  const [msg, setMsg] = useState('');
  const r = useRouter();
  return (
    <form className="row" onSubmit={async (e) => {
      e.preventDefault(); setErr(null); setMsg('');
      const f = new FormData(e.currentTarget);
      try { await api(`/api/v1/admin/cases/${caseId}`, 'PATCH', { status: f.get('status'), note: f.get('note') }); setMsg('Updated · student notified'); r.refresh(); }
      catch (x) { setErr(x as ApiErr); }
    }}>
      <ErrorBox err={err} />
      <div><label htmlFor={`cs-${caseId}`}>Scholarship status</label>
        <select id={`cs-${caseId}`} name="status" defaultValue={options.includes(status) ? status : options[0]}>{options.map((o) => <option key={o} value={o}>{o.replaceAll('_', ' ')}</option>)}</select></div>
      <div><label htmlFor={`cn-${caseId}`}>Note to student (optional)</label><input id={`cn-${caseId}`} name="note" maxLength={1000} /></div>
      <button style={{ flex: '0 0 auto' }}>Update</button>
      {msg && <p role="status" className="ok" style={{ flexBasis: '100%' }}>{msg}</p>}
    </form>
  );
}

// ---- Placement cell

export function JobPostForm({ branches }: { branches: string[] }) {
  const [err, setErr] = useState<ApiErr | null>(null);
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const r = useRouter();
  const sel = (name: string, label: string, opts: [string, string][]) => (
    <div><label htmlFor={`j-${name}`}>{label}</label><select id={`j-${name}`} name={name}>{opts.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></div>
  );
  return (
    <details className="card post-drive">
      <summary><span className="plus" aria-hidden="true">+</span> Post a new drive</summary>
      <form onSubmit={async (e) => {
        e.preventDefault(); setBusy(true); setErr(null); setMsg('');
        const form = e.currentTarget;
        const fd = new FormData(form);
        const picked = fd.getAll('branches').map(String);
        fd.delete('branches');
        const f = Object.fromEntries(fd) as Record<string, string>;
        try {
          await api('/api/v1/placement/jobs', 'POST', { ...f, salary_text: f.salary_text || undefined, notify_students: f.notify_students === 'on', branches: picked.length ? picked : undefined });
          form.reset(); setMsg('Drive posted.'); r.refresh();
        } catch (x) { setErr(x as ApiErr); } finally { setBusy(false); }
      }}>
        <ErrorBox err={err} />
        <div className="row">
          <div><label htmlFor="j-company">Company</label><input id="j-company" name="company" required minLength={2} maxLength={120} /></div>
          <div><label htmlFor="j-role">Role</label><input id="j-role" name="role" required minLength={2} maxLength={120} /></div>
        </div>
        <div className="row">
          {sel('category', 'Category', [['it', 'IT'], ['non_it', 'Non-IT']])}
          {sel('campus_type', 'Drive type', [['campus', 'On campus'], ['off_campus', 'Off campus']])}
          {sel('level', 'Level', [['fresher', 'Fresher'], ['internship', 'Internship']])}
        </div>
        <div className="row">
          <div><label htmlFor="j-location">Location</label><input id="j-location" name="location" required minLength={2} maxLength={120} /></div>
          <div><label htmlFor="j-salary">Salary (optional)</label><input id="j-salary" name="salary_text" maxLength={120} placeholder="e.g. INR 6 LPA" /></div>
          <div><label htmlFor="j-deadline">Apply by</label><input id="j-deadline" name="deadline" type="date" required /></div>
        </div>
        <label htmlFor="j-eligibility">Eligibility (shown to students)</label><input id="j-eligibility" name="eligibility" required minLength={2} maxLength={500} placeholder="e.g. B.Tech 2026, CGPA 7+, no active backlogs" />
        <fieldset className="rules">
          <legend>Eligibility rules (enforced: ineligible students cannot apply and are not counted or reminded)</legend>
          <div className="row">
            <div><label htmlFor="j-cgpa">Minimum CGPA</label><input id="j-cgpa" name="min_cgpa" type="number" min={0} max={10} step={0.1} placeholder="none" /></div>
            <div><label htmlFor="j-bl">Max active backlogs</label><input id="j-bl" name="max_backlogs" type="number" min={0} max={20} placeholder="any" /></div>
          </div>
          <div className="chips" role="group" aria-label="Branches (none ticked = all)">{branches.map((b) => <label key={b} className="chip check-chip"><input type="checkbox" name="branches" value={b} /> {b}</label>)}</div>
        </fieldset>
        <label htmlFor="j-apply">Official application link</label><input id="j-apply" name="apply_url" type="url" required pattern="https://.+" placeholder="https://" />
        <label htmlFor="j-jd">Job description</label><textarea id="j-jd" name="jd" rows={5} required minLength={20} maxLength={8000} />
        <label className="check"><input type="checkbox" name="notify_students" defaultChecked /> Notify all students now</label>
        <p><button disabled={busy}>{busy ? 'Posting…' : 'Post drive'}</button></p>
        {msg && <p role="status" className="ok">{msg}</p>}
      </form>
    </details>
  );
}

export function JobStatusToggle({ id, status }: { id: string; status: string }) {
  const [err, setErr] = useState<ApiErr | null>(null);
  const r = useRouter();
  const next = status === 'published' ? 'withdrawn' : 'published';
  return (
    <>
      <ErrorBox err={err} />
      <button type="button" className="secondary" onClick={async () => {
        try { await api(`/api/v1/placement/jobs/${id}`, 'PATCH', { status: next }); r.refresh(); } catch (x) { setErr(x as ApiErr); }
      }}>{next === 'withdrawn' ? 'Close this drive' : 'Re-open this drive'}</button>
    </>
  );
}

export function NudgeButton({ id, group, count, label }: { id: string; group: 'opened' | 'none'; count: number; label: string }) {
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState<ApiErr | null>(null);
  const r = useRouter();
  return (
    <div className="nudge">
      <button type="button" disabled={!count} onClick={async () => {
        setErr(null);
        try { const { sent } = await api(`/api/v1/placement/jobs/${id}/nudge`, 'POST', { group }); setMsg(sent ? `Reminded ${sent} student${sent === 1 ? '' : 's'}` : 'Already reminded today'); r.refresh(); }
        catch (x) { setErr(x as ApiErr); }
      }}>{label} ({count})</button>
      {msg && <span role="status" className="ok small-note">{msg}</span>}
      {err && <span role="alert" className="bad small-note">{err.message}</span>}
    </div>
  );
}

// ---- Shared

export function PrintButton() {
  return <button type="button" className="secondary no-print" onClick={() => window.print()}>Print / save as PDF</button>;
}

/** Small "do it, show result, refresh" helper for one-shot forms. */
function useAction() {
  const [err, setErr] = useState<ApiErr | null>(null);
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const r = useRouter();
  const run = async (fn: () => Promise<string | void>) => {
    setBusy(true); setErr(null); setMsg('');
    try { const m = await fn(); if (m) setMsg(m); r.refresh(); return true; } catch (x) { setErr(x as ApiErr); return false; } finally { setBusy(false); }
  };
  return { err, msg, busy, run };
}
const Msg = ({ msg }: { msg: string }) => (msg ? <p role="status" className="ok">{msg}</p> : null);

export function PasswordForm({ student }: { student: boolean }) {
  const { err, msg, busy, run } = useAction();
  const [mismatch, setMismatch] = useState(false);
  return (
    <form className="card tone-rose" onSubmit={(e) => {
      e.preventDefault();
      const form = e.currentTarget, f = new FormData(form);
      setMismatch(f.get('next') !== f.get('again'));
      if (f.get('next') !== f.get('again')) return;
      run(async () => { await api('/api/v1/me/password', 'POST', { current: f.get('current'), next: f.get('next') }); form.reset(); return 'Password changed. Use it next time you sign in.'; });
    }}>
      <h2>Change password</h2>
      <ErrorBox err={err} />
      <label htmlFor="pw-cur">{student ? 'Current password (your roll number if never changed)' : 'Current password'}</label>
      <input id="pw-cur" name="current" type="password" autoComplete="current-password" required />
      <label htmlFor="pw-new">New password</label><input id="pw-new" name="next" type="password" autoComplete="new-password" minLength={8} required />
      <label htmlFor="pw-again">Repeat new password</label><input id="pw-again" name="again" type="password" autoComplete="new-password" minLength={8} required />
      {mismatch && <p role="alert" className="bad small-note">The new passwords do not match.</p>}
      <p><button disabled={busy}>Change password</button></p>
      <Msg msg={msg} />
    </form>
  );
}

// ---- Student

const REQUEST_LABEL: Record<string, string> = { bonafide: 'Bonafide certificate', study: 'Study certificate', conduct: 'Conduct certificate', transfer: 'Transfer certificate (TC)', other_certificate: 'Other certificate', leave: 'Leave' };

export function RequestForm() {
  const [kind, setKind] = useState('bonafide');
  const { err, msg, busy, run } = useAction();
  return (
    <form onSubmit={(e) => {
      e.preventDefault();
      const form = e.currentTarget, f = new FormData(form);
      run(async () => {
        await api('/api/v1/requests', 'POST', { kind, reason: f.get('reason'), ...(kind === 'leave' ? { from_date: f.get('from'), to_date: f.get('to') } : {}) });
        form.reset(); return 'Request sent to the administration office. You will get a notification when it is decided.';
      });
    }}>
      <ErrorBox err={err} />
      <div className="chips" role="radiogroup" aria-label="What do you need?">
        {Object.entries(REQUEST_LABEL).map(([k, l]) => <button key={k} type="button" role="radio" aria-checked={kind === k} className={`chip${kind === k ? ' on' : ''}`} onClick={() => setKind(k)}>{l}</button>)}
      </div>
      {kind === 'leave' && <div className="row">
        <div><label htmlFor="rq-from">From</label><input id="rq-from" name="from" type="date" required /></div>
        <div><label htmlFor="rq-to">To</label><input id="rq-to" name="to" type="date" required /></div>
      </div>}
      <label htmlFor="rq-reason">{kind === 'leave' ? 'Reason for leave' : 'Purpose (e.g. bank loan, passport, internship)'}</label>
      <textarea id="rq-reason" name="reason" rows={3} minLength={5} maxLength={1000} required />
      <p><button disabled={busy}>{busy ? 'Sending…' : 'Send request'}</button></p>
      <Msg msg={msg} />
    </form>
  );
}

export function DocUpload({ reqId, label }: { reqId: string; label: string }) {
  const { err, msg, busy, run } = useAction();
  return (
    <form className="upload" onSubmit={(e) => {
      e.preventDefault();
      const form = e.currentTarget, f = new FormData(form);
      f.set('requirement_id', reqId);
      run(async () => { await upload('/api/v1/uploads', f); form.reset(); return 'Uploaded. The office will verify it.'; });
    }}>
      <label className="sr-only" htmlFor={`up-${reqId}`}>Upload {label}</label>
      <input id={`up-${reqId}`} name="file" type="file" accept="application/pdf,image/jpeg,image/png" required />
      <button className="small" disabled={busy}>{busy ? 'Uploading…' : 'Upload'}</button>
      {msg && <span role="status" className="ok small-note">{msg}</span>}
      {err && <span role="alert" className="bad small-note">{err.message}</span>}
    </form>
  );
}

// ---- Faculty

type Pupil = { id: string; display_name: string; roll_no: string | null };

export function AttendanceSheet({ assignmentId, date, period, roster, present, marked }: { assignmentId: string; date: string; period: number; roster: Pupil[]; present: string[]; marked: boolean }) {
  const [on, setOn] = useState<Set<string>>(() => new Set(marked ? present : roster.map((s) => s.id)));
  const { err, msg, busy, run } = useAction();
  const flip = (id: string) => setOn((x) => { const n = new Set(x); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  return (
    <div>
      <ErrorBox err={err} />
      <div className="row actions-row">
        <span className="pill-count"><strong>{on.size}</strong> present · <strong>{roster.length - on.size}</strong> absent</span>
        <button type="button" className="small secondary" onClick={() => setOn(new Set(roster.map((s) => s.id)))}>All present</button>
        <button type="button" className="small secondary" onClick={() => setOn(new Set())}>All absent</button>
      </div>
      <ul className="roster">{roster.map((s) => (
        <li key={s.id}>
          <label className={`mark ${on.has(s.id) ? 'present' : 'absent'}`}>
            <input type="checkbox" checked={on.has(s.id)} onChange={() => flip(s.id)} />
            <span className="roll">{s.roll_no ?? '—'}</span><span>{s.display_name}</span>
            <span className="state">{on.has(s.id) ? 'Present' : 'Absent'}</span>
          </label>
        </li>
      ))}</ul>
      <p><button disabled={busy || !roster.length} onClick={() => run(async () => {
        const r = await api('/api/v1/faculty/attendance', 'POST', { assignment_id: assignmentId, date, period, present: [...on] });
        return `Saved: ${r.present} of ${r.total} present.`;
      })}>{marked ? 'Update attendance' : 'Save attendance'}</button></p>
      <Msg msg={msg} />
    </div>
  );
}

export function NewAssessment({ assignmentId }: { assignmentId: string }) {
  const { err, busy, run } = useAction();
  return (
    <form className="row" onSubmit={(e) => {
      e.preventDefault();
      const form = e.currentTarget, f = new FormData(form);
      run(async () => { await api('/api/v1/faculty/assessments', 'POST', { assignment_id: assignmentId, name: f.get('name'), max_marks: Number(f.get('max')) }); form.reset(); });
    }}>
      <ErrorBox err={err} />
      <div><label htmlFor="as-name">New assessment</label><input id="as-name" name="name" placeholder="e.g. Mid-term 2" required minLength={2} maxLength={60} /></div>
      <div style={{ flex: '0 0 130px' }}><label htmlFor="as-max">Max marks</label><input id="as-max" name="max" type="number" min={1} max={1000} defaultValue={30} required /></div>
      <button style={{ flex: '0 0 auto' }} disabled={busy}>Add</button>
    </form>
  );
}

export function MarksGrid({ assessment, roster }: { assessment: { id: string; name: string; max_marks: number; published: boolean; marks: Record<string, number | null> }; roster: Pupil[] }) {
  const [vals, setVals] = useState<Record<string, string>>(() => Object.fromEntries(roster.map((s) => [s.id, assessment.marks[s.id] == null ? '' : String(assessment.marks[s.id])])));
  const { err, msg, busy, run } = useAction();
  const save = (published?: boolean) => run(async () => {
    const marks = roster.map((s) => ({ student_id: s.id, marks: vals[s.id] === '' ? null : Number(vals[s.id]) }));
    await api(`/api/v1/faculty/assessments/${assessment.id}`, 'PATCH', { marks, ...(published === undefined ? {} : { published }) });
    return published ? 'Saved and published. Students were notified.' : published === false ? 'Hidden from students.' : 'Marks saved.';
  });
  const filled = roster.filter((s) => vals[s.id] !== '').length;
  return (
    <section className="card marks-card">
      <div className="card-head"><h3>{assessment.name} <span className="muted small">out of {assessment.max_marks}</span></h3>
        <span className={`badge ${assessment.published ? 'ok' : 'neutral'}`}>{assessment.published ? 'Published' : 'Draft'}</span></div>
      <ErrorBox err={err} />
      <div className="scroll"><table>
        <thead><tr><th>Roll</th><th>Student</th><th className="num">Marks (blank = absent)</th></tr></thead>
        <tbody>{roster.map((s) => (
          <tr key={s.id}><td>{s.roll_no}</td><td>{s.display_name}</td>
            <td className="num"><input aria-label={`Marks for ${s.display_name}`} className="mark-input" type="number" min={0} max={assessment.max_marks} step={0.5}
              value={vals[s.id]} onChange={(e) => setVals({ ...vals, [s.id]: e.target.value })} /></td></tr>
        ))}</tbody>
      </table></div>
      <div className="row actions-row">
        <span className="muted small">{filled} of {roster.length} entered</span>
        <button type="button" className="secondary" disabled={busy} onClick={() => save()}>Save</button>
        {assessment.published
          ? <button type="button" className="secondary" disabled={busy} onClick={() => save(false)}>Unpublish</button>
          : <button type="button" disabled={busy} onClick={() => save(true)}>Save &amp; publish to students</button>}
      </div>
      <Msg msg={msg} />
    </section>
  );
}

export function NoteUpload({ assignmentId }: { assignmentId: string }) {
  const [kind, setKind] = useState('material');
  const [mode, setMode] = useState<'text' | 'file'>('text');
  const { err, msg, busy, run } = useAction();
  return (
    <form onSubmit={(e) => {
      e.preventDefault();
      const form = e.currentTarget, f = new FormData(form);
      f.set('assignment_id', assignmentId); f.set('kind', kind);
      if (mode === 'text') f.delete('file'); else f.delete('text');
      run(async () => { await upload('/api/v1/faculty/notes', f); form.reset(); return 'Published. Students in this class were notified.'; });
    }}>
      <ErrorBox err={err} />
      <div className="chips">
        <button type="button" className={`chip${kind === 'material' ? ' on' : ''}`} onClick={() => setKind('material')}>Notes</button>
        <button type="button" className={`chip${kind === 'paper' ? ' on' : ''}`} onClick={() => setKind('paper')}>Question paper</button>
        <span className="chip-sep" />
        <button type="button" className={`chip${mode === 'text' ? ' on' : ''}`} onClick={() => setMode('text')}>Paste text</button>
        <button type="button" className={`chip${mode === 'file' ? ' on' : ''}`} onClick={() => setMode('file')}>Upload file</button>
      </div>
      <div className="row">
        <div><label htmlFor="n-title">Title</label><input id="n-title" name="title" required minLength={3} maxLength={150} /></div>
        {kind === 'paper' && <div style={{ flex: '0 0 140px' }}><label htmlFor="n-year">Exam year</label><input id="n-year" name="exam_year" type="number" min={2000} max={2100} /></div>}
      </div>
      {mode === 'text'
        ? <><label htmlFor="n-text">Content</label><textarea id="n-text" name="text" rows={8} required placeholder="Paste notes. Separate sections with a blank line; the first line of each section becomes its heading." /></>
        : <><label htmlFor="n-file">File (.txt or PDF, up to 5 MB)</label><input id="n-file" name="file" type="file" accept=".txt,text/plain,application/pdf" required />
          <p className="muted small">Text notes can be searched and cited by the AI tutor. PDFs can be downloaded only.</p></>}
      <p><button disabled={busy}>{busy ? 'Publishing…' : 'Publish to class'}</button></p>
      <Msg msg={msg} />
    </form>
  );
}

// ---- Administration office

export function AddStudent({ branches }: { branches: string[] }) {
  const { err, msg, busy, run } = useAction();
  return (
    <form onSubmit={(e) => {
      e.preventDefault();
      const form = e.currentTarget, f = Object.fromEntries(new FormData(form));
      run(async () => { await api('/api/v1/admin/students', 'POST', { rows: [f] }); form.reset(); return `Added. ${f.display_name} signs in with ${f.email} and roll number ${String(f.roll_no).toUpperCase()}.`; });
    }}>
      <ErrorBox err={err} />
      <div className="row">
        <div><label htmlFor="s-name">Full name</label><input id="s-name" name="display_name" required maxLength={80} /></div>
        <div><label htmlFor="s-roll">Roll number</label><input id="s-roll" name="roll_no" required pattern="[A-Za-z0-9-]{3,20}" /></div>
      </div>
      <div className="row">
        <div><label htmlFor="s-email">College email</label><input id="s-email" name="email" type="email" required /></div>
        <div><label htmlFor="s-phone">Mobile (optional)</label><input id="s-phone" name="phone" type="tel" /></div>
      </div>
      <div className="row">
        <div><label htmlFor="s-branch">Branch</label><select id="s-branch" name="branch" required>{branches.map((b) => <option key={b}>{b}</option>)}</select></div>
        <div><label htmlFor="s-sem">Semester</label><select id="s-sem" name="semester">{[1, 2, 3, 4, 5, 6, 7, 8].map((n) => <option key={n}>{n}</option>)}</select></div>
        <div><label htmlFor="s-sec">Section</label><input id="s-sec" name="section" defaultValue="A" maxLength={1} pattern="[A-Za-z]" required /></div>
      </div>
      <p><button disabled={busy}>Add student</button></p>
      <Msg msg={msg} />
    </form>
  );
}

/** Minimal CSV reader: commas, quoted cells, doubled quotes. Header names map to fields. */
function parseCsv(text: string) {
  const rows: string[][] = [];
  let cell = '', row: string[] = [], q = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (q) { if (ch === '"' && text[i + 1] === '"') { cell += '"'; i++; } else if (ch === '"') q = false; else cell += ch; }
    else if (ch === '"') q = true;
    else if (ch === ',') { row.push(cell); cell = ''; }
    else if (ch === '\n' || ch === '\r') { if (ch === '\r' && text[i + 1] === '\n') i++; row.push(cell); rows.push(row); row = []; cell = ''; }
    else cell += ch;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  const clean = rows.filter((r) => r.some((c) => c.trim()));
  const head = (clean.shift() ?? []).map((h) => h.replace(/^﻿/, '').trim().toLowerCase().replace(/[^a-z]+/g, '_').replace(/^_|_$/g, ''));
  const alias: Record<string, string> = { name: 'display_name', full_name: 'display_name', student_name: 'display_name', roll: 'roll_no', roll_number: 'roll_no', mobile: 'phone', email_id: 'email', college_email: 'email', sem: 'semester' };
  return clean.map((r) => Object.fromEntries(head.map((h, i) => [alias[h] ?? h, (r[i] ?? '').trim()]).filter(([k, v]) => ['display_name', 'email', 'roll_no', 'phone', 'branch', 'semester', 'section'].includes(k) && v !== '')));
}

export function BulkImport() {
  const [rows, setRows] = useState<Record<string, string>[]>([]);
  const { err, msg, busy, run } = useAction();
  return (
    <div>
      <ErrorBox err={err} />
      <p className="muted small">Columns: <code>name, email, roll_no, phone, branch, semester, section</code>. Save from Excel as CSV. Up to 500 rows; nothing is saved if any row has a problem.</p>
      <div className="row">
        <div><label htmlFor="csv">Spreadsheet (.csv)</label><input id="csv" type="file" accept=".csv,text/csv" onChange={async (e) => { const f = e.target.files?.[0]; setRows(f ? parseCsv(await f.text()) : []); }} /></div>
        <button style={{ flex: '0 0 auto' }} disabled={busy || !rows.length} onClick={() => run(async () => {
          const r = await api('/api/v1/admin/students', 'POST', { rows }); setRows([]); return `Added ${r.added} students. Each signs in with their college email and roll number.`;
        })}>{rows.length ? `Import ${rows.length} students` : 'Import'}</button>
      </div>
      {rows.length > 0 && <p className="muted small">Preview: {rows.slice(0, 3).map((r) => `${r.display_name ?? '?'} (${r.roll_no ?? '?'})`).join(', ')}{rows.length > 3 ? ` and ${rows.length - 3} more` : ''}</p>}
      <Msg msg={msg} />
    </div>
  );
}

export function StudentEdit({ id, semester, section, cgpa, phone }: { id: string; semester: number; section: string; cgpa: number | null; phone: string }) {
  const { err, msg, busy, run } = useAction();
  return (
    <form className="row" onSubmit={(e) => {
      e.preventDefault();
      const f = new FormData(e.currentTarget);
      run(async () => {
        await api(`/api/v1/admin/students/${id}`, 'PATCH', { current_semester: Number(f.get('sem')), section: f.get('sec'), cgpa: f.get('cgpa') === '' ? null : Number(f.get('cgpa')), phone: f.get('phone') });
        return 'Saved';
      });
    }}>
      <ErrorBox err={err} />
      <div><label htmlFor="e-sem">Semester</label><select id="e-sem" name="sem" defaultValue={semester}>{[1, 2, 3, 4, 5, 6, 7, 8].map((n) => <option key={n}>{n}</option>)}</select></div>
      <div><label htmlFor="e-sec">Section</label><input id="e-sec" name="sec" defaultValue={section} maxLength={1} pattern="[A-Za-z]" required /></div>
      <div><label htmlFor="e-cgpa">CGPA</label><input id="e-cgpa" name="cgpa" type="number" min={0} max={10} step={0.01} defaultValue={cgpa ?? ''} /></div>
      <div><label htmlFor="e-phone">Mobile</label><input id="e-phone" name="phone" type="tel" defaultValue={phone} /></div>
      <button style={{ flex: '0 0 auto' }} disabled={busy}>Save</button>
      {msg && <span role="status" className="ok small-note">{msg}</span>}
    </form>
  );
}

const thisYear = () => { const d = new Date(), y = d.getMonth() >= 5 ? d.getFullYear() : d.getFullYear() - 1; return `${y}-${String((y + 1) % 100).padStart(2, '0')}`; };

export function FeeForm({ targets }: { targets: [string, string][] }) {
  const { err, msg, busy, run } = useAction();
  return (
    <form onSubmit={(e) => {
      e.preventDefault();
      const form = e.currentTarget, f = Object.fromEntries(new FormData(form));
      run(async () => { const r = await api('/api/v1/admin/fees', 'POST', f); return `Fee added for ${r.count} student${r.count === 1 ? '' : 's'}. They were notified.`; });
    }}>
      <ErrorBox err={err} />
      {targets.length > 1
        ? <><label htmlFor="f-target">For</label><select id="f-target" name="target">{targets.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></>
        : <input type="hidden" name="target" value={targets[0]?.[0]} />}
      <div className="row">
        <div><label htmlFor="f-year">Academic year</label><input id="f-year" name="academic_year" defaultValue={thisYear()} pattern="\d{4}-\d{2}" required /></div>
        <div><label htmlFor="f-cat">Category</label><select id="f-cat" name="category">{['tuition', 'transport', 'hostel', 'exam', 'other'].map((c) => <option key={c}>{c}</option>)}</select></div>
      </div>
      <div className="row">
        <div><label htmlFor="f-amt">Amount (INR)</label><input id="f-amt" name="amount" inputMode="decimal" placeholder="e.g. 120000" required /></div>
        <div><label htmlFor="f-due">Due date</label><input id="f-due" name="due" type="date" required /></div>
      </div>
      <p><button disabled={busy}>Add fee</button></p>
      <Msg msg={msg} />
    </form>
  );
}

export function FeeEdit({ id, amount, due }: { id: string; amount: number; due: string }) {
  const [open, setOpen] = useState(false);
  const { err, busy, run } = useAction();
  if (!open) return <button type="button" className="text-btn" onClick={() => setOpen(true)}>Edit</button>;
  return (
    <form className="inline-edit" onSubmit={(e) => {
      e.preventDefault();
      const f = new FormData(e.currentTarget);
      run(async () => { await api(`/api/v1/admin/fees/${id}`, 'PATCH', { amount: f.get('amount'), due: f.get('due') }); setOpen(false); });
    }}>
      <input aria-label="Amount (INR)" name="amount" defaultValue={String(amount / 100)} inputMode="decimal" required />
      <input aria-label="Due date" name="due" type="date" defaultValue={due} required />
      <button className="small" disabled={busy}>Save</button>
      <button type="button" className="small secondary" onClick={() => setOpen(false)}>Cancel</button>
      {err && <span role="alert" className="bad small-note">{err.message}</span>}
    </form>
  );
}

export function PaymentForm({ studentId, owed }: { studentId: string; owed: number }) {
  const [mode, setMode] = useState('upi');
  const { err, busy, run } = useAction();
  const [done, setDone] = useState<{ id: string; receipt: string } | null>(null);
  return (
    <form onSubmit={(e) => {
      e.preventDefault();
      const form = e.currentTarget, f = new FormData(form);
      run(async () => { const r = await api('/api/v1/admin/payments', 'POST', { student_id: studentId, amount: f.get('amount'), mode, reference: f.get('reference') ?? '' }); setDone({ id: r.payment_id, receipt: r.receipt }); form.reset(); });
    }}>
      <ErrorBox err={err} />
      <div className="chips">{[['upi', 'UPI'], ['cash', 'Cash'], ['card', 'Card'], ['bank_transfer', 'Bank transfer'], ['cheque', 'Cheque'], ['dd', 'DD']].map(([v, l]) =>
        <button key={v} type="button" className={`chip${mode === v ? ' on' : ''}`} onClick={() => setMode(v)}>{l}</button>)}</div>
      <div className="row">
        <div><label htmlFor="p-amt">Amount (INR)</label><input id="p-amt" name="amount" inputMode="decimal" placeholder={`up to ${(owed / 100).toLocaleString('en-IN')}`} required /></div>
        {mode !== 'cash' && <div><label htmlFor="p-ref">{mode === 'cheque' || mode === 'dd' ? 'Cheque / DD number' : 'Transaction ID'}</label><input id="p-ref" name="reference" maxLength={60} required /></div>}
      </div>
      <p><button disabled={busy || owed <= 0}>{owed <= 0 ? 'Nothing outstanding' : 'Record payment'}</button></p>
      {done && <p role="status" className="ok">Recorded. Receipt <strong>{done.receipt}</strong> · <Link href={`/receipts/${done.id}`}>open receipt</Link></p>}
    </form>
  );
}

export function CreditForm({ caseId, room }: { caseId: string; room: number }) {
  const { err, msg, busy, run } = useAction();
  return (
    <form className="row" onSubmit={(e) => {
      e.preventDefault();
      const form = e.currentTarget, f = new FormData(form);
      run(async () => { const r = await api(`/api/v1/admin/cases/${caseId}/credit`, 'POST', { amount: f.get('amount'), reference: f.get('reference') }); form.reset(); return `Credited (${r.reference}). Status: ${r.status}.`; });
    }}>
      <ErrorBox err={err} />
      <div><label htmlFor={`cr-a-${caseId}`}>Amount received (INR)</label><input id={`cr-a-${caseId}`} name="amount" inputMode="decimal" placeholder={`up to ${(room / 100).toLocaleString('en-IN')}`} required /></div>
      <div><label htmlFor={`cr-r-${caseId}`}>Sanction / bank reference</label><input id={`cr-r-${caseId}`} name="reference" required minLength={2} maxLength={60} /></div>
      <button style={{ flex: '0 0 auto' }} disabled={busy}>Record credit</button>
      {msg && <p role="status" className="ok" style={{ flexBasis: '100%' }}>{msg}</p>}
    </form>
  );
}

export function BroadcastForm({ targets }: { targets: [string, string][] }) {
  const { err, msg, busy, run } = useAction();
  return (
    <form onSubmit={(e) => {
      e.preventDefault();
      const form = e.currentTarget, f = Object.fromEntries(new FormData(form));
      run(async () => { const r = await api('/api/v1/admin/broadcast', 'POST', f); form.reset(); return `Sent to ${r.sent} student${r.sent === 1 ? '' : 's'}. It pops up on their screens now.`; });
    }}>
      <ErrorBox err={err} />
      <label htmlFor="b-target">Send to</label><select id="b-target" name="target">{targets.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
      <label htmlFor="b-title">Title</label><input id="b-title" name="title" required minLength={3} maxLength={120} placeholder="e.g. College closed on Friday" />
      <label htmlFor="b-body">Message</label><textarea id="b-body" name="body" rows={4} maxLength={1000} />
      <p><button disabled={busy}>{busy ? 'Sending…' : 'Send notice'}</button></p>
      <Msg msg={msg} />
    </form>
  );
}

export function RequestDecision({ id, status, kind }: { id: string; status: string; kind: string }) {
  const [note, setNote] = useState('');
  const { err, busy, run } = useAction();
  const act = (s: string) => run(async () => { await api(`/api/v1/admin/requests/${id}`, 'PATCH', { status: s, note }); });
  if (status === 'rejected' || status === 'ready' || (status === 'approved' && kind === 'leave')) return null;
  return (
    <div className="decide">
      {status === 'pending' && <input aria-label="Note to student (optional)" placeholder="Note to student (optional)" value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} />}
      {status === 'pending' && <><button className="small" disabled={busy} onClick={() => act('approved')}>Approve</button><button className="small secondary" disabled={busy} onClick={() => act('rejected')}>Reject</button></>}
      {status === 'approved' && <button className="small" disabled={busy} onClick={() => act('ready')}>Mark ready for collection</button>}
      {err && <span role="alert" className="bad small-note">{err.message}</span>}
    </div>
  );
}

export function AssignForm({ faculty, subjects }: { faculty: { id: string; display_name: string }[]; subjects: { id: string; branch: string; semester: number; code: string; name: string }[] }) {
  const { err, msg, busy, run } = useAction();
  return (
    <form className="row" onSubmit={(e) => {
      e.preventDefault();
      const f = Object.fromEntries(new FormData(e.currentTarget));
      run(async () => { await api('/api/v1/admin/assignments', 'POST', f); return 'Teacher assigned.'; });
    }}>
      <ErrorBox err={err} />
      <div><label htmlFor="a-sub">Subject</label><select id="a-sub" name="curriculum_subject_id">{subjects.map((s) => <option key={s.id} value={s.id}>{s.branch} sem {s.semester} · {s.code} {s.name}</option>)}</select></div>
      <div style={{ flex: '0 0 90px' }}><label htmlFor="a-sec">Section</label><input id="a-sec" name="section" defaultValue="A" maxLength={1} pattern="[A-Za-z]" required /></div>
      <div><label htmlFor="a-fac">Teacher</label><select id="a-fac" name="faculty_user_id">{faculty.map((f) => <option key={f.id} value={f.id}>{f.display_name}</option>)}</select></div>
      <button style={{ flex: '0 0 auto' }} disabled={busy || !faculty.length}>Assign</button>
      {msg && <p role="status" className="ok" style={{ flexBasis: '100%' }}>{msg}</p>}
    </form>
  );
}

export function SlotForm({ classes }: { classes: { id: string; label: string }[] }) {
  const { err, msg, busy, run } = useAction();
  return (
    <form onSubmit={(e) => {
      e.preventDefault();
      const f = new FormData(e.currentTarget);
      run(async () => {
        await api('/api/v1/admin/timetable', 'POST', { assignment_id: f.get('cls'), day: Number(f.get('day')), period: Number(f.get('period')), starts_at: f.get('starts'), ends_at: f.get('ends'), room: f.get('room') });
        return 'Added to the timetable.';
      });
    }}>
      <ErrorBox err={err} />
      <label htmlFor="t-cls">Class</label><select id="t-cls" name="cls">{classes.map((k) => <option key={k.id} value={k.id}>{k.label}</option>)}</select>
      <div className="row">
        <div><label htmlFor="t-day">Day</label><select id="t-day" name="day">{['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d, i) => <option key={d} value={i + 1}>{d}</option>)}</select></div>
        <div><label htmlFor="t-per">Period</label><select id="t-per" name="period">{[1, 2, 3, 4, 5, 6, 7, 8].map((n) => <option key={n}>{n}</option>)}</select></div>
        <div><label htmlFor="t-s">Starts</label><input id="t-s" name="starts" type="time" defaultValue="09:30" required /></div>
        <div><label htmlFor="t-e">Ends</label><input id="t-e" name="ends" type="time" defaultValue="10:20" required /></div>
        <div><label htmlFor="t-room">Room</label><input id="t-room" name="room" maxLength={40} /></div>
      </div>
      <p><button disabled={busy || !classes.length}>Add period</button></p>
      <Msg msg={msg} />
    </form>
  );
}

export function RemoveSlot({ id }: { id: string }) {
  const { busy, run } = useAction();
  return <button type="button" className="text-btn" disabled={busy} aria-label="Remove this period" onClick={() => run(async () => { await api(`/api/v1/admin/timetable/${id}`, 'DELETE'); })}>Remove</button>;
}

// ---- Placement cell

const STAGE_LABEL: Record<string, string> = { shortlisted: 'Shortlisted', interview: 'Interview', selected: 'Selected', offer_accepted: 'Offer accepted', rejected: 'Not selected' };

export function StageSelect({ jobId, studentId, stage }: { jobId: string; studentId: string; stage: string | null }) {
  const [s, setS] = useState(stage ?? '');
  const { err, busy, run } = useAction();
  return (
    <span className="stage-select">
      <select aria-label="Interview round" value={s} disabled={busy} onChange={(e) => {
        const v = e.target.value; const prev = s; setS(v);
        run(async () => { await api(`/api/v1/placement/jobs/${jobId}/stage`, 'PATCH', { student_id: studentId, stage: v || null }); }).then((ok) => { if (!ok) setS(prev); });
      }}>
        <option value="">Applied</option>{Object.entries(STAGE_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </select>
      {err && <span role="alert" className="bad small-note">{err.message}</span>}
    </span>
  );
}

// ---- Placement preparation (learning path, practice)

export function PathPicker({ current, paths }: { current: string | null; paths: { id: string; label: string; blurb: string }[] }) {
  const { err, busy, run } = useAction();
  return (
    <>
      <ErrorBox err={err} />
      <div className="path-grid" role="group" aria-label="Target role">
        {paths.map((p) => (
          <button key={p.id} type="button" className="path-option" aria-pressed={p.id === current} disabled={busy}
            onClick={() => run(async () => { await api('/api/v1/prep/path', 'POST', { path: p.id }); })}>
            <strong>{p.label}</strong><small>{p.blurb}</small>
          </button>
        ))}
      </div>
    </>
  );
}

/** Native <details> whose open state survives server refreshes (the initial value only comes from the server). */
export function Fold({ open, id, className, summary, children }: { open: boolean; id: string; className: string; summary: ReactNode; children: ReactNode }) {
  const [o, setO] = useState(open);
  return <details id={id} className={className} open={o} onToggle={(e) => setO(e.currentTarget.open)}><summary>{summary}</summary>{children}</details>;
}

export function MarkRead({ moduleId, read }: { moduleId: string; read: boolean }) {
  const { err, busy, run } = useAction();
  if (read) return <p><span className="badge ok">Notes read</span></p>;
  return (
    <p>
      <ErrorBox err={err} />
      <button type="button" className="secondary small" disabled={busy} onClick={() => run(async () => { await api('/api/v1/prep/progress', 'POST', { module_id: moduleId }); })}>Mark notes as read</button>
    </p>
  );
}

/** Multiple choice graded by the server. The answer and explanation arrive only after the student answers. */
export function PracticeQuestion({ n, q }: { n: number; q: ClientQuestion }) {
  const [pick, setPick] = useState<number | null>(q.result?.choice ?? null);
  const [res, setRes] = useState<(NonNullable<ClientQuestion['result']> & { recorded?: boolean }) | null>(q.result);
  const [err, setErr] = useState<ApiErr | null>(null);
  const [busy, setBusy] = useState(false);
  const [fresh, setFresh] = useState(false); // just answered: open the explanation; earlier answers stay folded
  const r = useRouter();
  const opt = (i: number) => `q-option${res && i === res.answer ? ' is-answer' : ''}${res && i === res.choice && !res.correct ? ' is-wrong' : ''}`;
  return (
    <fieldset className={`practice-q${res ? (res.correct ? ' right' : ' wrong') : ''}`}>
      <legend><span className="q-num">{n}</span> {q.q}</legend>
      <span className="badge neutral">{q.round}</span>
      {q.code && <pre><code>{q.code}</code></pre>}
      <div className="q-options">
        {q.options.map((o, i) => (
          <label key={i} className={opt(i)}>
            <input type="radio" name={q.id} checked={pick === i} disabled={!!res || busy} onChange={() => setPick(i)} /><span>{o}</span>
          </label>
        ))}
      </div>
      <ErrorBox err={err} />
      {res ? (
        <div role="status" className="q-result">
          <strong className={res.correct ? 'ok' : 'bad'}>{res.correct ? 'Correct.' : `Not quite. Answer: ${q.options[res.answer]}`}</strong>
          <p>{res.why}</p>
          {res.explain && <Explanation e={res.explain} open={fresh} />}
          {res.recorded === false && <p className="muted small">You had already answered this question; your first answer is the one that counts.</p>}
        </div>
      ) : (
        <button type="button" className="small" disabled={pick === null || busy} onClick={async () => {
          setBusy(true); setErr(null);
          try { const x = await api('/api/v1/prep/answers', 'POST', { question_id: q.id, choice: pick }); setRes(x); setPick(x.choice); setFresh(true); r.refresh(); } catch (e) { setErr(e as ApiErr); } finally { setBusy(false); }
        }}>Check answer</button>
      )}
    </fieldset>
  );
}

const LANG: Record<Explain['code']['lang'], string> = { python: 'Python', java: 'Java', c: 'C', sql: 'SQL', bash: 'Terminal', excel: 'Excel', text: 'Example' };
/** Worked solution: numbered steps, a snippet (runnable for Python), and the usual trap. */
function Explanation({ e, open }: { e: Explain; open: boolean }) {
  return (
    <details className="explain" open={open}>
      <summary>Step-by-step explanation</summary>
      <ol>{e.steps.map((s) => <li key={s}>{s}</li>)}</ol>
      <span className="code-lang">{LANG[e.code.lang]}</span>
      <pre><code>{e.code.src}</code></pre>
      {e.trap && <p className="banner warn"><strong>Common trap:</strong> {e.trap}</p>}
    </details>
  );
}

type QuizQ = ClientQuestion;
/** One quiz paper. Answers stay in the browser until submit; the server grades the whole paper once. */
export function QuizRunner({ id, questions }: { id: string; questions: QuizQ[] }) {
  const [picks, setPicks] = useState<Record<string, number>>({});
  const { err, busy, run } = useAction();
  const left = questions.length - Object.keys(picks).length;
  return (
    <form onSubmit={(e) => { e.preventDefault(); run(async () => { await api(`/api/v1/prep/quizzes/${id}`, 'POST', { answers: picks }); }); }}>
      {questions.map((q, n) => (
        <fieldset className="practice-q" key={q.id}>
          <legend><span className="q-num">{n + 1}</span> {q.q}</legend>
          <span className="badge neutral">{q.round}</span>
          {q.code && <pre><code>{q.code}</code></pre>}
          <div className="q-options">
            {q.options.map((o, i) => (
              <label key={i} className="q-option">
                <input type="radio" name={q.id} checked={picks[q.id] === i} disabled={busy} onChange={() => setPicks({ ...picks, [q.id]: i })} /><span>{o}</span>
              </label>
            ))}
          </div>
        </fieldset>
      ))}
      <div className="quiz-bar">
        <span role="status">{left ? `${questions.length - left} of ${questions.length} answered · unanswered questions count as wrong` : `All ${questions.length} answered`}</span>
        <ErrorBox err={err} />
        <button disabled={busy}>{busy ? 'Grading…' : 'Submit quiz'}</button>
      </div>
    </form>
  );
}

export function StartQuiz({ track, label, secondary }: { track: string; label: string; secondary?: boolean }) {
  const { err, busy, run } = useAction();
  const r = useRouter();
  return (
    <>
      <ErrorBox err={err} />
      <button type="button" className={secondary ? 'secondary' : undefined} disabled={busy}
        onClick={() => run(async () => { const q = await api('/api/v1/prep/quizzes', 'POST', { track }); r.push(`/prep/quiz/${q.id}`); })}>{label}</button>
    </>
  );
}

// ---- Administration office: college setup

export type SetupField = { name: string; label: string; type?: 'text' | 'textarea' | 'select' | 'email' | 'password' | 'number'; options?: [string, string][]; placeholder?: string; hint?: string; required?: boolean };

/** Small form for one setup record (POST /api/v1/admin/setup). `extra` carries fixed ids; field values go as strings and the server validates. */
export function QuickForm({ kind, extra = {}, fields = [], submit, done, compact }: { kind: string; extra?: Record<string, string>; fields?: SetupField[]; submit: string; done: string; compact?: boolean }) {
  const { err, msg, busy, run } = useAction();
  const uid = useId();
  return (
    <form className={compact ? 'quick-form compact' : 'quick-form'} onSubmit={(e) => {
      e.preventDefault();
      const form = e.currentTarget, values = Object.fromEntries(new FormData(form));
      run(async () => { await api('/api/v1/admin/setup', 'POST', { kind, ...extra, ...values }); form.reset(); return done; });
    }}>
      <ErrorBox err={err} />
      {fields.length > 0 && <div className="form-grid">{fields.map((f) => {
        const id = `${uid}-${f.name}`;
        const common = { id, name: f.name, required: f.required ?? true, placeholder: f.placeholder, 'aria-describedby': f.hint ? `${id}-hint` : undefined };
        return (
          <div key={f.name} className={f.type === 'textarea' ? 'span-all' : undefined}>
            <label htmlFor={id}>{f.label}</label>
            {f.type === 'textarea' ? <textarea rows={3} {...common} /> : f.type === 'select' ? <select {...common}>{f.options!.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
              : <input type={f.type ?? 'text'} {...common} />}
            {f.hint && <small id={`${id}-hint`} className="muted">{f.hint}</small>}
          </div>
        );
      })}</div>}
      <div className="quick-form-actions"><button className={compact ? 'secondary small' : undefined} disabled={busy}>{submit}</button><Msg msg={msg} /></div>
    </form>
  );
}
