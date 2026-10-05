// Browser journeys on synthetic data. AI = MOCK fixture provider (labeled "Mock AI" in the UI), not a live model.
import { expect, test, type Page } from '@playwright/test';
import { ID } from '../scripts/seed';

async function signIn(page: Page, handle: string) {
  await page.goto('/signin');
  await page.getByRole('button', { name: `Sign in as ${handle}`, exact: true }).click();
  await page.waitForURL('/');
}

test('scholarship: explain -> reviewed complaint -> receipt -> staff update', async ({ page }) => {
  await signIn(page, 'asha');
  await page.goto(`/fees/${ID.caseAsha}`);
  await expect(page.getByText('Approved or released funding is not money received')).toBeVisible();
  await page.getByRole('button', { name: 'Explain this status (AI)' }).click();
  await expect(page.getByText('Mock AI (fixture, not a real model)')).toBeVisible();
  await page.getByRole('link', { name: 'Review complaint draft' }).click();
  await expect(page.getByText('Nothing is sent until you press Submit')).toBeVisible();
  const body = page.getByLabel('Message');
  await body.fill((await body.inputValue()) + '\nEdited by the student in the browser test.');
  await page.getByRole('button', { name: 'Submit complaint' }).click();
  const banner = page.getByRole('status').filter({ hasText: 'Your receipt number is' });
  await expect(banner).toBeVisible();
  const receipt = (await banner.locator('strong').textContent())!;
  expect(receipt).toMatch(/^CMP-\d{4}-\d{6}$/);

  await page.getByRole('button', { name: 'Sign out' }).click();
  await page.waitForURL('/signin');
  await signIn(page, 'fin.a');
  await page.goto('/staff');
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
  await expect(page.getByText('no score is shown')).toBeVisible();
  await page.goto('/jobs');
  await page.locator('tbody a').first().click();
  await page.getByRole('button', { name: 'I applied (self-reported)' }).click();
  await expect(page.getByText('This is not confirmation from the employer')).toBeVisible();
});

test('access control and error states', async ({ page, request }) => {
  expect((await request.get('/api/v1/me')).status()).toBe(401);
  expect((await request.post('/api/v1/auth/demo', { headers: { origin: 'https://evil.example' }, data: { handle: 'asha' } })).status()).toBe(403);

  await page.goto('/signin');
  await page.getByRole('button', { name: 'Sign in as revoked.a' }).click();
  await expect(page.locator('.banner[role=alert]')).toContainText('no active membership');

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
  await expect(page.locator(':focus')).toHaveText('Overview');
  const outline = await page.locator(':focus').evaluate((el) => getComputedStyle(el).outlineStyle);
  expect(outline).not.toBe('none');
});
