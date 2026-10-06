import { expect, test } from '@playwright/test';
import { ID } from '../scripts/seed';
import { signIn } from './sign-in';

test('mobile 390px: no horizontal page scroll on core screens', async ({ page }) => {
  await page.goto('/welcome');
  await page.screenshot({ path: '.data/ui-qa/final-mobile-welcome.png', fullPage: true, caret: 'initial' });
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(391);
  await page.goto('/signin');
  await page.screenshot({ path: '.data/ui-qa/final-mobile-signin.png', fullPage: true, caret: 'initial' });
  await signIn(page, 'asha');
  for (const path of ['/', '/academics', '/requests', '/fees', `/fees/${ID.caseAsha}`, `/learn?s=${ID.csDbms}`, '/career', '/jobs', '/complaints', '/settings']) {
    await page.goto(path);
    if (path === '/' || path === '/fees' || path === '/jobs') await page.screenshot({ path: `.data/ui-qa/final-mobile-${path === '/' ? 'overview' : path.slice(1)}.png`, fullPage: true, caret: 'initial' });
    const [sw, iw] = await page.evaluate(() => [document.documentElement.scrollWidth, window.innerWidth]);
    expect(sw, `${path} overflows`).toBeLessThanOrEqual(iw + 1);
    if (path === '/fees') {
      const label = await page.locator('.fee-breakdown td').first().evaluate((el) => getComputedStyle(el, '::before').content);
      expect(label).toContain('Category');
    }
  }
});
