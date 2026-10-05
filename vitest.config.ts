import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    globalSetup: ['tests/global-setup.ts'],
    fileParallelism: false,
    testTimeout: 60000,
    hookTimeout: 120000,
    env: {
      DATABASE_URL: 'postgres://postgres:postgres@localhost:54330/college_test',
      SESSION_SECRET: 'test-secret-test-secret-test-secret-123',
      AI_PROVIDER: 'fixture',
      APP_ORIGIN: 'http://localhost:3000',
      WORKER_LEASE_S: '2',
    },
  },
});
