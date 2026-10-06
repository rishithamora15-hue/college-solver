import './globals.css';
import type { ReactNode } from 'react';

export const metadata = { title: 'College Problem Solver (evaluation)', description: 'Synthetic-data evaluation pilot' };

export default function Root({ children }: { children: ReactNode }) {
  return (
    <html lang="en-IN" data-scroll-behavior="smooth">
      <body>{children}</body>
    </html>
  );
}
