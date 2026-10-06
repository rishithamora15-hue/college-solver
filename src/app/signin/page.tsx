import Link from 'next/link';
import { SignInPortal } from '../client';

export default async function SignIn({ searchParams }: { searchParams: Promise<{ as?: string }> }) {
  const as = (await searchParams).as;
  return (
    <main id="main" className="signin-main">
      <div className="signin-scene" aria-hidden="true"><span className="blob b1" /><span className="blob b2" /><span className="blob b3" /></div>
      <section className="signin-panel entry-rise" aria-labelledby="signin-title">
        <Link href="/welcome" className="back-link">← Home</Link>
        <div className="signin-brand"><span className="brand-mark" aria-hidden="true">✦</span><span>College Solver</span></div>
        <h1 id="signin-title">Welcome back.</h1>
        <p className="signin-sub">Choose how you sign in.</p>
        <SignInPortal initial={as === 'student' || as === 'staff' ? as : null} />
      </section>
    </main>
  );
}
