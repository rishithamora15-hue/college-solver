// SYNTHETIC data only. All people, colleges, amounts and job listings are fictional.
import { createHash } from 'node:crypto';
import pg from 'pg';

const u = (n: number) => `00000000-0000-4000-8000-${n.toString().padStart(12, '0')}`;
export const ID = {
  collegeA: u(1), collegeB: u(2),
  asha: u(11), ravi: u(12), finA: u(13), placeA: u(14), editorA: u(15), revokedA: u(16), meera: u(21), finB: u(22),
  ashaStudent: u(111), raviStudent: u(112), meeraStudent: u(121),
  branchA: u(31), curA: u(32), branchB: u(33), curB: u(34),
  dbms: u(41), cprog: u(42), ds: u(43), dbmsB: u(44),
  csDbms: u(51), csC: u(52), csDs: u(53), csDbmsB: u(54),
  feeA1: u(61), feeA2: u(62), feeA3: u(63), feeR1: u(64), feeM1: u(65),
  scheme: u(71), schemeB: u(72), caseAsha: u(73), caseRavi: u(74), caseMeera: u(75),
  req1: u(81), req2: u(82), req3: u(83),
  deptSch: u(91), deptFees: u(92), deptSchB: u(93),
  docDbms: u(201), docC: u(202), paperDbms24: u(203), paperDbms23: u(204), paperC24: u(205), docB: u(206),
  jobExpired: u(308), jobB: u(309),
};
const rupees = (r: number) => r * 100;
const days = (d: number) => new Date(Date.now() + d * 86400000).toISOString();
const sha = (s: string) => createHash('sha256').update(s).digest('hex');

export async function seed(url = process.env.DATABASE_URL) {
  const c = new pg.Client({ connectionString: url });
  await c.connect();
  const q = (sql: string, p: unknown[] = []) => c.query(sql, p);
  try {
    if ((await q('select 1 from colleges limit 1')).rowCount) { console.log('seed: already present, skipping'); return; }
    await q('begin');
    const now = new Date().toISOString();
    await q(`insert into colleges values ($1,'Synthetic Institute of Technology A','Asia/Kolkata'),($2,'Synthetic College of Engineering B','Asia/Kolkata')`, [ID.collegeA, ID.collegeB]);
    const users: [string, string, string][] = [
      [ID.asha, 'asha', 'Asha (synthetic student)'], [ID.ravi, 'ravi', 'Ravi (synthetic student)'],
      [ID.finA, 'fin.a', 'Finance staff A (synthetic)'], [ID.placeA, 'place.a', 'Placement staff A (synthetic)'],
      [ID.editorA, 'editor.a', 'Content editor A (synthetic)'], [ID.revokedA, 'revoked.a', 'Revoked staff A (synthetic)'],
      [ID.meera, 'meera', 'Meera (synthetic student, college B)'], [ID.finB, 'fin.b', 'Finance staff B (synthetic)'],
    ];
    for (const [id, h, n] of users) await q('insert into app_users values ($1,$2,$3,$4)', [id, 'demo:' + h, `${h}@example.invalid`, n]);
    const mem: [string, string, string, string][] = [
      [ID.collegeA, ID.asha, 'student', 'active'], [ID.collegeA, ID.ravi, 'student', 'active'],
      [ID.collegeA, ID.finA, 'finance_staff', 'active'], [ID.collegeA, ID.placeA, 'placement_staff', 'active'],
      [ID.collegeA, ID.editorA, 'content_editor', 'active'], [ID.collegeA, ID.revokedA, 'finance_staff', 'revoked'],
      [ID.collegeB, ID.meera, 'student', 'active'], [ID.collegeB, ID.finB, 'finance_staff', 'active'],
    ];
    for (const m of mem) await q('insert into memberships values ($1,$2,$3,$4)', m);

    // Curriculum
    await q(`insert into branches values ($1,$2,'CSE','Computer Science and Engineering'),($3,$4,'CSE','Computer Science and Engineering')`, [ID.branchA, ID.collegeA, ID.branchB, ID.collegeB]);
    await q(`insert into curricula values ($1,$2,$3,'R-SYN-2024',1),($4,$5,$6,'R-SYN-2024',1)`, [ID.curA, ID.collegeA, ID.branchA, ID.curB, ID.collegeB, ID.branchB]);
    await q(`insert into subjects values ($1,$4,'CS301','Database Management Systems'),($2,$4,'CS201','Programming in C'),($3,$4,'CS302','Data Structures'),($5,$6,'CS301','Database Management Systems')`,
      [ID.dbms, ID.cprog, ID.ds, ID.collegeA, ID.dbmsB, ID.collegeB]);
    await q(`insert into curriculum_subjects values ($1,$5,$6,$2,3),($3,$5,$6,$4,2),($7,$5,$6,$8,3),($9,$10,$11,$12,3)`,
      [ID.csDbms, ID.dbms, ID.csC, ID.cprog, ID.collegeA, ID.curA, ID.csDs, ID.ds, ID.csDbmsB, ID.collegeB, ID.curB, ID.dbmsB]);
    let t = 400;
    for (const [cs, names] of [[ID.csDbms, ['ER modelling', 'Normalization', 'Transactions']], [ID.csC, ['Pointers', 'Arrays and strings']], [ID.csDs, ['Stacks and queues']]] as const)
      for (const [i, n] of names.entries()) await q('insert into topics values ($1,$2,$3,$4,$5)', [u(t++), ID.collegeA, cs, n, i]);

    await q(`insert into students values ($1,$2,$3,$4,3,'Asha'),($5,$2,$6,$4,3,'Ravi'),($7,$8,$9,$10,3,'Meera')`,
      [ID.ashaStudent, ID.collegeA, ID.asha, ID.curA, ID.raviStudent, ID.ravi, ID.meeraStudent, ID.collegeB, ID.meera, ID.curB]);
    await q(`insert into backlogs values ($1,$2,$3,'active')`, [ID.collegeA, ID.ashaStudent, ID.csC]);

    // Finance. Asha: Y2 tuition 1,20,000; expected scholarship 80,000 approved but NOT credited; paid 20,000.
    const fee = (id: string, col: string, st: string, yr: string, cat: string, amt: number, due: string) =>
      q(`insert into fee_assessments values ($1,$2,$3,$4,$5,$6,$7,'fee-policy-syn-v1',$8,$9)`, [id, col, st, yr, cat, rupees(amt), due, 'synthetic-erp:' + id.slice(-3), now]);
    await fee(ID.feeA1, ID.collegeA, ID.ashaStudent, '2024-25', 'tuition', 110000, days(-300));
    await fee(ID.feeA2, ID.collegeA, ID.ashaStudent, '2025-26', 'tuition', 120000, days(10));
    await fee(ID.feeA3, ID.collegeA, ID.ashaStudent, '2025-26', 'transport', 15000, days(10));
    await fee(ID.feeR1, ID.collegeA, ID.raviStudent, '2025-26', 'tuition', 120000, days(10));
    await fee(ID.feeM1, ID.collegeB, ID.meeraStudent, '2025-26', 'tuition', 95000, days(20));

    await q(`insert into schemes values ($1,$2,'State Merit Scholarship (synthetic)',$3,'sch-policy-syn-v2'),($4,$5,'Merit Grant (synthetic)','Synthetic policy for college B.','sch-b-v1')`, [ID.scheme, ID.collegeA,
      'Section 4.2: After approval, funds are released by the sanctioning authority to the college account in batches. Section 4.3: The college credits released funds to the student fee ledger within 15 working days of receipt. Section 5.1: Applications missing the bonafide certificate remain on hold for release. Section 6: Disputes go to the Scholarship Cell.',
      ID.schemeB, ID.collegeB]);
    const kase = (id: string, col: string, st: string, sch: string, status: string, exp: number, rel: number) =>
      q(`insert into scholarship_cases values ($1,$2,$3,$4,'2025-26',$5,$6,$7,$8,$9,1)`, [id, col, st, sch, status, rupees(exp), rupees(rel), 'synthetic-sch-portal:' + id.slice(-3), now]);
    await kase(ID.caseAsha, ID.collegeA, ID.ashaStudent, ID.scheme, 'approved', 80000, 0);
    await kase(ID.caseRavi, ID.collegeA, ID.raviStudent, ID.scheme, 'credited', 80000, 80000);
    await kase(ID.caseMeera, ID.collegeB, ID.meeraStudent, ID.schemeB, 'under_verification', 50000, 0);
    for (const [cs, col, sts] of [[ID.caseAsha, ID.collegeA, ['applied', 'under_verification', 'approved']], [ID.caseRavi, ID.collegeA, ['applied', 'approved', 'released', 'credited']], [ID.caseMeera, ID.collegeB, ['applied', 'under_verification']]] as const)
      for (const [i, s] of sts.entries()) await q('insert into scholarship_case_events (college_id, case_id, status, source_ref, occurred_at) values ($1,$2,$3,$4,$5)', [col, cs, s, 'synthetic-sch-portal', days(-60 + i * 15)]);

    const pay = async (id: number, col: string, st: string, kind: string, amt: number, caseId: string | null, alloc: string) => {
      await q(`insert into payments values ($1,$2,$3,$4,'settled','synthetic-erp',$5,$6,$7,$8)`, [u(id), col, st, kind, 'PAY-' + id, rupees(amt), caseId, days(-20)]);
      await q('insert into payment_allocations values ($1,$2,$3,$4)', [col, u(id), alloc, rupees(amt)]);
    };
    await pay(501, ID.collegeA, ID.ashaStudent, 'student_payment', 110000, null, ID.feeA1);
    await pay(502, ID.collegeA, ID.ashaStudent, 'student_payment', 20000, null, ID.feeA2);
    await pay(503, ID.collegeA, ID.raviStudent, 'student_payment', 40000, null, ID.feeR1);
    await pay(504, ID.collegeA, ID.raviStudent, 'scholarship_credit', 80000, ID.caseRavi, ID.feeR1);

    await q(`insert into document_requirements values ($1,$4,$5,'Income certificate (current year)','Issued within the last 12 months'),($2,$4,$5,'Bonafide certificate','Issued by the college office for the current academic year'),($3,$4,$5,'Previous year marks memo','Copy of the previous year marks memo')`,
      [ID.req1, ID.req2, ID.req3, ID.collegeA, ID.scheme]);
    for (const [st, req, state] of [[ID.ashaStudent, ID.req1, 'accepted'], [ID.ashaStudent, ID.req2, 'missing'], [ID.ashaStudent, ID.req3, 'accepted'], [ID.raviStudent, ID.req1, 'accepted'], [ID.raviStudent, ID.req2, 'accepted'], [ID.raviStudent, ID.req3, 'accepted']])
      await q('insert into student_documents values ($1,$2,$3,$4,$5,$6)', [ID.collegeA, st, req, state, state === 'accepted' ? days(200) : null, now]);
    await q(`insert into departments values ($1,$3,'Scholarship Cell','scholarship','Scholarship Cell (synthetic directory entry)'),($2,$3,'Accounts Office','fees','Accounts Office (synthetic directory entry)'),($4,$5,'Scholarship Cell','scholarship','Scholarship Cell B (synthetic)')`,
      [ID.deptSch, ID.deptFees, ID.collegeA, ID.deptSchB, ID.collegeB]);

    // Content: synthetic text documents with page-attributed chunks.
    const doc = async (id: string, col: string, cur: string, sub: string, kind: string, title: string, year: number | null, pages: [string, string][]) => {
      const text = pages.map(([s, b], i) => `--- Page ${i + 1}: ${s} ---\n${b}`).join('\n\n');
      await q(`insert into documents values ($1,$2,$3,$4,$5,$6,'rev-1',$7,'Synthetic sample authored for evaluation','CC0 (synthetic)','published','text/plain',$8,$9)`,
        [id, col, cur, sub, kind, title, year, Buffer.from(text), sha(text)]);
      for (const [i, [s, b]] of pages.entries())
        await q('insert into document_chunks (college_id, document_id, curriculum_id, subject_id, page, section, body) values ($1,$2,$3,$4,$5,$6,$7)', [col, id, cur, sub, i + 1, s, b]);
    };
    await doc(ID.docDbms, ID.collegeA, ID.curA, ID.dbms, 'material', 'DBMS Unit Notes (synthetic)', null, [
      ['ER modelling', 'An entity-relationship model describes entities, their attributes and relationships. Cardinality states how many instances of one entity relate to another: one-to-one, one-to-many or many-to-many.'],
      ['Normalization', 'Normalization reduces redundancy. First normal form (1NF) requires atomic values. Second normal form (2NF) removes partial dependency on a composite key. Third normal form (3NF) removes transitive dependency, so non-key attributes depend only on the key. Example: storing department name in an employee table keyed by employee id creates a transitive dependency employee_id -> dept_id -> dept_name; move dept_name to a department table.'],
      ['Transactions', 'A transaction is a unit of work with ACID properties: atomicity, consistency, isolation and durability. Isolation levels such as read committed and serializable trade concurrency for anomaly prevention. Practical use: a bank transfer debits and credits inside one transaction.'],
    ]);
    await doc(ID.docC, ID.collegeA, ID.curA, ID.cprog, 'material', 'Programming in C Notes (synthetic)', null, [
      ['Pointers', 'A pointer stores a memory address. Declare with int *p; take an address with &x and dereference with *p. Example:\n```c\nint x = 5;\nint *p = &x;\n*p = 7; /* x is now 7 */\nprintf("%d", x); /* prints 7 */\n```\nPointer arithmetic moves by the size of the pointed-to type.'],
      ['Arrays and strings', 'An array is a contiguous block of elements. A C string is a char array terminated by the null character. strlen counts characters before the terminator.'],
    ]);
    await doc(ID.paperDbms24, ID.collegeA, ID.curA, ID.dbms, 'paper', 'CS301 DBMS End-semester paper 2024 (synthetic)', 2024, [['Questions', '1. Explain 3NF with an example. 2. Describe ACID properties. 3. Draw an ER diagram for a library.']]);
    await doc(ID.paperDbms23, ID.collegeA, ID.curA, ID.dbms, 'paper', 'CS301 DBMS End-semester paper 2023 (synthetic)', 2023, [['Questions', '1. Define 2NF. 2. Compare isolation levels. 3. Explain cardinality.']]);
    await doc(ID.paperC24, ID.collegeA, ID.curA, ID.cprog, 'paper', 'CS201 Programming in C paper 2024 (synthetic)', 2024, [['Questions', '1. Explain pointers with an example. 2. Write a program to reverse a string.']]);
    await doc(ID.docB, ID.collegeB, ID.curB, ID.dbmsB, 'material', 'College B private DBMS notes (synthetic)', null, [['Normalization', 'COLLEGE-B-ONLY normalization notes: Boyce-Codd normal form details private to college B.']]);

    // Jobs: every category combination, all fictional, example.org links only.
    const jobs: [string, string, string, string, string, number][] = [
      ['Fictional Softworks', 'Graduate Software Engineer', 'it', 'campus', 'fresher', 25],
      ['Imaginary Analytics', 'Data Analyst Intern', 'it', 'off_campus', 'internship', 15],
      ['Sample Cloud Labs', 'Backend Developer (Fresher)', 'it', 'off_campus', 'fresher', 30],
      ['Demo Systems', 'QA Intern', 'it', 'campus', 'internship', 12],
      ['Placeholder Bank', 'Operations Associate', 'non_it', 'campus', 'fresher', 20],
      ['Mock Retail Co', 'Marketing Intern', 'non_it', 'off_campus', 'internship', 18],
      ['Example Logistics', 'Supply Chain Trainee', 'non_it', 'off_campus', 'fresher', 22],
    ];
    const jd = 'Required skills: SQL, Python, Git, communication. Responsibilities: build and test features, write documentation. Qualifications: B.Tech (any branch), 2026 batch.';
    for (const [i, [co, role, cat, camp, lvl, d]] of jobs.entries())
      await q(`insert into opportunities values ($1,$2,$3,$4,$5,$6,$7,'Hyderabad (synthetic)',$8,'B.Tech 2026 batch, no active backlogs at joining',null,$9,$10,$11,$12,'published',true)`,
        [u(301 + i), ID.collegeA, co, role, cat, camp, lvl, cat === 'it' ? jd : 'Required skills: Excel, communication, negotiation. Responsibilities: coordinate operations. Qualifications: any graduate 2026 batch.',
          `https://example.org/jobs/${301 + i}`, `https://example.org/apply/${301 + i}`, days(d), days(-1)]);
    await q(`insert into opportunities values ($1,$2,'Expired Example Ltd','Junior Developer','it','campus','fresher','Remote (synthetic)',$3,'Any graduate','INR 4 LPA (synthetic)','https://example.org/jobs/308','https://example.org/apply/308',$4,$5,'published',true)`,
      [ID.jobExpired, ID.collegeA, jd, days(-2), days(-30)]);
    await q(`insert into opportunities values ($1,$2,'College B Only Corp','B-only role','it','campus','fresher','Pune (synthetic)',$3,'Any',null,'https://example.org/jobs/309','https://example.org/apply/309',$4,$5,'published',true)`,
      [ID.jobB, ID.collegeB, jd, days(20), days(-1)]);

    await q(`insert into resume_versions (college_id, student_id, version, facts, confirmed_at) values ($1,$2,1,$3,$4)`, [ID.collegeA, ID.ashaStudent, JSON.stringify({
      items: [
        { id: 'f1', section: 'education', text: 'B.Tech CSE (2nd year), Synthetic Institute of Technology A' },
        { id: 'f2', section: 'skill', text: 'Python' },
        { id: 'f3', section: 'skill', text: 'SQL' },
        { id: 'f4', section: 'project', text: 'built a library management app using python and sqlite' },
      ],
    }), now]);
    await q('commit');
    console.log('seed: synthetic data inserted');
  } catch (e) {
    await q('rollback');
    throw e;
  } finally {
    await c.end();
  }
}

if (process.argv[1]?.endsWith('seed.ts')) seed().catch((e) => { console.error(e.message); process.exit(1); });
