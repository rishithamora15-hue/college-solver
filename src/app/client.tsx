'use client';
// Interactive pieces. All mutations go through /api/v1 with JSON + Idempotency-Key where required.
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';

type ApiErr = { code: string; message: string; request_id: string; fields?: string[]; retry_after_s?: number };
export async function api<T = any>(path: string, method = 'POST', body?: unknown, idemKey?: string): Promise<T> {
  const res = await fetch(path, {
    method, headers: { 'content-type': 'application/json', ...(idemKey ? { 'idempotency-key': idemKey } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
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
    </div>
  );
}

export function NavLinks({ items }: { items: [string, string][] }) {
  const path = usePathname();
  return <>{items.map(([href, label]) => (
    <Link key={href} href={href} aria-current={(href === '/' ? path === '/' : path.startsWith(href)) ? 'page' : undefined}>{label}</Link>
  ))}</>;
}

export function SignOut() {
  const r = useRouter();
  return <button className="secondary" onClick={async () => { await api('/api/v1/auth/signout'); r.push('/signin'); r.refresh(); }}>Sign out</button>;
}

export function DemoSignIn({ users }: { users: { handle: string; name: string }[] }) {
  const r = useRouter();
  const [err, setErr] = useState<ApiErr | null>(null);
  return (
    <>
      <ErrorBox err={err} />
      <ul style={{ listStyle: 'none', padding: 0 }}>
        {users.map((u) => (
          <li key={u.handle} className="card row" style={{ alignItems: 'center' }}>
            <div><strong>{u.name}</strong></div>
            <button style={{ flex: '0 0 auto' }} onClick={async () => {
              try { await api('/api/v1/auth/demo', 'POST', { handle: u.handle }); r.push('/'); r.refresh(); } catch (e) { setErr(e as ApiErr); }
            }}>Sign in as {u.handle}</button>
          </li>
        ))}
      </ul>
    </>
  );
}

export function PasswordSignIn() {
  const r = useRouter();
  const [err, setErr] = useState<ApiErr | null>(null);
  return (
    <form className="card" onSubmit={async (e) => {
      e.preventDefault();
      const f = new FormData(e.currentTarget);
      try { await api('/api/v1/auth/password', 'POST', { email: f.get('email'), password: f.get('password') }); r.push('/'); r.refresh(); } catch (x) { setErr(x as ApiErr); }
    }}>
      <ErrorBox err={err} />
      <label htmlFor="email">Email</label><input id="email" name="email" type="email" autoComplete="username" required />
      <label htmlFor="password">Password</label><input id="password" name="password" type="password" autoComplete="current-password" required />
      <p><button>Sign in</button></p>
    </form>
  );
}

/** Polls a durable run (bounded, honours retry hint). Survives reloads because state lives in the database. */
export function RunView({ runId, render }: { runId: string; render: 'scholarship' | 'tutor' | 'career' }) {
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
        {r.abstained && <div className="banner warn" role="status">Not supported by approved sources.</div>}
        <Text t={r.answer} />
        {r.claims?.length > 0 && <><h3>Cited points</h3><ul>{r.claims.map((c: any, i: number) => <li key={i}>{c.text} {c.source_ids.map((s: string) => <sup key={s}>[{idx.get(s) ?? '?'}]</sup>)}</li>)}</ul></>}
        {r.supplemental && <><h3>Supplemental (general knowledge, not from your sources)</h3><Text t={r.supplemental} /></>}
        {r.sources?.length > 0 && <><h3>Sources</h3><ol>{r.sources.map((s: any) => <li key={s.id}>{s.title} · {s.revision} · page {s.page} · {s.section} · <a href={`/api/v1/documents/${s.document_id}/download`}>open</a></li>)}</ol></>}
        {r.uncertainties?.length > 0 && <p className="muted">Uncertain: {r.uncertainties.join(' ')}</p>}
        <p className="muted">Code shown is illustrative and was not executed.</p>
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
      <p className="muted">Readiness: <strong>{r.readiness}</strong> (no assessment rubric has been run; no score is shown).</p>
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
export function StartRun({ screen, input, label, render, children }: { screen: string; input: Record<string, unknown>; label: string; render: 'scholarship' | 'tutor' | 'career'; children?: ReactNode }) {
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
  const r = useRouter();
  const sections = ['summary', 'education', 'skill', 'project', 'experience', 'achievement'];
  return (
    <div className="card">
      <ErrorBox err={err} />
      <h2>1. Paste resume text</h2>
      <p className="muted">PDF upload is disabled in this pilot (safe parser and scanner not yet enabled). Paste text instead.</p>
      <label htmlFor="rt">Resume text</label>
      <textarea id="rt" rows={6} maxLength={20000} value={text} onChange={(e) => setText(e.target.value)} />
      <p><button className="secondary" onClick={async () => { try { setItems((await api('/api/v1/resume/preview', 'POST', { text })).items); } catch (e) { setErr(e as ApiErr); } }}>Preview extraction</button></p>
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

export function JdAnalysis({ resumeVersionId }: { resumeVersionId: string }) {
  const [jd, setJd] = useState('');
  return (
    <>
      <label htmlFor="jd">Paste a job description</label>
      <textarea id="jd" rows={6} maxLength={8000} value={jd} onChange={(e) => setJd(e.target.value)} />
      <div style={{ marginTop: 8 }}>
        <StartRun screen="career" input={{ resume_version_id: resumeVersionId, jd_text: jd }} label="Analyse against my resume" render="career" />
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

export function PrefsForm({ enabled, displayName }: { enabled: boolean; displayName: string }) {
  const [err, setErr] = useState<ApiErr | null>(null);
  const [msg, setMsg] = useState('');
  return (
    <>
      <ErrorBox err={err} />
      <form className="card" onSubmit={async (e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        try { await api('/api/v1/notification-preferences', 'PATCH', { reminders_enabled: f.get('rem') === 'on' }); setMsg('Preferences saved'); } catch (x) { setErr(x as ApiErr); }
      }}>
        <h2>Reminders</h2>
        <label><input type="checkbox" name="rem" defaultChecked={enabled} style={{ width: 'auto' }} /> In-app fee and document reminders</label>
        <p><button>Save preferences</button></p>
      </form>
      <form className="card" onSubmit={async (e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        try { await api('/api/v1/me/profile', 'PATCH', { display_name: f.get('dn') }); setMsg('Profile saved'); } catch (x) { setErr(x as ApiErr); }
      }}>
        <h2>Profile</h2>
        <label htmlFor="dn">Display name</label><input id="dn" name="dn" defaultValue={displayName} maxLength={80} required />
        <p className="muted">Role and college come from your institution's membership records and cannot be edited here.</p>
        <p><button>Save profile</button></p>
      </form>
      {msg && <p role="status" className="ok">{msg}</p>}
    </>
  );
}
