// The administration office enters real college structure through the UI: branch, syllabus, staff account.
import { expect, test } from '@playwright/test';
import { signIn } from './sign-in';

test('admin adds a branch with its syllabus and creates a staff account from College setup', async ({ page }) => {
  await signIn(page, 'admin');
  await page.getByRole('navigation', { name: 'Primary' }).getByRole('link', { name: 'College setup' }).click();
  await expect(page.getByRole('heading', { name: 'College setup', level: 1 })).toBeVisible();

  const add = page.locator('section').filter({ has: page.getByRole('heading', { name: 'Add a branch' }) });
  await add.getByLabel('Code').fill('MECH');
  await add.getByLabel('Name').fill('Mechanical Engineering');
  await add.getByLabel('Regulation (syllabus)').fill('R24');
  await add.getByRole('button', { name: 'Add branch' }).click();
  await expect(add.getByText('Branch added.')).toBeVisible();
  await page.getByRole('link', { name: /R24 · 0 students/ }).click();
  await expect(page.getByRole('heading', { name: 'Syllabus: MECH · R24' })).toBeVisible();

  const sub = page.locator('section').filter({ has: page.getByRole('heading', { name: 'Add a subject' }) });
  await sub.getByLabel('Semester').selectOption('3');
  await sub.getByLabel('Subject code').fill('ME301');
  await sub.getByLabel('Subject name').fill('Thermodynamics');
  await sub.getByLabel('Topics (optional)').fill('Laws of thermodynamics\nEntropy');
  await sub.getByRole('button', { name: 'Add subject' }).click();
  await expect(page.getByText('Sem 3 · ME301 Thermodynamics')).toBeVisible();
  await expect(page.getByText('Laws of thermodynamics, Entropy')).toBeVisible();
  await page.screenshot({ path: '.data/ui-qa/final-desktop-admin-setup.png', fullPage: true, caret: 'initial' });

  await page.getByRole('navigation', { name: 'Setup sections' }).getByRole('link', { name: 'Staff accounts' }).click();
  const staff = page.locator('section').filter({ has: page.getByRole('heading', { name: 'Create a staff account' }) });
  await staff.getByLabel('Full name').fill('Placement Officer Two');
  await staff.getByLabel('Email').fill('placement2@college-a.example');
  await staff.getByLabel('Role').selectOption('placement');
  await staff.getByLabel('Temporary password').fill('Temporary-2026');
  await staff.getByRole('button', { name: 'Create account' }).click();
  await expect(page.getByText('Placement Officer Two')).toBeVisible();
});
