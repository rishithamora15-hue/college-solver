'use client';

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main id="main">
      <div className="banner bad" role="alert">
        Something went wrong loading this page. No changes were made. {error.digest && <span className="muted">ref {error.digest}</span>}
      </div>
      <button onClick={reset}>Try again</button>
    </main>
  );
}
