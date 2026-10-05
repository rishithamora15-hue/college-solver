import { defineConfig } from '@playwright/test';

// E2E env: throwaway local Postgres + synthetic seed + MOCK fixture AI (labeled in UI). Test-only values, not secrets.
export const E2E_ENV = {
  DATABASE_URL: 'postgres://postgres:postgres@localhost:54331/college_e2e',
  SESSION_SECRET: 'e2e-only-session-secret-not-used-anywhere-else',
  AUTH_MODE: 'demo', AI_PROVIDER: 'fixture', APP_ORIGIN: 'http://localhost:3100', WORKER_CONCURRENCY: '2',
};

export default defineConfig({
  testDir: 'e2e',
  globalSetup: './e2e/setup.ts',
  workers: 1,
  timeout: 90_000,
  expect: { timeout: 30_000 },
  reporter: [['list'], ['html', { open: 'never' }]],
  use: { baseURL: E2E_ENV.APP_ORIGIN, channel: 'msedge', trace: 'retain-on-failure', screenshot: 'only-on-failure' },
  projects: [
    { name: 'desktop', testIgnore: /mobile/, use: { viewport: { width: 1280, height: 800 } } },
    { name: 'mobile', testMatch: /mobile/, use: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true } },
  ],
  // ponytail: dev server because the fixture AI provider is refused under NODE_ENV=production (by design).
  webServer: { command: 'npx next dev -p 3100', url: 'http://localhost:3100/api/v1/health/live', timeout: 180_000, reuseExistingServer: false, env: { ...process.env, ...E2E_ENV } as Record<string, string> },
});
