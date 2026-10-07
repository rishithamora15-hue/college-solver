// Digital college journeys across roles, on synthetic data. Each step is what a real user clicks.
import { expect, test } from '@playwright/test';
import { ID } from '../scripts/seed';
import { signIn } from './sign-in';

const shot = (name: string) => ({ path: `.data/ui-qa/final-desktop-${name}.png`, fullPage: true, caret: 'initial' as const });

test('faculty marks attendance and publishes marks; the student sees both', async ({ browser }) => {
  const teacher = await (await browser.newContext()).newPage();
  await signIn(teacher, 'kavya');
  await teacher.screenshot(shot('faculty'));
  await teacher.getByRole('link', { name: /CS301 Database Management Systems/ }).first().click();
  await teacher.getByLabel('Period').selectOption('8');
  await teacher.getByRole('button', { name: 'Open' }).click();
  await teacher.getByRole('checkbox', { name: /Ravi/ }).uncheck(); // marks Ravi absent
  await expect(teacher.getByText('1 present')).toBeVisible();
  await teacher.getByRole('button', { name: 'Save attendance' }).click();
  await expect(teacher.getByText('Saved: 1 of 2 present.')).toBeVisible();
  await teacher.screenshot(shot('faculty-attendance'));
  await teacher.getByRole('link', { name: 'Marks' }).click();
  await teacher.getByLabel('New assessment').fill('Surprise test');
  await teacher.getByLabel('Max marks').fill('20');
  await teacher.getByRole('button', { name: 'Add', exact: true }).click();
  const card = teacher.locator('.marks-card').filter({ hasText: 'Surprise test' });
  await card.getByLabel('Marks for Asha').fill('18');
  await card.getByLabel('Marks for Ravi').fill('11');
  await card.getByRole('button', { name: 'Save & publish to students' }).click();
  await expect(card.getByText('Saved and published')).toBeVisible();

  const student = await (await browser.newContext()).newPage();
  await signIn(student, 'asha');
  await student.goto('/academics');
  await expect(student.getByText('Surprise test: 18 / 20')).toBeVisible();
  await expect(student.getByRole('heading', { name: 'Timetable' })).toBeVisible();
  await student.screenshot(shot('academics'));
});

test('student requests a certificate; the office approves; the student prints it', async ({ browser }) => {
  const student = await (await browser.newContext()).newPage();
  await signIn(student, 'asha');
  await student.goto('/requests');
  await student.getByRole('radio', { name: 'Bonafide certificate' }).click();
  await student.getByLabel(/Purpose/).fill('Education loan at the bank');
  await student.getByRole('button', { name: 'Send request' }).click();
  await expect(student.getByText('Request sent to the administration office')).toBeVisible();

  const admin = await (await browser.newContext()).newPage();
  await signIn(admin, 'admin');
  await admin.goto('/admin/requests');
  const req = admin.locator('.request-grid .card').filter({ hasText: 'Education loan at the bank' });
  await req.getByRole('button', { name: 'Approve' }).click();
  await expect(req).toHaveCount(0); // leaves the Pending list
  await admin.goto('/admin/requests?status=approved');
  await expect(admin.locator('.request-grid .card').filter({ hasText: 'Education loan at the bank' })).toBeVisible();
  await admin.screenshot(shot('admin-requests'));

  await expect(student.locator('.toast').filter({ hasText: 'Bonafide certificate approved' })).toBeVisible({ timeout: 15_000 });
  await student.goto('/requests');
  await student.getByRole('link', { name: 'View certificate' }).first().click();
  await expect(student.getByText('This is to certify that Asha')).toBeVisible();
  await student.screenshot(shot('certificate'));
});

test('office records a payment; the student gets a receipt; ineligible drive is blocked; rounds reach the student', async ({ browser }) => {
  test.slow(); // four signed-in actors; first-visit dev compiles alone take ~60 s of the 90 s default
  const admin = await (await browser.newContext()).newPage();
  await signIn(admin, 'admin');
  await admin.goto(`/admin/students/${ID.ashaStudent}`);
  await admin.getByRole('button', { name: 'Cash' }).click();
  await admin.getByLabel('Amount (INR)').first().fill('5,000');
  await admin.getByRole('button', { name: 'Record payment' }).click();
  await admin.getByRole('link', { name: 'open receipt' }).click();
  await expect(admin.getByRole('heading', { name: /^RCPT-/ })).toBeVisible();
  await admin.screenshot(shot('receipt'));
  await admin.goto('/admin/students');
  await admin.screenshot(shot('admin-students'));

  const asha = await (await browser.newContext()).newPage();
  await signIn(asha, 'asha');
  await asha.goto('/fees');
  await expect(asha.getByRole('link', { name: 'Receipt' }).first()).toBeVisible();

  const ravi = await (await browser.newContext()).newPage();
  await signIn(ravi, 'ravi');
  await ravi.goto('/jobs/00000000-0000-4000-8000-000000000310');
  await expect(ravi.getByText('You are not eligible for this drive')).toBeVisible();
  await expect(ravi.getByRole('button', { name: 'I applied (self-reported)' })).toHaveCount(0);

  await asha.goto('/jobs/00000000-0000-4000-8000-000000000310');
  await asha.getByRole('button', { name: 'I applied (self-reported)' }).click();
  const place = await (await browser.newContext()).newPage();
  await signIn(place, 'placement');
  await place.goto('/placement/jobs/00000000-0000-4000-8000-000000000310');
  await expect(place.getByText('CGPA 7+ required')).toBeVisible(); // Ravi listed as not eligible, with the reason
  await place.getByLabel('Interview round').selectOption('shortlisted');
  await expect(asha.locator('.toast').filter({ hasText: 'Shortlisted' })).toBeVisible({ timeout: 15_000 });
  await place.screenshot(shot('placement-rounds'));
  await place.goto('/placement/stats');
  await place.screenshot(shot('placement-stats'));
});
