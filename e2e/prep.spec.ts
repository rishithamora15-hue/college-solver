// Skill prep on synthetic data: pick a learning path, read notes, practise, take a quiz, get the report and (mock) AI coach feedback.
import { expect, test } from '@playwright/test';
import { signIn } from './sign-in';

const shot = (name: string) => ({ path: `.data/ui-qa/final-desktop-${name}.png`, fullPage: true, caret: 'initial' as const });

test('student picks a learning path, practises aptitude and gets a readiness score from their own answers', async ({ page }) => {
  await signIn(page, 'ravi');
  const nav = page.getByRole('navigation', { name: 'Primary' });
  await expect(nav.getByRole('link')).toHaveText(['Overview', 'Academics', 'Skill prep', 'Career & jobs', 'Fees & requests', 'Settings']);
  await page.getByRole('link', { name: 'Start my learning path' }).click();
  const role = page.getByRole('button', { name: /Software Developer/ });
  await role.click();
  await expect(role).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByText('Answer 5 questions in any area, or confirm your resume, to get a first score.')).toBeVisible();

  const tabs = page.getByRole('navigation', { name: 'Section pages' });
  await tabs.getByRole('link', { name: 'Aptitude' }).click();
  await expect(nav.getByRole('link', { name: 'Skill prep' })).toHaveAttribute('aria-current', 'page');
  const mod = page.locator('details#apt-arith');
  await expect(mod).toHaveAttribute('open', '');
  await mod.getByRole('button', { name: 'Mark notes as read' }).click();
  await expect(mod.getByText('Notes read')).toBeVisible();
  for (let i = 0; i < 5; i++) {
    const q = mod.locator('fieldset.practice-q').nth(i);
    await q.getByRole('radio').nth(i % 4).check();
    await q.getByRole('button', { name: 'Check answer' }).click();
    await expect(q.getByRole('status')).toContainText(/Correct\.|Not quite\./);
  }
  await expect(page.getByText(/of 5 recent answers correct/)).toBeVisible();
  await expect(mod).toHaveAttribute('open', ''); // refreshes after each answer keep the module open
  await page.screenshot(shot('prep-aptitude'));

  await tabs.getByRole('link', { name: 'Learning path' }).click();
  await expect(page.getByText('Based on 1 of 5 areas.')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Recommended next steps' })).toBeVisible();
  await page.screenshot(shot('prep'));

  await nav.getByRole('link', { name: 'Overview' }).click();
  await expect(page.getByRole('heading', { name: 'Your learning path: next steps' })).toBeVisible();
  await expect(page.getByText('Based on 1 of 5 areas.')).toBeVisible();
});

test('student takes a quiz, gets a self-evaluation report and coach feedback, and sees it in the tracker', async ({ page }) => {
  await signIn(page, 'ravi'); // path chosen in the test above
  await page.goto('/prep/quiz');
  await page.locator('.quiz-card').filter({ hasText: 'Communication' }).getByRole('button', { name: 'Start quiz' }).click();
  await expect(page.getByRole('heading', { name: 'Communication quiz' })).toBeVisible();
  const qs = page.locator('fieldset.practice-q');
  const n = await qs.count();
  for (let i = 0; i < n - 1; i++) await qs.nth(i).getByRole('radio').nth(i % 3).check(); // leave the last one blank
  await expect(page.getByText(`${n - 1} of ${n} answered`)).toBeVisible();
  await page.screenshot(shot('quiz-paper'));
  await page.getByRole('button', { name: 'Submit quiz' }).click();

  await expect(page.locator('.quiz-score .feature-value')).toHaveText(/^\d+%$/);
  await expect(page.getByRole('heading', { name: 'By module' })).toBeVisible();
  await expect(page.getByText('Mock AI (fixture, not a real model)')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Where you are lacking' }).or(page.getByRole('heading', { name: 'What you did well' })).first()).toBeVisible({ timeout: 45_000 });
  await page.screenshot(shot('quiz-report'));

  await page.getByRole('link', { name: 'All quizzes & tracker' }).click();
  const card = page.locator('.quiz-card').filter({ hasText: 'Communication' });
  await expect(card.getByText(/Latest quiz · best \d+% · 1 taken/)).toBeVisible();
  await expect(page.getByRole('cell', { name: 'Communication' })).toBeVisible();
  await page.screenshot(shot('quiz-tracker'));
});
