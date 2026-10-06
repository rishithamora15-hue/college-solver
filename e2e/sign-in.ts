import type { Page } from '@playwright/test';
import { LOGIN } from '../scripts/seed';

export type Who = keyof typeof LOGIN;
const STUDENTS: Who[] = ['asha', 'ravi', 'meera'];

/** Fills the two-portal sign-in form. Does not wait for navigation, so failures can be asserted. */
export async function fillSignIn(page: Page, who: Who) {
  const student = STUDENTS.includes(who);
  await page.goto('/signin');
  await page.getByRole('button', { name: student ? /^Student/ : /^Faculty & Staff/ }).click();
  await page.getByLabel(student ? 'College email' : 'Staff email').fill(LOGIN[who].email);
  await page.getByLabel(student ? 'Password (your roll number)' : 'Password', { exact: true }).fill(LOGIN[who].password);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
}

export async function signIn(page: Page, who: Who) {
  await fillSignIn(page, who);
  await page.waitForURL(STUDENTS.includes(who) ? '/' : /\/(admin|placement|faculty)$/);
}
