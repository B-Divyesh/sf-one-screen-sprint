import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const base = 'https://one-screen-sprint.sociobot.in';
const out = new URL('./', import.meta.url).pathname;
const videoDir = '/tmp/one-screen-sprint-verification-3-video';
await mkdir(videoDir, { recursive: true });

const results = {
  checkedAt: new Date().toISOString(),
  implementation: '64d2f15df3a821c268e7113e6c82d4f1b5a365f8',
  documentation: '7bb248e7ebdcf06cee29dac558d03d84906b89e4',
  firstScreen: {}, sample: {}, realMatch: {}, phone: {}, keyboard: {},
  routes: {}, accessibility: {}, privacy: {}, recovery: {}, offline: {},
  performance: {}, consoleErrors: [],
};

function watch(page, label) {
  page.on('pageerror', (error) => results.consoleErrors.push(`${label}: pageerror: ${String(error)}`));
  page.on('console', (message) => {
    if (message.type() === 'error') results.consoleErrors.push(`${label}: console: ${message.text()}`);
  });
}

async function enableAssist(page) {
  await page.getByRole('button', { name: 'Settings' }).click();
  const dialog = page.getByRole('dialog', { name: 'Game settings' });
  await dialog.getByRole('checkbox', { name: /Edge assist/ }).check();
  await dialog.getByRole('button', { name: 'Save settings' }).click();
}

async function finishRoundAsPlayerOne(page) {
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
      heading: document.querySelector('h1')?.textContent?.trim(),
      audience: document.querySelector('.audience')?.textContent?.trim(),
      action: document.querySelector('.primary-action')?.textContent?.trim(),
      actionNote: document.querySelector('.hero-actions span')?.textContent?.trim(),
      facts: [...document.querySelectorAll('.plain-facts li')].map((item) => item.textContent?.trim()),
      game: game ? { top: game.top, bottom: game.bottom, width: game.width, height: game.height } : null,
      viewport: { width: innerWidth, height: innerHeight },
    };
  });
}

const browser = await chromium.launch();

const sampleContext = await browser.newContext({
  viewport: { width: 1440, height: 1000 },
  recordVideo: { dir: videoDir, size: { width: 960, height: 720 } },
});
const samplePage = await sampleContext.newPage();
watch(samplePage, 'desktop-sample');
const requests = [];
samplePage.on('request', (request) => requests.push(request.url()));
assert.equal((await samplePage.goto(base, { waitUntil: 'networkidle' }))?.status(), 200);
const desktopFirst = await firstScreen(samplePage);
assert.equal(desktopFirst.scrollY, 0);
assert.equal(desktopFirst.heading, 'Race a friend on one keyboard');
assert.match(desktopFirst.audience ?? '', /^For two people together/);
assert.equal(desktopFirst.action, 'Try it with sample data');
assert.equal(desktopFirst.actionNote, 'Loads a fixed 1–1 rematch.');
assert.equal(desktopFirst.facts.length, 3);
assert.ok(desktopFirst.game && desktopFirst.game.top < desktopFirst.viewport.height);
await samplePage.screenshot({ path: `${out}desktop-first-screen.png` });
results.firstScreen.desktop = desktopFirst;

await samplePage.evaluate(() => localStorage.setItem(
  'one-screen-sprint:settings',
  JSON.stringify({ muted: true, effects: false, assist: false }),
));
const realBefore = await samplePage.evaluate(() => localStorage.getItem('one-screen-sprint:settings'));
await samplePage.getByRole('link', { name: 'Try it with sample data' }).click();
assert.equal(new URL(samplePage.url()).pathname, '/demo');
assert.equal(await samplePage.getByText('Demo — sample data, nothing is saved').isVisible(), true);
assert.equal(await samplePage.getByText('Weekend rematch · sample').isVisible(), true);
assert.equal(await samplePage.locator('#course-label').textContent(), 'Course CLUB-7');
assert.equal(await samplePage.locator('#score-one').textContent(), '1');
assert.equal(await samplePage.locator('#score-two').textContent(), '1');
await enableAssist(samplePage);
await samplePage.getByRole('button', { name: 'Start sample round' }).first().click();
await samplePage.locator('#race-canvas').focus();
const before = await samplePage.evaluate(() => ({
  p1: Number(document.querySelector('#progress-one')?.getAttribute('value')),
  p2: Number(document.querySelector('#progress-two')?.getAttribute('value')),
}));
await samplePage.keyboard.down('KeyD');
await samplePage.keyboard.down('ArrowRight');
await samplePage.waitForTimeout(3600);
await samplePage.keyboard.up('ArrowRight');
await samplePage.keyboard.up('KeyD');
const after = await samplePage.evaluate(() => ({
  p1: Number(document.querySelector('#progress-one')?.getAttribute('value')),
  p2: Number(document.querySelector('#progress-two')?.getAttribute('value')),
}));
assert.ok(after.p1 > before.p1 && after.p2 > before.p2);
await finishRoundAsPlayerOne(samplePage);
assert.equal(await samplePage.getByText('Demo — sample data, nothing is saved').isVisible(), true);
await samplePage.getByRole('button', { name: 'Start next round' }).click();
await finishRoundAsPlayerOne(samplePage);
assert.equal(await samplePage.locator('#game-overlay h2').textContent(), 'Player 1 wins 3–1');
assert.equal(await samplePage.getByText('Demo — sample data, nothing is saved').isVisible(), true);
await samplePage.screenshot({ path: `${out}sample-match-end.png`, fullPage: true });
await samplePage.getByRole('button', { name: 'Reset demo' }).click();
const reset = await samplePage.evaluate(() => ({
  score: [document.querySelector('#score-one')?.textContent, document.querySelector('#score-two')?.textContent],
  round: document.querySelector('#round-label')?.textContent,
  course: document.querySelector('#course-label')?.textContent,
}));
assert.deepEqual(reset, { score: ['1', '1'], round: 'Round 3 of 5', course: 'Course CLUB-7' });
assert.equal(await samplePage.evaluate(() => localStorage.getItem('one-screen-sprint:settings')), realBefore);
await samplePage.evaluate(() => history.back());
await samplePage.waitForURL(`${base}/`);
assert.deepEqual(await samplePage.evaluate(() => Object.keys(localStorage).filter((key) => key.startsWith('demo:'))), []);
assert.equal(await samplePage.evaluate(() => localStorage.getItem('one-screen-sprint:settings')), realBefore);
await samplePage.goForward();
await samplePage.waitForURL(`${base}/demo`);
assert.equal(await samplePage.locator('#course-label').textContent(), 'Course CLUB-7');
assert.equal(await samplePage.locator('#score-one').textContent(), '1');
assert.equal(await samplePage.locator('#score-two').textContent(), '1');
await samplePage.getByRole('link', { name: 'Start for real' }).click();
assert.deepEqual(await samplePage.evaluate(() => Object.keys(localStorage).filter((key) => key.startsWith('demo:'))), []);
assert.equal(await samplePage.evaluate(() => localStorage.getItem('one-screen-sprint:settings')), realBefore);
assert.deepEqual(requests.filter((raw) => new URL(raw).origin !== base), []);
const sampleVideo = samplePage.video();
await samplePage.close();
if (sampleVideo) await sampleVideo.saveAs(`${out}sample-match.webm`);
await sampleContext.close();
results.sample = {
  entry: { course: 'CLUB-7', score: [1, 1], round: 3 },
  simultaneousProgress: { before, after }, end: 'Player 1 wins 3–1',
  persistentLabel: true, reset, browserHistoryClearsDemo: true,
  startForRealClearsDemo: true, realDataUnchanged: true, crossOriginRequests: [],
};

const realContext = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
const realPage = await realContext.newPage();
watch(realPage, 'real-match');
await realPage.goto(base, { waitUntil: 'networkidle' });
const realCourse = await realPage.locator('#course-label').textContent();
await enableAssist(realPage);
await realPage.reload({ waitUntil: 'networkidle' });
await realPage.getByRole('button', { name: 'Settings' }).click();
assert.equal(await realPage.getByRole('checkbox', { name: /Edge assist/ }).isChecked(), true);
await realPage.getByRole('button', { name: 'Cancel' }).click();
await realPage.getByRole('button', { name: 'Start match' }).click();
for (let round = 0; round < 3; round += 1) {
  await finishRoundAsPlayerOne(realPage);
  if (round < 2) await realPage.getByRole('button', { name: 'Start next round' }).click();
}
assert.equal(await realPage.locator('#game-overlay h2').textContent(), 'Player 1 wins 3–0');
await realPage.screenshot({ path: `${out}real-match-end.png`, fullPage: true });
await realPage.getByRole('button', { name: 'Replay this course' }).click();
assert.equal(await realPage.locator('#course-label').textContent(), realCourse);
assert.equal(await realPage.locator('#score-one').textContent(), '0');
assert.equal(await realPage.locator('#score-two').textContent(), '0');
assert.equal(await realPage.locator('#round-label').textContent(), 'Round 1 of 5');
assert.equal(await realPage.locator('#time-left').textContent(), '75');
results.realMatch = {
  course: realCourse, end: 'Player 1 wins 3–0', settingsPersist: true,
  replayReset: { sameCourse: true, score: [0, 0], round: 1, time: 75 },
};
await realContext.close();

const phoneContext = await browser.newContext({
  viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2,
});
const phonePage = await phoneContext.newPage();
watch(phonePage, 'phone');
await phonePage.goto(base, { waitUntil: 'networkidle' });
const phoneFirst = await firstScreen(phonePage);
assert.equal(phoneFirst.scrollY, 0);
assert.equal(phoneFirst.heading, 'Race a friend on one keyboard');
assert.equal(phoneFirst.action, 'Try it with sample data');
assert.ok(phoneFirst.game && phoneFirst.game.top < phoneFirst.viewport.height);
await phonePage.screenshot({ path: `${out}phone-first-screen.png` });

const targetsByRoute = {};
for (const route of ['/', '/demo', '/privacy', '/terms', '/verification-3-missing']) {
  const response = await phonePage.goto(`${base}${route}`, { waitUntil: 'networkidle' });
  assert.equal(response?.status(), route.endsWith('missing') ? 404 : 200);
  const targets = await phonePage.locator('a[href], button, input:not([type="hidden"]), select, textarea').evaluateAll((elements) => (
    elements.flatMap((element) => {
      const rect = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      if (!rect.width || !rect.height || style.display === 'none' || style.visibility === 'hidden') return [];
      return [{
        name: element.getAttribute('aria-label') ?? element.textContent?.trim(),
        width: rect.width, height: rect.height,
        passes: rect.width >= 44 && rect.height >= 44,
      }];
    })
  ));
  assert.deepEqual(targets.filter((target) => !target.passes), []);
  targetsByRoute[route] = targets;
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
await phonePage.screenshot({ path: `${out}phone-text-200.png`, fullPage: true });
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
results.firstScreen.phone = phoneFirst;
results.phone = { targetsByRoute, typeSizes, resized, touchProgress: { before: touchStart, after: touchEnd } };
await phoneContext.close();

const routeContext = await browser.newContext({ viewport: { width: 1280, height: 900 }, reducedMotion: 'reduce' });
const routePage = await routeContext.newPage();
watch(routePage, 'routes');
const expectedRoutes = {
  '/': ['One Screen Sprint — Race on one keyboard', 'Race a friend on one keyboard'],
  '/demo': ['Demo — One Screen Sprint', 'Race a friend on one keyboard'],
  '/privacy': ['Privacy — One Screen Sprint', 'See what this game stores'],
  '/terms': ['Terms — One Screen Sprint', 'Play the game fairly and safely'],
};
for (const [route, [title, heading]] of Object.entries(expectedRoutes)) {
  const response = await routePage.goto(`${base}${route}`, { waitUntil: 'networkidle' });
  assert.equal(response?.status(), 200);
  assert.equal(await routePage.title(), title);
  assert.equal((await routePage.locator('h1').textContent())?.trim(), heading);
  assert.equal(await routePage.locator('h1').count(), 1);
  assert.equal(await routePage.locator('main').count(), 1);
  assert.equal(await routePage.locator('header').count(), 1);
  assert.equal(await routePage.locator('footer').count(), 1);
  const axe = await new AxeBuilder({ page: routePage }).analyze();
  assert.deepEqual(axe.violations, []);
  results.routes[route] = { status: 200, title, heading };
  results.accessibility[route] = { violations: 0 };
}

await routePage.goto(base, { waitUntil: 'networkidle' });
await routePage.keyboard.press('Tab');
assert.equal(await routePage.locator('.skip-link').evaluate((element) => element === document.activeElement), true);
const focusOutline = await routePage.locator('.skip-link').evaluate((element) => {
  const style = getComputedStyle(element);
  return { style: style.outlineStyle, width: style.outlineWidth, color: style.outlineColor };
});
assert.notEqual(focusOutline.style, 'none');
await routePage.getByRole('button', { name: 'Settings' }).focus();
await routePage.keyboard.press('Enter');
const dialog = routePage.getByRole('dialog', { name: 'Game settings' });
assert.equal(await dialog.isVisible(), true);
assert.equal(await dialog.evaluate((element) => element.matches(':modal')), true);
await routePage.keyboard.press('Escape');
assert.equal(await routePage.getByRole('button', { name: 'Settings' }).evaluate((element) => element === document.activeElement), true);
await routePage.getByRole('link', { name: 'Privacy' }).first().click();
assert.equal(await routePage.locator('h1').evaluate((element) => element === document.activeElement), true);
await routePage.goBack();
assert.equal(await routePage.locator('h1').evaluate((element) => element === document.activeElement), true);
assert.equal(await routePage.evaluate(() => matchMedia('(prefers-reduced-motion: reduce)').matches), true);
results.keyboard = { skipLink: true, focusOutline, modalKeyboard: true, modalFocusReturn: true, routeFocus: true };
results.accessibility.reducedMotion = true;

const linkResults = await routePage.evaluate(async () => {
  const hrefs = [...new Set([...document.querySelectorAll('a[href]')]
    .map((link) => link.href)
    .filter((href) => new URL(href).origin === location.origin))];
  return Promise.all(hrefs.map(async (href) => ({ href, status: (await fetch(href)).status })));
});
assert.deepEqual(linkResults.filter((item) => item.status !== 200), []);
results.routes.links = linkResults;

const missingPage = await routeContext.newPage();
watch(missingPage, '404');
const missingResponse = await missingPage.goto(`${base}/verification-3-missing`, { waitUntil: 'networkidle' });
assert.equal(missingResponse?.status(), 404);
assert.equal(await missingPage.title(), 'Page not found — One Screen Sprint');
assert.equal(await missingPage.locator('h1').count(), 1);
assert.equal(await missingPage.locator('main').count(), 1);
assert.deepEqual(await missingPage.getByRole('navigation', { name: 'Main navigation' }).getByRole('link').allTextContents(), ['Demo', 'How it works', 'Privacy']);
assert.match(await missingPage.locator('footer').innerText(), /Race a friend on one keyboard/);
assert.match(await missingPage.locator('footer').innerText(), /Built by Param Factory/);
assert.match(await missingPage.locator('footer').innerText(), /Version 1\.0\.0/);
const axe404 = await new AxeBuilder({ page: missingPage }).analyze();
assert.deepEqual(axe404.violations, []);
await missingPage.screenshot({ path: `${out}designed-404.png`, fullPage: true });
results.routes['404'] = { status: 404, title: await missingPage.title(), standardHeaderAndFooter: true };
results.accessibility['404'] = { violations: 0 };
await missingPage.close();

await routePage.goto(`${base}/demo`, { waitUntil: 'networkidle' });
await routePage.getByRole('button', { name: 'Start sample round' }).first().click();
await routePage.locator('#race-canvas').focus();
await routePage.keyboard.press('Escape');
assert.equal(await routePage.getByRole('heading', { name: 'Match paused' }).isVisible(), true);
await routePage.reload({ waitUntil: 'networkidle' });
assert.equal(await routePage.getByRole('heading', { name: 'Match paused' }).isVisible(), true);
await routePage.getByRole('button', { name: 'Resume match' }).click();
await routePage.locator('#game-overlay').waitFor({ state: 'hidden', timeout: 5_000 });
results.recovery.pausedReloadResume = true;

await routePage.evaluate(() => localStorage.setItem('one-screen-sprint:game', '{invalid json'));
await routePage.goto(base, { waitUntil: 'networkidle' });
assert.equal(await routePage.getByRole('button', { name: 'Start match' }).isVisible(), true);
results.recovery.invalidStorage = 'new playable match';
await routePage.evaluate(() => localStorage.setItem('one-screen-sprint:settings', JSON.stringify({ muted: true, effects: false, assist: true })));
await routePage.goto(`${base}/privacy`, { waitUntil: 'networkidle' });
routePage.once('dialog', (prompt) => prompt.accept());
await routePage.getByRole('button', { name: 'Clear saved game' }).click();
assert.equal(await routePage.getByRole('status').textContent(), 'Saved match and settings removed.');
assert.deepEqual(await routePage.evaluate(() => Object.keys(localStorage).filter((key) => key.startsWith('one-screen-sprint:'))), []);
results.privacy.clearRequest = true;
await routeContext.close();

const frameContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
const framePage = await frameContext.newPage();
const cdp = await frameContext.newCDPSession(framePage);
await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
await framePage.goto(`${base}/demo`, { waitUntil: 'networkidle' });
await framePage.getByRole('button', { name: 'Start sample round' }).first().click();
const frameRate = await framePage.evaluate(async () => {
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
assert.ok(frameRate.fps >= 55);
results.performance.frameRate = frameRate;
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
results.offline = { serviceWorker, ...offlineState };
await offlineContext.close();

results.consoleErrors = results.consoleErrors.filter((message) => !message.includes('status of 404'));
assert.deepEqual(results.consoleErrors, []);
await browser.close();
await writeFile(`${out}live-results.json`, `${JSON.stringify(results, null, 2)}\n`);
console.log(JSON.stringify(results, null, 2));
