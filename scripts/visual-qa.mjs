// Capture synthetic demo screens from an already running local app.
// Usage: node scripts/visual-qa.mjs [base URL]
import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';

const origin = process.argv[2] ?? 'http://localhost:3000';
const out = '.data/ui-qa';
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ channel: 'msedge' });
try {
  for (const spec of [
    { name: 'desktop', width: 1280, height: 800, reducedMotion: 'no-preference' },
    { name: 'tablet', width: 768, height: 1024, reducedMotion: 'no-preference' },
    { name: 'mobile', width: 390, height: 844, reducedMotion: 'no-preference' },
    { name: 'reduced', width: 1280, height: 800, reducedMotion: 'reduce' },
  ]) {
    const context = await browser.newContext({ viewport: { width: spec.width, height: spec.height }, reducedMotion: spec.reducedMotion });
    const page = await context.newPage();
    await page.goto(`${origin}/signin`, { waitUntil: 'networkidle' });
    await page.screenshot({ path: `${out}/${spec.name}-signin.png`, fullPage: true, caret: 'initial' });
    await page.getByRole('button', { name: /^Student/ }).click();
    await page.getByLabel('College email').fill('asha@college-a.example'); // synthetic seed account
    await page.getByLabel('Password (your roll number)').fill('22A91A0501');
    await page.getByRole('button', { name: 'Sign in', exact: true }).click();
    await page.waitForURL(origin + '/');
    for (const path of ['/', '/fees', '/learn', '/career', '/jobs']) {
      await page.goto(`${origin}${path}`, { waitUntil: 'networkidle' });
      const slug = path === '/' ? 'overview' : path.slice(1);
      await page.screenshot({ path: `${out}/${spec.name}-${slug}.png`, fullPage: true, caret: 'initial' });
      const [scrollWidth, innerWidth] = await page.evaluate(() => [document.documentElement.scrollWidth, window.innerWidth]);
      if (scrollWidth > innerWidth + 1) throw new Error(`${spec.name} ${path} overflows: ${scrollWidth} > ${innerWidth}`);
    }
    console.log(`${spec.name}: 6 captures; no page overflow`);
    await context.close();
  }
} finally {
  await browser.close();
}
