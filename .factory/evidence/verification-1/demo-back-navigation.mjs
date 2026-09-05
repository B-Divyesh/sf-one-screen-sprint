import { chromium } from '@playwright/test';
import { writeFile } from 'node:fs/promises';

const base = 'https://one-screen-sprint.sociobot.in';
const out = new URL('./', import.meta.url).pathname;
const browser = await chromium.launch();
const context = await browser.newContext();
const page = await context.newPage();

await page.goto(base, { waitUntil: 'networkidle' });
await page.getByRole('link', { name: 'Try it with sample data' }).click();
await page.getByText('Demo — sample data, nothing is saved').waitFor();
await page.getByRole('button', { name: 'Settings' }).click();
await page.getByRole('checkbox', { name: /Mute sound/ }).check();
await page.getByRole('button', { name: 'Save settings' }).click();
const beforeBack = await page.evaluate(() => Object.keys(localStorage).filter((key) => key.startsWith('demo:one-screen-sprint:')).sort());

await page.goBack();
await page.getByRole('heading', { name: 'Race a friend on one keyboard' }).waitFor();
const afterBack = await page.evaluate(() => Object.keys(localStorage).filter((key) => key.startsWith('demo:one-screen-sprint:')).sort());

await page.goForward();
await page.getByText('Demo — sample data, nothing is saved').waitFor();
await page.getByRole('button', { name: 'Settings' }).click();
const restoredMute = await page.getByRole('checkbox', { name: /Mute sound/ }).isChecked();
await page.keyboard.press('Escape');

const report = {
  checkedAt: new Date().toISOString(),
  beforeBack,
  routeAfterBack: '/',
  afterBack,
  restoredMuteAfterForward: restoredMute,
  expected: 'Leaving demo mode discards demo data.',
  passed: afterBack.length === 0 && !restoredMute,
};
await writeFile(`${out}demo-back-navigation.json`, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));
await context.close();
await browser.close();
process.exit(report.passed ? 0 : 1);
