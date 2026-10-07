import Link from 'next/link';
import { pageActor, q } from '@/server/page';
import { one } from '@/server/db';
import { setupOverview } from '@/server/setup';
import { QuickForm } from '../../../client';
import { NotFound, Status } from '../../../ui';

const TABS = [['syllabus', 'Branches & syllabus'], ['staff', 'Staff accounts'], ['scholarships', 'Scholarship schemes'], ['departments', 'Departments']] as const;
const SEMS: [string, string][] = [1, 2, 3, 4, 5, 6, 7, 8].map((n) => [String(n), `Semester ${n}`]);
const ROLES: [string, string][] = [['faculty', 'Faculty (teaching)'], ['placement', 'Placement cell'], ['admin', 'Administration office']];

export default async function CollegeSetup({ searchParams }: { searchParams: Promise<{ tab?: string; cur?: string }> }) {
  const sp = await searchParams;
  const a = await pageActor();
  if (!a.roles.includes('admin')) return <NotFound what="College setup" />;
  const [o, counts] = await q(a, async (c) => [await setupOverview(c, a), await one(c, `select
      (select count(*) from students where college_id = $1)::int students, (select count(*) from fee_assessments where college_id = $1)::int fees,
      (select count(*) from timetable_slots where college_id = $1)::int slots`, [a.collegeId])] as const);
  const tab = TABS.some(([k]) => k === sp.tab) ? sp.tab! : 'syllabus';
  const curricula = o.branches.flatMap((b: any) => b.curricula.map((cu: any) => ({ ...cu, label: `${b.code} · ${cu.regulation}` })));
  const cur = curricula.find((x: any) => x.id === sp.cur) ?? curricula.at(-1);
  const steps: [boolean, string, string][] = [
    [o.branches.length > 0 && o.subjects.length > 0, 'Add branches and their syllabus', '?tab=syllabus'],
    [o.staff.some((s: any) => s.role !== 'admin'), 'Create faculty and placement accounts', '?tab=staff'],
    [counts.students > 0, 'Add students (one by one or from a spreadsheet)', '/admin/students'],
    [counts.slots > 0, 'Assign teachers and build the timetable', '/admin/academics'],
    [counts.fees > 0, 'Add fees', '/admin/fees'],
    [o.schemes.length > 0, 'Add scholarship schemes and their required documents', '?tab=scholarships'],
  ];
  return (
    <>
      <span className="page-eyebrow">Administration office</span><h1>College setup</h1>
      <p className="page-lead">Everything here is your college&apos;s real information. Students only see subjects, schemes and staff you add.</p>
      {steps.some(([done]) => !done) && (
        <section className="card tone-amber">
          <h2>Getting started</h2>
          <ol className="checklist steps">{steps.map(([done, label, href]) => <li key={label} className={done ? 'ok' : ''}>{done ? '✓' : '○'} {done ? label : <Link href={href}>{label}</Link>}</li>)}</ol>
        </section>
      )}
      <nav className="tabs" aria-label="Setup sections">{TABS.map(([k, l]) => <Link key={k} href={`?tab=${k}`} aria-current={k === tab ? 'page' : undefined}>{l}</Link>)}</nav>

      {tab === 'syllabus' && <>
        <div className="split">
          <section className="card">
            <h2>Branches</h2>
            {!o.branches.length ? <p className="muted">No branches yet. Add your first one.</p> : (
              <ul className="att-list">{o.branches.map((b: any) => (
                <li key={b.id}><div className="att-head"><strong>{b.code} · {b.name}</strong></div>
                  <div className="chips">{b.curricula.map((cu: any) => <Link key={cu.id} className={`chip${cu.id === cur?.id ? ' on' : ''}`} href={`?tab=syllabus&cur=${cu.id}`}>{cu.regulation} · {cu.students} students</Link>)}</div></li>
              ))}</ul>
            )}
          </section>
          <div>
            <section className="card tone-violet">
              <h2>Add a branch</h2>
              <QuickForm kind="branch" submit="Add branch" done="Branch added." fields={[
                { name: 'code', label: 'Code', placeholder: 'CSE' }, { name: 'name', label: 'Name', placeholder: 'Computer Science and Engineering' },
                { name: 'regulation', label: 'Regulation (syllabus)', placeholder: 'R22', hint: 'New students of this branch follow the newest regulation.' }]} />
            </section>
            {o.branches.length > 0 && <section className="card">
              <h2>New regulation for a branch</h2>
              <QuickForm kind="regulation" submit="Add regulation" done="Regulation added. New students of this branch will follow it." fields={[
                { name: 'branch_id', label: 'Branch', type: 'select', options: o.branches.map((b: any) => [b.id, `${b.code} · ${b.name}`]) }, { name: 'regulation', label: 'Regulation', placeholder: 'R25' }]} />
            </section>}
          </div>
        </div>
        {cur && <>
          <div className="section-head"><h2>Syllabus: {cur.label}</h2><span className="muted">{o.subjects.filter((s: any) => s.curriculum_id === cur.id).length} subjects</span></div>
          <div className="split">
            <section className="card">
              {!o.subjects.some((s: any) => s.curriculum_id === cur.id) ? <p className="muted">No subjects yet. Add each subject with the semester it is taught in.</p> : (
                <ul className="att-list">{o.subjects.filter((s: any) => s.curriculum_id === cur.id).map((s: any) => (
                  <li key={s.id}>
                    <div className="att-head"><strong>Sem {s.semester} · {s.code} {s.name}</strong></div>
                    <small className="muted">{s.topics || 'No topics yet'}</small>
                    <QuickForm compact kind="topics" extra={{ curriculum_subject_id: s.id }} submit="Add topics" done="Topics added."
                      fields={[{ name: 'topics', label: `Add topics to ${s.code}`, placeholder: 'Comma or line separated' }]} />
                  </li>
                ))}</ul>
              )}
            </section>
            <section className="card tone-sky">
              <h2>Add a subject</h2>
              <QuickForm kind="subject" extra={{ curriculum_id: cur.id }} submit="Add subject" done="Subject added." fields={[
                { name: 'semester', label: 'Semester', type: 'select', options: SEMS }, { name: 'code', label: 'Subject code', placeholder: 'CS301' },
                { name: 'name', label: 'Subject name', placeholder: 'Database Management Systems' },
                { name: 'topics', label: 'Topics (optional)', type: 'textarea', required: false, placeholder: 'One per line, or comma separated', hint: 'Students pick a topic when asking the AI tutor.' }]} />
            </section>
          </div>
        </>}
      </>}

      {tab === 'staff' && <div className="split">
        <section className="card">
          <h2>Staff</h2>
          <ul className="att-list">{o.staff.map((s: any) => (
            <li key={`${s.id}:${s.role}`}>
              <div className="att-head"><span><strong>{s.display_name}</strong> <small className="muted">{s.email}</small></span><span><span className="badge info">{s.role}</span> <Status s={s.status === 'active' ? 'accepted' : 'withdrawn'} /></span></div>
              {s.id !== a.userId && <QuickForm compact kind="staff_status" extra={{ user_id: s.id, role: s.role, status: s.status === 'active' ? 'revoked' : 'active' }}
                submit={s.status === 'active' ? 'Revoke access' : 'Restore access'} done={s.status === 'active' ? 'Access revoked.' : 'Access restored.'} />}
            </li>
          ))}</ul>
        </section>
        <section className="card tone-violet">
          <h2>Create a staff account</h2>
          <p className="muted">Give the person their email and temporary password; they can change it in Settings. Students are added under Students.</p>
          <QuickForm kind="staff" submit="Create account" done="Account created." fields={[
            { name: 'display_name', label: 'Full name' }, { name: 'email', label: 'Email', type: 'email' },
            { name: 'role', label: 'Role', type: 'select', options: ROLES }, { name: 'password', label: 'Temporary password', type: 'password', hint: 'At least 10 characters.' }]} />
        </section>
      </div>}

      {tab === 'scholarships' && <div className="split">
        <section className="card">
          <h2>Schemes</h2>
          {!o.schemes.length ? <p className="muted">No schemes yet.</p> : o.schemes.map((s: any) => (
            <div key={s.id} className="scheme">
              <h3>{s.name} <small className="muted">· policy {s.policy_version}</small></h3>
              <ul>{o.requirements.filter((r: any) => r.scheme_id === s.id).map((r: any) => <li key={r.id}>{r.name}{r.description && <small className="muted"> · {r.description}</small>}</li>)}</ul>
              <QuickForm compact kind="requirement" extra={{ scheme_id: s.id }} submit="Add document" done="Document added."
                fields={[{ name: 'name', label: 'Required document', placeholder: 'Caste certificate' }, { name: 'description', label: 'Details', required: false }]} />
            </div>
          ))}
          <p className="muted small">To open a student&apos;s application, use the student&apos;s file under Students.</p>
        </section>
        <section className="card tone-teal">
          <h2>Add a scheme</h2>
          <QuickForm kind="scheme" submit="Add scheme" done="Scheme added." fields={[
            { name: 'name', label: 'Scheme name', placeholder: 'Post-matric scholarship' }, { name: 'policy_version', label: 'Policy version / G.O. number' },
            { name: 'policy_text', label: 'Policy text', type: 'textarea', hint: 'The AI assistant explains delays using only this text and the student\'s records.' },
            { name: 'requirements', label: 'Required documents (optional)', type: 'textarea', required: false, placeholder: 'Income certificate - issued within 12 months\nBonafide certificate' }]} />
        </section>
      </div>}

      {tab === 'departments' && <div className="split">
        <section className="card">
          <h2>Departments</h2>
          <p className="muted">Student complaints are routed to the first department that handles their topic.</p>
          <ul className="inline-list">{o.departments.map((d: any) => <li key={d.id}><strong>{d.name}</strong> · handles {d.handles} · {d.contact_label}</li>)}</ul>
        </section>
        <section className="card tone-sky">
          <h2>Add a department</h2>
          <QuickForm kind="department" submit="Add department" done="Department added." fields={[
            { name: 'name', label: 'Name' }, { name: 'handles', label: 'Handles', type: 'select', options: [['scholarship', 'Scholarship complaints'], ['fees', 'Fee complaints']] },
            { name: 'contact_label', label: 'Shown to students as', placeholder: 'Scholarship Cell, Room 104' }]} />
        </section>
      </div>}
    </>
  );
}
