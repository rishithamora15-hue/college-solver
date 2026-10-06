import { test, expect } from '@playwright/test';
import { ID } from '../scripts/seed';
import { signIn } from './sign-in';

test('visual review captures the remaining core surfaces', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/');
  await page.waitForURL('/welcome'); // no session -> public home page
  await page.screenshot({ path: '.data/ui-qa/final-desktop-welcome.png', fullPage: true, caret: 'initial' });
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(1281);
  // Scroll reveals finish once a section is in view, and hover motion is not blocked by the entrance animation.
  for (const [name, sel] of [['welcome-roles', '#who'], ['welcome-how', '#how'], ['welcome-final', '.home-final']] as const) {
    await page.locator(sel).scrollIntoViewIfNeeded();
    await page.mouse.wheel(0, 300);
    await page.waitForTimeout(400);
    await page.screenshot({ path: `.data/ui-qa/final-desktop-${name}.png`, caret: 'initial' });
  }
  await page.locator('#who').scrollIntoViewIfNeeded();
  await page.mouse.wheel(0, 250);
  await expect.poll(() => page.locator('.bento-students').evaluate((el) => getComputedStyle(el).opacity)).toBe('1');
  await page.locator('.bento-students').hover();
  await expect.poll(() => page.locator('.bento-students').evaluate((el) => getComputedStyle(el).transform)).not.toBe('none');
  await page.goto('/signin');
  await page.screenshot({ path: '.data/ui-qa/final-desktop-signin.png', fullPage: true, caret: 'initial' });
  await signIn(page, 'asha');
  await page.goto('/jobs');
  const jobPath = await page.locator('.job-card h2 a').first().getAttribute('href');
  expect(jobPath).toBeTruthy();
  for (const [name, path] of [
    ['scholarship', `/fees/${ID.caseAsha}`],
    ['tutor', `/learn?s=${ID.csDbms}`],
    ['career', '/career'],
    ['job-detail', jobPath!],
    ['settings', '/settings'],
  ]) {
    await page.goto(path);
    await page.screenshot({ path: `.data/ui-qa/final-desktop-${name}.png`, fullPage: true, caret: 'initial' });
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(1281);
  }
  await page.setViewportSize({ width: 390, height: 844 });
  for (const [name, path] of [['scholarship', `/fees/${ID.caseAsha}`], ['career', '/career'], ['job-detail', jobPath!]]) {
    await page.goto(path);
    await page.screenshot({ path: `.data/ui-qa/final-mobile-${name}.png`, fullPage: true, caret: 'initial' });
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(391);
  }
});

test('visual review: administration office and placement cell', async ({ browser }) => {
  for (const [who, paths] of [
    ['admin', [['admin', '/admin?q=22A'], ['admin-student', `/admin/students/${ID.ashaStudent}`], ['admin-complaints', '/complaints']]],
    ['placement', [['placement', '/placement'], ['placement-drive', '/placement/jobs/00000000-0000-4000-8000-000000000301']]],
  ] as const) {
    const page = await (await browser.newContext({ viewport: { width: 1280, height: 800 } })).newPage();
    await signIn(page, who);
    for (const [name, path] of paths) {
      await page.goto(path);
      await page.screenshot({ path: `.data/ui-qa/final-desktop-${name}.png`, fullPage: true, caret: 'initial' });
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(1281);
    }
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(paths[0][1]);
    await page.screenshot({ path: `.data/ui-qa/final-mobile-${paths[0][0]}.png`, fullPage: true, caret: 'initial' });
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(391);
  }
});
