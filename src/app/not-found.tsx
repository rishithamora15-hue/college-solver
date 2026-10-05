import Link from 'next/link';

export default function NotFound() {
  return (
    <main id="main">
      <div className="banner bad" role="alert">This page was not found, or you do not have access to it.</div>
      <Link href="/">Go to overview</Link>
    </main>
  );
}
