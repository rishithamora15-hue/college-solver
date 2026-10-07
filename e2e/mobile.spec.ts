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
  await page.goto('/prep');
  await page.getByRole('button', { name: /Software Developer/ }).click(); // idempotent; fills the prep screens below
  await expect(page.getByRole('heading', { name: 'Recommended next steps' })).toBeVisible();
  for (const path of ['/', '/academics', '/requests', '/fees', `/fees/${ID.caseAsha}`, `/learn?s=${ID.csDbms}`, '/prep', '/prep/coding', '/prep/quiz', '/career', '/jobs', '/complaints', '/settings']) {
    await page.goto(path);
    if (['/', '/fees', '/jobs', '/prep', '/prep/coding'].includes(path)) await page.screenshot({ path: `.data/ui-qa/final-mobile-${path === '/' ? 'overview' : path.slice(1).replace('/', '-')}.png`, fullPage: true, caret: 'initial' });
    const [sw, iw] = await page.evaluate(() => [document.documentElement.scrollWidth, window.innerWidth]);
    expect(sw, `${path} overflows`).toBeLessThanOrEqual(iw + 1);
    if (path === '/fees') {
      const label = await page.locator('.fee-breakdown td').first().evaluate((el) => getComputedStyle(el, '::before').content);
      expect(label).toContain('Category');
    }
  }
});

test('mobile 390px: administration screens, including College setup, have no horizontal scroll', async ({ page }) => {
  await signIn(page, 'admin');
  for (const path of ['/admin', '/admin/setup', '/admin/setup?tab=staff', '/admin/setup?tab=scholarships', '/admin/setup?tab=departments', '/admin/students', '/admin/fees', `/admin/students/${ID.ashaStudent}`]) {
    await page.goto(path);
    if (path === '/admin/setup') await page.screenshot({ path: '.data/ui-qa/final-mobile-admin-setup.png', fullPage: true, caret: 'initial' });
    const [sw, iw] = await page.evaluate(() => [document.documentElement.scrollWidth, window.innerWidth]);
    expect(sw, `${path} overflows`).toBeLessThanOrEqual(iw + 1);
  }
});
