// Browser journeys on synthetic data. AI = MOCK fixture provider (labeled "Mock AI" in the UI), not a live model.
import { expect, test } from '@playwright/test';
import { ID, LOGIN } from '../scripts/seed';
import { fillSignIn, signIn } from './sign-in';

test('scholarship: explain -> reviewed complaint -> receipt -> staff update', async ({ page }) => {
  await signIn(page, 'asha');
  await page.goto(`/fees/${ID.caseAsha}`);
  await expect(page.getByText('Approved or released funding is not money received')).toBeVisible();
  await page.getByRole('button', { name: 'Explain this status (AI)' }).click();
  await expect(page.getByText('Mock AI (fixture, not a real model)')).toBeVisible();
  await page.getByRole('link', { name: 'Review complaint draft' }).click();
  await expect(page.getByText('Nothing is sent until you press Submit')).toBeVisible();
  await page.screenshot({ path: '.data/ui-qa/final-desktop-complaint-review.png', fullPage: true, caret: 'initial' });
  const body = page.getByLabel('Message');
  await body.fill((await body.inputValue()) + '\nEdited by the student in the browser test.');
  await page.getByRole('button', { name: 'Submit complaint' }).click();
  const banner = page.getByRole('status').filter({ hasText: 'Your receipt number is' });
  await expect(banner).toBeVisible();
  await page.screenshot({ path: '.data/ui-qa/final-desktop-complaint-receipt.png', fullPage: true, caret: 'initial' });
  const receipt = (await banner.locator('strong').textContent())!;
  expect(receipt).toMatch(/^CMP-\d{4}-\d{6}$/);

  await page.getByRole('button', { name: 'Sign out' }).click();
  await page.waitForURL('/signin');
  await signIn(page, 'admin');
  await page.goto('/complaints');
  await page.screenshot({ path: '.data/ui-qa/final-desktop-staff.png', fullPage: true, caret: 'initial' });
  await page.getByRole('link', { name: receipt }).click();
  await page.getByLabel('Update status').selectOption('in_progress');
  await page.getByLabel('Note').fill('Checking the release batch');
  await page.getByRole('button', { name: 'Save' }).click();
  await expect(page.getByText('Checking the release batch')).toBeVisible();
});

test('learn: scoped tutor answer with sources, authorized download, paper filter', async ({ page }) => {
  await signIn(page, 'asha');
  await page.goto(`/learn?s=${ID.csDbms}`);
  await expect(page.getByRole('heading', { name: 'Materials' })).toBeVisible();
  await page.getByLabel('Your question').fill('What is normalization in databases?');
  await page.getByRole('button', { name: 'Ask', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Sources' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Points to remember' })).toBeVisible();
  await page.screenshot({ path: '.data/ui-qa/final-desktop-tutor-result.png', fullPage: true, caret: 'initial' });
  await expect(page.getByText('Mock AI (fixture, not a real model)')).toBeVisible();
  const dl = await page.request.get(`/api/v1/documents/${ID.docDbms}/download`);
  expect(dl.status()).toBe(200);
  expect(dl.headers()['content-disposition']).toContain('attachment');
  await page.getByLabel('Exam year').fill('2024');
  await page.getByRole('button', { name: 'Filter' }).click();
  await expect(page).toHaveURL(/year=2024/);
});

test('career + jobs: JD gap analysis, self-reported application', async ({ page }) => {
  await signIn(page, 'asha');
  await page.goto('/career');
  await page.getByLabel('Paste a job description').fill('Backend developer. Required: Python, SQL, Docker, Git and Linux experience.');
  await page.getByRole('button', { name: 'Analyse against my resume' }).click();
  await expect(page.getByRole('heading', { name: 'Gaps' })).toBeVisible();
  await page.screenshot({ path: '.data/ui-qa/final-desktop-career-result.png', fullPage: true, caret: 'initial' });
  await expect(page.getByText('no score is shown')).toBeVisible();
  await page.goto('/jobs');
  await page.locator('.job-card h2 a').first().click();
  await page.getByRole('button', { name: 'I applied (self-reported)' }).click();
  await expect(page.getByText('This is not confirmation from the employer')).toBeVisible();
});

test('access control and error states', async ({ page, request }) => {
  expect((await request.get('/api/v1/me')).status()).toBe(401);
  expect((await request.post('/api/v1/auth/password', { headers: { origin: 'https://evil.example' }, data: { portal: 'student', ...LOGIN.asha } })).status()).toBe(403);

  await fillSignIn(page, 'revoked');
  await expect(page.locator('.banner[role=alert]')).toContainText('no access');
  await page.getByRole('button', { name: 'Back' }).click();
  await page.getByRole('button', { name: /^Student/ }).click();
  await page.getByLabel('College email').fill(LOGIN.admin.email);
  await page.getByLabel('Password (your roll number)').fill(LOGIN.admin.password);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page.locator('.banner[role=alert]')).toContainText('staff account');

  await signIn(page, 'meera'); // college B student
  await page.goto(`/fees/${ID.caseAsha}`);
  await expect(page.getByText('was not found, or you do not have access')).toBeVisible();
  expect((await page.request.get(`/api/v1/documents/${ID.docDbms}/download`)).status()).toBe(404);
  await page.goto('/complaints/00000000-0000-4000-8000-999999999999');
  await expect(page.getByText('was not found, or you do not have access')).toBeVisible();

  await page.getByRole('button', { name: 'Sign out' }).click();
  await signIn(page, 'asha');
  await page.goto(`/learn?s=${ID.csDbms}`);
  await page.getByRole('button', { name: 'Ask', exact: true }).click(); // empty question
  await expect(page.locator('.banner[role=alert]')).toContainText('Invalid input');
});

test('keyboard: skip link first, nav reachable, focus visible', async ({ page }) => {
  await signIn(page, 'asha');
  await page.keyboard.press('Tab');
  await expect(page.locator(':focus')).toHaveText('Skip to content');
  await page.keyboard.press('Tab');
  await expect(page.locator(':focus')).toHaveAttribute('aria-label', 'College Problem Solver home');
  await page.keyboard.press('Tab');
  await expect(page.locator(':focus')).toContainText('Overview');
  const outline = await page.locator(':focus').evaluate((el) => getComputedStyle(el).outlineStyle);
  expect(outline).not.toBe('none');
});

test('admin raises a notice; it pops up on the student screen without a reload', async ({ browser }) => {
  const student = await (await browser.newContext()).newPage();
  await signIn(student, 'asha');
  const admin = await (await browser.newContext()).newPage();
  await signIn(admin, 'admin');
  await admin.getByLabel('Roll number, mobile number, email or name').fill(LOGIN.asha.password.toLowerCase());
  await admin.getByRole('button', { name: 'Find student' }).click();
  await admin.locator('a.person').first().click();
  await admin.getByRole('button', { name: 'Document verification pending' }).click();
  await admin.getByRole('button', { name: 'Send notice' }).click();
  await expect(admin.getByText('It pops up on')).toBeVisible();
  const toast = student.locator('.toast').filter({ hasText: 'Document verification pending' });
  await expect(toast).toBeVisible({ timeout: 15_000 });
  await toast.getByRole('button', { name: 'Got it' }).click();
  await expect(toast).toHaveCount(0);
});

test('placement cell sees who opened a drive but did not apply', async ({ browser }) => {
  const student = await (await browser.newContext()).newPage();
  await signIn(student, 'ravi');
  await student.goto('/jobs/00000000-0000-4000-8000-000000000303');
  const popup = student.waitForEvent('popup');
  await student.getByRole('button', { name: 'Open official application (external site)' }).click();
  await (await popup).close();
  const place = await (await browser.newContext()).newPage();
  await signIn(place, 'placement');
  await place.goto('/placement/jobs/00000000-0000-4000-8000-000000000303');
  await expect(place.locator('section').filter({ has: place.getByRole('heading', { name: /Opened, not applied/ }) })).toContainText('Ravi');
  await expect(place.getByRole('link', { name: 'Jobs' })).toHaveCount(0); // staff never get the student apply screens
});
