import Link from 'next/link';

export const metadata = { title: 'College Solver — the whole college in one place' };

const TICKER = ['Timetable', 'Attendance', 'Grade cards', 'Fee receipts', 'Scholarships', 'Certificates', 'Leave', 'Placement drives', 'Interview rounds', 'Live notices', 'Class notes', 'AI tutor'];

const ROLES = [
  { key: 'students', name: 'Students', tone: 'forest', lead: 'Your whole semester on one screen.',
    items: ['Timetable, attendance and a 75% warning before it is too late', 'Grade card the moment marks are published', 'Fees, receipts and where your scholarship really is', 'Bonafide, study and conduct certificates — print once approved', 'Drives you are eligible for, and your interview round'] },
  { key: 'faculty', name: 'Faculty', tone: 'sun', lead: 'Attendance in ten taps.',
    items: ['Today’s periods, one tap to the roster', 'Marks entry and publishing', 'Notes and papers for the class'] },
  { key: 'office', name: 'Administration office', tone: 'cobalt', lead: 'Find any student by roll number.',
    items: ['Fees, payments and receipts', 'Document verification', 'Requests, timetable, notices', 'Excel reports'] },
  { key: 'placement', name: 'Placement cell', tone: 'clay', lead: 'Know who applied — and who didn’t.',
    items: ['Drives with CGPA, backlog and branch rules', 'Opened-but-not-applied, one-click reminders', 'Rounds through to offer, with statistics'] },
];

export default function Welcome() {
  return (
    <div className="home">
      <p className="home-announce"><span>Evaluation build</span> All names, amounts and listings on this site are synthetic.</p>
      <header className="home-nav">
        <Link href="/welcome" className="home-brand"><span className="brand-mark" aria-hidden="true">✦</span><span>College Solver</span></Link>
        <nav aria-label="Home">
          <a href="#who">Who it&apos;s for</a>
          <a href="#how">How it works</a>
          <Link className="btn" href="/signin">Sign in</Link>
        </nav>
      </header>

      <main id="main">
        <section className="home-hero">
          <div className="home-hero-copy">
            <h1>The whole college, <em>calmly</em> in one place.</h1>
            <p>Classes, attendance, results, fees, certificates and placements — for students, teachers, the office and the placement cell. Updates reach every screen in seconds.</p>
            <div className="home-cta">
              <Link className="btn btn-lg" href="/signin?as=student">I&apos;m a student</Link>
              <Link className="btn btn-lg secondary" href="/signin?as=staff">Faculty &amp; staff</Link>
            </div>
          </div>
          <div className="home-hero-art hero-graphic" aria-hidden="true"><div className="orbit"><span>₹</span><span>✦</span><span>↗</span><span>◎</span><div className="orbit-center">CS</div></div></div>
        </section>

        <div className="ticker" aria-hidden="true">
          <div className="ticker-track">{[...TICKER, ...TICKER].map((t, i) => <span key={i}>{t}</span>)}</div>
        </div>

        <section id="who" className="home-section">
          <h2 className="home-h2 reveal">Four doors. <em>One college.</em></h2>
          <div className="bento">
            {ROLES.map((r) => (
              <article key={r.key} className={`bento-card bento-${r.key} fill-${r.tone} reveal`}>
                <span className="bento-kicker">{r.name}</span>
                <h3>{r.lead}</h3>
                <ul>{r.items.map((i) => <li key={i}>{i}</li>)}</ul>
              </article>
            ))}
          </div>
        </section>

        <section id="how" className="home-section how">
          <h2 className="home-h2 reveal">A notice, <em>start to finish.</em></h2>
          <ol className="steps">
            <li className="reveal"><span className="step-no">01</span><h3>The office finds you</h3><p>By roll number or mobile — your file opens with fees, documents and attendance.</p></li>
            <li className="reveal"><span className="step-no">02</span><h3>One click to raise it</h3><p>&ldquo;Document verification pending&rdquo; — or a fee, a drive, a result.</p></li>
            <li className="reveal"><span className="step-no">03</span><h3>It lands on your screen</h3><p>A pop-up within seconds. Upload the document from your phone and it&apos;s back with the office.</p></li>
          </ol>
        </section>

        <section className="home-final reveal">
          <h2>Ready when you are.</h2>
          <div className="home-cta">
            <Link className="btn btn-lg btn-light" href="/signin?as=student">Student sign-in</Link>
            <Link className="btn btn-lg secondary on-dark" href="/signin?as=staff">Faculty &amp; staff sign-in</Link>
          </div>
        </section>
      </main>
      <footer className="home-foot"><span>College Solver</span><span>Students sign in with their college email and roll number.</span></footer>
    </div>
  );
}
