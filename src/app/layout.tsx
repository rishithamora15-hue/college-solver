import './globals.css';
import type { ReactNode } from 'react';

export const metadata = { title: 'College Solver', description: 'Fees, scholarships, learning, skill prep, careers and jobs for your college' };

export default function Root({ children }: { children: ReactNode }) {
  return (
    <html lang="en-IN" data-scroll-behavior="smooth">
      <body>{children}</body>
    </html>
  );
}
