import { expect, test } from '@playwright/test';
import { ID } from '../scripts/seed';

test('mobile 390px: no horizontal page scroll on core screens', async ({ page }) => {
  await page.goto('/signin');
  await page.getByRole('button', { name: 'Sign in as asha', exact: true }).click();
  await page.waitForURL('/');
  for (const path of ['/', '/fees', `/fees/${ID.caseAsha}`, `/learn?s=${ID.csDbms}`, '/career', '/jobs', '/complaints', '/settings']) {
    await page.goto(path);
    const [sw, iw] = await page.evaluate(() => [document.documentElement.scrollWidth, window.innerWidth]);
    expect(sw, `${path} overflows`).toBeLessThanOrEqual(iw + 1);
  }
});
