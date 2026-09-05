import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const base = 'https://one-screen-sprint.sociobot.in';
const out = new URL('./', import.meta.url).pathname;
const videoTemp = '/tmp/one-screen-sprint-repair-2-video';
await mkdir(videoTemp, { recursive: true });
const result = {
  checkedAt: new Date().toISOString(),
  implementation: '64d2f15df3a821c268e7113e6c82d4f1b5a365f8',
  desktop: {},
  sample: {},
  realMatch: {},
  phone: {},
  routes: {},
  accessibility: {},
  offline: {},
  consoleErrors: [],
};

function watch(page, label) {
  page.on('pageerror', (error) => result.consoleErrors.push(`${label}: pageerror: ${String(error)}`));
  page.on('console', (message) => {
    if (message.type() === 'error') result.consoleErrors.push(`${label}: console: ${message.text()}`);
  });
}

async function enableAssist(page) {
  await page.getByRole('button', { name: 'Settings' }).click();
  const dialog = page.getByRole('dialog', { name: 'Game settings' });
  await dialog.getByRole('checkbox', { name: /Edge assist/ }).check();
  await dialog.getByRole('button', { name: 'Save settings' }).click();
}

async function racePlayerOne(page) {
  await page.locator('#race-canvas').focus();
  await page.keyboard.down('KeyD');
  await page.keyboard.down('KeyS');
  try {
    await page.waitForFunction(
      () => /^Player 1 wins (round|3)/.test(document.querySelector('#game-overlay h2')?.textContent ?? ''),
      null,
      { timeout: 20_000 },
    );
  } finally {
    await page.keyboard.up('KeyS');
    await page.keyboard.up('KeyD');
  }
}

async function firstScreen(page) {
  return page.evaluate(() => {
    const game = document.querySelector('.canvas-stage')?.getBoundingClientRect();
    return {
      scrollY,
      title: document.title,
      h1: document.querySelector('h1')?.textContent?.trim(),
      audience: document.querySelector('.audience')?.textContent?.trim(),
      action: document.querySelector('.primary-action')?.textContent?.trim(),
      facts: [...document.querySelectorAll('.plain-facts li')].map((item) => item.textContent?.trim()),
      game: game ? { top: game.top, bottom: game.bottom, width: game.width, height: game.height } : null,
      viewport: { width: innerWidth, height: innerHeight },
    };
  });
}

const browser = await chromium.launch();

const desktopContext = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
const desktopPage = await desktopContext.newPage();
watch(desktopPage, 'desktop');
const requests = [];
desktopPage.on('request', (request) => requests.push(request.url()));
assert.equal((await desktopPage.goto(base, { waitUntil: 'networkidle' }))?.status(), 200);
const desktopFirst = await firstScreen(desktopPage);
assert.equal(desktopFirst.scrollY, 0);
assert.equal(desktopFirst.h1, 'Race a friend on one keyboard');
assert.equal(desktopFirst.action, 'Try it with sample data');
assert.equal(desktopFirst.facts.length, 3);
assert.ok(desktopFirst.game && desktopFirst.game.top < desktopFirst.viewport.height);
await desktopPage.screenshot({ path: `${out}live-desktop-cold.png` });
result.desktop = { firstScreen: desktopFirst };

await desktopPage.evaluate(() => localStorage.setItem(
  'one-screen-sprint:settings',
  JSON.stringify({ muted: true, effects: false, assist: false }),
));
const realBefore = await desktopPage.evaluate(() => localStorage.getItem('one-screen-sprint:settings'));
await desktopPage.getByRole('link', { name: 'Try it with sample data' }).click();
assert.equal(new URL(desktopPage.url()).pathname, '/demo');
assert.equal(await desktopPage.getByText('Demo — sample data, nothing is saved').isVisible(), true);
assert.equal(await desktopPage.locator('#course-label').textContent(), 'Course CLUB-7');
assert.equal(await desktopPage.locator('#score-one').textContent(), '1');
assert.equal(await desktopPage.locator('#score-two').textContent(), '1');
await enableAssist(desktopPage);
await desktopPage.getByRole('button', { name: 'Start sample round' }).first().click();
await desktopPage.locator('#race-canvas').focus();
const before = await desktopPage.evaluate(() => ({
  p1: Number(document.querySelector('#progress-one')?.getAttribute('value')),
  p2: Number(document.querySelector('#progress-two')?.getAttribute('value')),
}));
await desktopPage.keyboard.down('KeyD');
await desktopPage.keyboard.down('ArrowRight');
await desktopPage.waitForTimeout(3600);
await desktopPage.keyboard.up('ArrowRight');
await desktopPage.keyboard.up('KeyD');
const after = await desktopPage.evaluate(() => ({
  p1: Number(document.querySelector('#progress-one')?.getAttribute('value')),
  p2: Number(document.querySelector('#progress-two')?.getAttribute('value')),
}));
assert.ok(after.p1 > before.p1 && after.p2 > before.p2);
await racePlayerOne(desktopPage);
await desktopPage.getByRole('button', { name: 'Start next round' }).click();
await racePlayerOne(desktopPage);
assert.equal(await desktopPage.locator('#game-overlay h2').textContent(), 'Player 1 wins 3–1');
assert.equal(await desktopPage.getByText('Demo — sample data, nothing is saved').isVisible(), true);
await desktopPage.screenshot({ path: `${out}live-sample-end.png`, fullPage: true });
await desktopPage.getByRole('button', { name: 'Reset demo' }).click();
const reset = await desktopPage.evaluate(() => ({
  score: [document.querySelector('#score-one')?.textContent, document.querySelector('#score-two')?.textContent],
  round: document.querySelector('#round-label')?.textContent,
  course: document.querySelector('#course-label')?.textContent,
}));
assert.deepEqual(reset, { score: ['1', '1'], round: 'Round 3 of 5', course: 'Course CLUB-7' });
assert.equal(await desktopPage.evaluate(() => localStorage.getItem('one-screen-sprint:settings')), realBefore);
await desktopPage.getByRole('link', { name: 'Start for real' }).click();
assert.equal(await desktopPage.evaluate(() => localStorage.getItem('one-screen-sprint:settings')), realBefore);
assert.deepEqual(await desktopPage.evaluate(() => Object.keys(localStorage).filter((key) => key.startsWith('demo:'))), []);
result.sample = { simultaneousProgress: { before, after }, end: 'Player 1 wins 3–1', reset, realDataUnchanged: true };
assert.deepEqual(requests.filter((raw) => new URL(raw).origin !== base), []);
await desktopContext.close();

const realContext = await browser.newContext({
  viewport: { width: 1440, height: 1000 },
  recordVideo: { dir: videoTemp, size: { width: 960, height: 720 } },
});
const realPage = await realContext.newPage();
watch(realPage, 'real');
await realPage.goto(base, { waitUntil: 'networkidle' });
const realCourse = await realPage.locator('#course-label').textContent();
await enableAssist(realPage);
await realPage.getByRole('button', { name: 'Start match' }).click();
for (let round = 0; round < 3; round += 1) {
  await racePlayerOne(realPage);
  if (round < 2) await realPage.getByRole('button', { name: 'Start next round' }).click();
}
assert.equal(await realPage.locator('#game-overlay h2').textContent(), 'Player 1 wins 3–0');
await realPage.screenshot({ path: `${out}live-real-match-end.png`, fullPage: true });
const video = realPage.video();
await realPage.close();
if (video) await video.saveAs(`${out}live-real-match.webm`);
await realContext.close();
result.realMatch = { course: realCourse, end: 'Player 1 wins 3–0' };

const phoneContext = await browser.newContext({
  viewport: { width: 390, height: 844 },
  isMobile: true,
  hasTouch: true,
  deviceScaleFactor: 2,
});
const phonePage = await phoneContext.newPage();
watch(phonePage, 'phone');
await phonePage.goto(base, { waitUntil: 'networkidle' });
const phoneFirst = await firstScreen(phonePage);
assert.equal(phoneFirst.h1, 'Race a friend on one keyboard');
assert.equal(phoneFirst.action, 'Try it with sample data');
assert.ok(phoneFirst.game && phoneFirst.game.top < phoneFirst.viewport.height);
await phonePage.screenshot({ path: `${out}live-phone-cold.png` });

const targetResults = {};
for (const route of ['/', '/demo', '/privacy', '/terms', '/repair-2-missing']) {
  const response = await phonePage.goto(`${base}${route}`, { waitUntil: 'networkidle' });
  assert.equal(response?.status(), route === '/repair-2-missing' ? 404 : 200);
  const targets = await phonePage.locator('a[href], button, input:not([type="hidden"]), select, textarea').evaluateAll((elements) => (
    elements.flatMap((element) => {
      const rect = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      if (rect.width === 0 || rect.height === 0 || style.display === 'none' || style.visibility === 'hidden') return [];
      return [{
        name: element.getAttribute('aria-label') ?? element.textContent?.trim(),
        width: rect.width,
        height: rect.height,
        passes: rect.width >= 44 && rect.height >= 44,
      }];
    })
  ));
  assert.deepEqual(targets.filter((target) => !target.passes), []);
  targetResults[route] = targets;
}

await phonePage.goto(base, { waitUntil: 'networkidle' });
const typeSizes = await phonePage.evaluate(() => Object.fromEntries(
  ['.audience', '.hero-actions span', '.plain-facts', '.game-foot', '.site-footer', '.site-header nav a', 'button']
    .map((selector) => [selector, Math.min(...[...document.querySelectorAll(selector)]
      .filter((element) => element.getClientRects().length > 0)
      .map((element) => Number.parseFloat(getComputedStyle(element).fontSize)))]),
));
assert.deepEqual(Object.values(typeSizes).filter((size) => size < 17), []);
await phonePage.evaluate(() => { document.documentElement.style.fontSize = '200%'; });
const resized = await phonePage.evaluate(() => ({
  clientWidth: document.documentElement.clientWidth,
  scrollWidth: document.documentElement.scrollWidth,
  actionVisible: Boolean(document.querySelector('.primary-action')?.getClientRects().length),
  canvasVisible: Boolean(document.querySelector('#race-canvas')?.getClientRects().length),
}));
assert.ok(resized.scrollWidth <= resized.clientWidth + 1 && resized.actionVisible && resized.canvasVisible);
await phonePage.screenshot({ path: `${out}live-phone-text-200.png`, fullPage: true });
await phonePage.evaluate(() => { document.documentElement.style.fontSize = ''; });
await phonePage.goto(`${base}/demo`, { waitUntil: 'networkidle' });
await enableAssist(phonePage);
await phonePage.getByRole('button', { name: 'Start sample round' }).first().click();
const touch = phonePage.locator('[data-player="0"][data-control="right"]');
const touchStart = Number(await phonePage.locator('#progress-one').getAttribute('value'));
await touch.dispatchEvent('pointerdown', { pointerId: 1, pointerType: 'touch' });
await phonePage.waitForTimeout(3400);
await touch.dispatchEvent('pointerup', { pointerId: 1, pointerType: 'touch' });
const touchEnd = Number(await phonePage.locator('#progress-one').getAttribute('value'));
assert.ok(touchEnd > touchStart);
result.phone = { firstScreen: phoneFirst, targets: targetResults, typeSizes, resized, touchProgress: { before: touchStart, after: touchEnd } };
await phoneContext.close();

const routeContext = await browser.newContext({ viewport: { width: 1280, height: 900 }, reducedMotion: 'reduce' });
const routePage = await routeContext.newPage();
watch(routePage, 'routes');
const expected = {
  '/': ['One Screen Sprint — Race on one keyboard', 'Race a friend on one keyboard'],
  '/demo': ['Demo — One Screen Sprint', 'Race a friend on one keyboard'],
  '/privacy': ['Privacy — One Screen Sprint', 'See what this game stores'],
  '/terms': ['Terms — One Screen Sprint', 'Play the game fairly and safely'],
};
for (const [route, [title, heading]] of Object.entries(expected)) {
  assert.equal((await routePage.goto(`${base}${route}`, { waitUntil: 'networkidle' }))?.status(), 200);
  assert.equal(await routePage.title(), title);
  assert.equal((await routePage.locator('h1').textContent())?.trim(), heading);
  assert.equal(await routePage.locator('h1').count(), 1);
  assert.equal(await routePage.locator('main').count(), 1);
  const axe = await new AxeBuilder({ page: routePage }).analyze();
  assert.deepEqual(axe.violations.filter((violation) => ['serious', 'critical'].includes(violation.impact ?? '')), []);
  result.routes[route] = { status: 200, title, heading };
  result.accessibility[route] = { violations: axe.violations.length };
}
const missingPage = await routeContext.newPage();
const missingResponse = await missingPage.goto(`${base}/repair-2-missing`, { waitUntil: 'networkidle' });
assert.equal(missingResponse?.status(), 404);
assert.deepEqual(await missingPage.getByRole('navigation', { name: 'Main navigation' }).getByRole('link').allTextContents(), ['Demo', 'How it works', 'Privacy']);
assert.match(await missingPage.locator('footer').innerText(), /Built by Param Factory/);
const axe404 = await new AxeBuilder({ page: missingPage }).analyze();
assert.deepEqual(axe404.violations.filter((violation) => ['serious', 'critical'].includes(violation.impact ?? '')), []);
await missingPage.screenshot({ path: `${out}live-404.png`, fullPage: true });
result.routes['404'] = { status: 404, title: await missingPage.title(), standardHeaderAndFooter: true };
result.accessibility['404'] = { violations: axe404.violations.length };
await missingPage.close();
assert.equal(await routePage.evaluate(() => matchMedia('(prefers-reduced-motion: reduce)').matches), true);
await routeContext.close();

const frameContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
const framePage = await frameContext.newPage();
const session = await frameContext.newCDPSession(framePage);
await session.send('Emulation.setCPUThrottlingRate', { rate: 4 });
await framePage.goto(`${base}/demo`, { waitUntil: 'networkidle' });
await framePage.getByRole('button', { name: 'Start sample round' }).first().click();
const frames = await framePage.evaluate(async () => {
  const intervals = [];
  let last = performance.now();
  await new Promise((resolve) => {
    const frame = (now) => {
      intervals.push(now - last);
      last = now;
      if (intervals.length >= 90) resolve();
      else requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  });
  intervals.shift();
  intervals.sort((a, b) => a - b);
  const medianMs = intervals[Math.floor(intervals.length / 2)];
  return { sampleCount: intervals.length, medianMs, fps: 1000 / medianMs };
});
assert.ok(frames.fps >= 55);
result.phone.frameRate = frames;
await frameContext.close();

const offlineContext = await browser.newContext();
const offlinePage = await offlineContext.newPage();
await offlinePage.goto(`${base}/demo`, { waitUntil: 'networkidle' });
const serviceWorker = await offlinePage.evaluate(async () => {
  const registration = await navigator.serviceWorker.ready;
  await registration.update();
  return { active: Boolean(registration.active), scope: registration.scope };
});
await offlinePage.reload({ waitUntil: 'networkidle' });
await offlineContext.setOffline(true);
await offlinePage.reload({ waitUntil: 'domcontentloaded' });
const offlineState = {
  bannerVisible: await offlinePage.getByText('Demo — sample data, nothing is saved').isVisible(),
  canvasVisible: await offlinePage.locator('#race-canvas').isVisible(),
};
assert.equal(serviceWorker.active && offlineState.bannerVisible && offlineState.canvasVisible, true);
result.offline = { serviceWorker, ...offlineState };
await offlineContext.close();

result.consoleErrors = result.consoleErrors.filter((message) => !message.includes('status of 404'));
assert.deepEqual(result.consoleErrors, []);
await browser.close();
await writeFile(`${out}live-results.json`, `${JSON.stringify(result, null, 2)}\n`);
console.log(JSON.stringify(result, null, 2));
