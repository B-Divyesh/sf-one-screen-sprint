import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
import { chromium } from '@playwright/test';

const base = 'https://one-screen-sprint.sociobot.in';
const out = new URL('./', import.meta.url).pathname;
const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
const page = await context.newPage();
const errors = [];
page.on('pageerror', (error) => errors.push(String(error)));
page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });

await page.goto(base, { waitUntil: 'networkidle' });
await page.keyboard.press('Tab');
const skip = await page.evaluate(() => {
  const active = document.activeElement;
  const style = active ? getComputedStyle(active) : null;
  return {
    text: active?.textContent?.trim(),
    outlineStyle: style?.outlineStyle,
    outlineWidth: style?.outlineWidth,
    outlineColor: style?.outlineColor,
  };
});
assert.equal(skip.text, 'Skip to game and page content');
assert.notEqual(skip.outlineStyle, 'none');
assert.notEqual(skip.outlineWidth, '0px');
await page.screenshot({ path: `${out}phone-focus.png` });
await page.keyboard.press('Enter');
assert.equal(new URL(page.url()).hash, '#main');

const settings = page.getByRole('button', { name: 'Settings' });
await settings.focus();
await page.keyboard.press('Enter');
const dialog = page.getByRole('dialog', { name: 'Game settings' });
assert.equal(await dialog.isVisible(), true);
const dialogFocusSequence = [];
for (let index = 0; index < 8; index += 1) {
  await page.keyboard.press('Tab');
  const focus = await page.evaluate(() => ({
    tag: document.activeElement?.tagName,
    text: document.activeElement?.textContent?.trim().slice(0, 60),
    inDialog: Boolean(document.activeElement?.closest('dialog')),
    outsideInteractive: Boolean(!document.activeElement?.closest('dialog') && document.activeElement?.matches('a,button,input,select,textarea,[tabindex]:not([tabindex="-1"])')),
  }));
  assert.equal(focus.outsideInteractive, false);
  dialogFocusSequence.push(focus);
}
await page.keyboard.press('Escape');
assert.equal(await dialog.isVisible(), false);
assert.equal(await settings.evaluate((element) => element === document.activeElement), true);

await page.goto(base, { waitUntil: 'networkidle' });
await page.evaluate(() => { document.documentElement.style.fontSize = '200%'; });
await page.waitForTimeout(100);
const resized = await page.evaluate(() => ({
  clientWidth: document.documentElement.clientWidth,
  scrollWidth: document.documentElement.scrollWidth,
  actionVisible: Boolean(document.querySelector('.primary-action')?.getClientRects().length),
  canvasVisible: Boolean(document.querySelector('#race-canvas')?.getClientRects().length),
}));
assert.ok(resized.scrollWidth <= resized.clientWidth + 1);
assert.equal(resized.actionVisible, true);
assert.equal(resized.canvasVisible, true);
await page.screenshot({ path: `${out}phone-text-200.png`, fullPage: true });

assert.deepEqual(errors, []);
const report = { checkedAt: new Date().toISOString(), skip, dialogKeyboardTrap: true, dialogFocusSequence, dialogFocusRestored: true, resized, reducedMotion: await page.evaluate(() => matchMedia('(prefers-reduced-motion: reduce)').matches), errors };
await writeFile(`${out}accessibility-extra.json`, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));
await context.close();
await browser.close();
