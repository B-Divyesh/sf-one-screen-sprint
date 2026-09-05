import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const base = 'https://one-screen-sprint.sociobot.in';
const out = new URL('./', import.meta.url).pathname;
await mkdir(out, { recursive: true });

const result = {
  checkedAt: new Date().toISOString(),
  base,
  desktop: {},
  realMatch: {},
  phone: {},
  offline: {},
  routes: {},
  accessibility: {},
  links: {},
  consoleErrors: [],
};

function watch(page, label) {
  page.on('pageerror', (error) => result.consoleErrors.push(`${label}: pageerror: ${String(error)}`));
  page.on('console', (message) => {
    if (message.type() === 'error') result.consoleErrors.push(`${label}: console: ${message.text()}`);
  });
}

async function enableAssist(page) {
  const trigger = page.getByRole('button', { name: 'Settings' });
  await trigger.click();
  const dialog = page.getByRole('dialog', { name: 'Game settings' });
  await dialog.waitFor();
  const initialFocus = await page.evaluate(() => document.activeElement?.getAttribute('name') ?? document.activeElement?.textContent?.trim());
  await dialog.getByRole('checkbox', { name: /Edge assist/ }).check();
  await dialog.getByRole('button', { name: 'Save settings' }).click();
  const returnedFocus = await page.evaluate(() => document.activeElement?.textContent?.trim());
  return { initialFocus, returnedFocus };
}

async function racePlayerOne(page) {
  await page.locator('#race-canvas').focus();
  await page.keyboard.down('KeyD');
  await page.keyboard.down('KeyS');
  try {
    await page.waitForFunction(() => /^Player 1 wins (round|3)/.test(document.querySelector('#game-overlay h2')?.textContent ?? ''), null, { timeout: 20_000 });
  } finally {
    await page.keyboard.up('KeyS');
    await page.keyboard.up('KeyD');
  }
}

const browser = await chromium.launch();

// Fresh desktop browser: first screen, one-click demo, both keyboard players,
// complete deterministic sample, reset, and sandbox isolation.
const desktopContext = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
const desktopPage = await desktopContext.newPage();
watch(desktopPage, 'desktop');
const desktopRequests = [];
desktopPage.on('request', (request) => desktopRequests.push(request.url()));
const desktopResponse = await desktopPage.goto(base, { waitUntil: 'networkidle' });
assert.equal(desktopResponse?.status(), 200);
const desktopFirst = await desktopPage.evaluate(() => {
  const canvas = document.querySelector('#race-canvas')?.getBoundingClientRect();
  return {
    scrollY,
    title: document.title,
    h1: document.querySelector('h1')?.textContent?.trim(),
    audience: document.querySelector('.audience')?.textContent?.trim(),
    action: document.querySelector('.primary-action')?.textContent?.trim(),
    canvas: canvas ? { top: canvas.top, bottom: canvas.bottom, width: canvas.width, height: canvas.height } : null,
    viewport: { width: innerWidth, height: innerHeight },
  };
});
assert.equal(desktopFirst.scrollY, 0);
assert.equal(desktopFirst.h1, 'Race a friend on one keyboard');
assert.equal(desktopFirst.audience, 'For two people together who want a short competitive game with readable controls and a new course each match.');
assert.equal(desktopFirst.action, 'Try it with sample data');
assert.ok(desktopFirst.canvas && desktopFirst.canvas.top < desktopFirst.viewport.height);
await desktopPage.screenshot({ path: `${out}desktop-first-screen.png` });

await desktopPage.evaluate(() => localStorage.setItem('one-screen-sprint:settings', JSON.stringify({ muted: true, effects: false, assist: false })));
const realBefore = await desktopPage.evaluate(() => localStorage.getItem('one-screen-sprint:settings'));
await desktopPage.getByRole('link', { name: 'Try it with sample data' }).click();
assert.equal(new URL(desktopPage.url()).pathname, '/demo');
await desktopPage.getByText('Demo — sample data, nothing is saved').waitFor();
assert.equal(await desktopPage.locator('#course-label').textContent(), 'Course CLUB-7');
assert.equal(await desktopPage.locator('#score-one').textContent(), '1');
assert.equal(await desktopPage.locator('#score-two').textContent(), '1');
const dialogFocus = await enableAssist(desktopPage);

await desktopPage.getByRole('button', { name: 'Start sample round' }).first().click();
await desktopPage.locator('#race-canvas').focus();
const bothStart = await desktopPage.evaluate(() => ({
  p1: Number(document.querySelector('#progress-one')?.getAttribute('value')),
  p2: Number(document.querySelector('#progress-two')?.getAttribute('value')),
}));
await desktopPage.keyboard.down('KeyD');
await desktopPage.keyboard.down('ArrowRight');
await desktopPage.waitForTimeout(3600);
await desktopPage.keyboard.up('ArrowRight');
await desktopPage.keyboard.up('KeyD');
const bothEnd = await desktopPage.evaluate(() => ({
  p1: Number(document.querySelector('#progress-one')?.getAttribute('value')),
  p2: Number(document.querySelector('#progress-two')?.getAttribute('value')),
}));
assert.ok(bothEnd.p1 > bothStart.p1);
assert.ok(bothEnd.p2 > bothStart.p2);
assert.ok(await desktopPage.getByText('Demo — sample data, nothing is saved').isVisible());
await desktopPage.screenshot({ path: `${out}desktop-demo-active.png` });
await racePlayerOne(desktopPage);
await desktopPage.getByRole('button', { name: 'Start next round' }).click();
await racePlayerOne(desktopPage);
await desktopPage.getByText('Match complete').waitFor();
const sampleEnd = {
  heading: await desktopPage.locator('#game-overlay h2').textContent(),
  summary: await desktopPage.locator('#game-overlay p').allTextContents(),
  bannerVisible: await desktopPage.getByText('Demo — sample data, nothing is saved').isVisible(),
};
assert.equal(sampleEnd.heading, 'Player 1 wins 3–1');
assert.equal(sampleEnd.bannerVisible, true);
await desktopPage.screenshot({ path: `${out}desktop-demo-match-end.png`, fullPage: true });

await desktopPage.getByRole('button', { name: 'Reset demo' }).click();
const reset = await desktopPage.evaluate(() => ({
  p1: document.querySelector('#score-one')?.textContent,
  p2: document.querySelector('#score-two')?.textContent,
  round: document.querySelector('#round-label')?.textContent,
  course: document.querySelector('#course-label')?.textContent,
  demoKeys: Object.keys(localStorage).filter((key) => key.startsWith('demo:one-screen-sprint:')),
}));
assert.deepEqual({ p1: reset.p1, p2: reset.p2, round: reset.round, course: reset.course }, { p1: '1', p2: '1', round: 'Round 3 of 5', course: 'Course CLUB-7' });
assert.ok(reset.demoKeys.length > 0);
assert.equal(await desktopPage.evaluate(() => localStorage.getItem('one-screen-sprint:settings')), realBefore);
await desktopPage.getByRole('link', { name: 'Start for real' }).click();
assert.equal(new URL(desktopPage.url()).pathname, '/');
assert.equal(await desktopPage.evaluate(() => localStorage.getItem('one-screen-sprint:settings')), realBefore);
assert.deepEqual(await desktopPage.evaluate(() => Object.keys(localStorage).filter((key) => key.startsWith('demo:one-screen-sprint:'))), []);
result.desktop = { firstScreen: desktopFirst, dialogFocus, simultaneousProgress: { before: bothStart, after: bothEnd }, sampleEnd, reset, realDataUnchanged: true };

// Fresh real-data context: complete a full 3-0 match from the normal entry.
const realContext = await browser.newContext({ viewport: { width: 1440, height: 1000 }, recordVideo: { dir: `${out}video`, size: { width: 960, height: 720 } } });
const realPage = await realContext.newPage();
watch(realPage, 'real-match');
await realPage.goto(base, { waitUntil: 'networkidle' });
const realCourse = await realPage.locator('#course-label').textContent();
await enableAssist(realPage);
await realPage.getByRole('button', { name: 'Start match' }).click();
await realPage.waitForFunction(() => document.querySelector('#game-summary')?.textContent?.includes('race is active'));
await realPage.screenshot({ path: `${out}real-match-active.png` });
for (let round = 0; round < 3; round += 1) {
  await racePlayerOne(realPage);
  if (round < 2) await realPage.getByRole('button', { name: 'Start next round' }).click();
}
await realPage.getByText('Match complete').waitFor();
const realEnd = {
  course: realCourse,
  heading: await realPage.locator('#game-overlay h2').textContent(),
  summary: await realPage.locator('#game-overlay p').allTextContents(),
};
assert.equal(realEnd.heading, 'Player 1 wins 3–0');
await realPage.screenshot({ path: `${out}real-match-end.png`, fullPage: true });
const realVideo = realPage.video();
await realPage.close();
if (realVideo) await realVideo.saveAs(`${out}real-match.webm`);
await realContext.close();
result.realMatch = realEnd;

// Fresh phone browser: first screen and touch play.
const phoneContext = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
const phonePage = await phoneContext.newPage();
watch(phonePage, 'phone');
const phoneResponse = await phonePage.goto(base, { waitUntil: 'networkidle' });
assert.equal(phoneResponse?.status(), 200);
const phoneFirst = await phonePage.evaluate(() => {
  const canvas = document.querySelector('#race-canvas')?.getBoundingClientRect();
  return {
    scrollY,
    title: document.title,
    h1: document.querySelector('h1')?.textContent?.trim(),
    audience: document.querySelector('.audience')?.textContent?.trim(),
    action: document.querySelector('.primary-action')?.textContent?.trim(),
    canvas: canvas ? { top: canvas.top, bottom: canvas.bottom, width: canvas.width, height: canvas.height } : null,
    viewport: { width: innerWidth, height: innerHeight },
  };
});
assert.equal(phoneFirst.scrollY, 0);
assert.equal(phoneFirst.h1, 'Race a friend on one keyboard');
assert.equal(phoneFirst.action, 'Try it with sample data');
assert.ok(phoneFirst.canvas && phoneFirst.canvas.top < phoneFirst.viewport.height && Math.min(phoneFirst.canvas.bottom, phoneFirst.viewport.height) - phoneFirst.canvas.top >= 100);
await phonePage.screenshot({ path: `${out}phone-first-screen.png` });
await phonePage.getByRole('link', { name: 'Try it with sample data' }).click();
await enableAssist(phonePage);
await phonePage.getByRole('button', { name: 'Start sample round' }).first().click();
const touchButtons = phonePage.locator('.touch-controls button');
const touchSizes = [];
for (let i = 0; i < await touchButtons.count(); i += 1) {
  const box = await touchButtons.nth(i).boundingBox();
  assert.ok(box && box.width >= 44 && box.height >= 44);
  touchSizes.push({ width: box.width, height: box.height });
}
const touchRight = phonePage.getByRole('button', { name: 'P1 move right' });
const phoneStart = Number(await phonePage.locator('#progress-one').getAttribute('value'));
await touchRight.dispatchEvent('pointerdown', { pointerId: 1, pointerType: 'touch' });
await phonePage.waitForTimeout(3400);
await touchRight.dispatchEvent('pointerup', { pointerId: 1, pointerType: 'touch' });
const phoneEnd = Number(await phonePage.locator('#progress-one').getAttribute('value'));
assert.ok(phoneEnd > phoneStart);
await phonePage.screenshot({ path: `${out}phone-demo-touch.png`, fullPage: true });
result.phone = { firstScreen: phoneFirst, touchSizes, progress: { before: phoneStart, after: phoneEnd } };
await phoneContext.close();

// Fresh mobile-performance context at the claimed throttle and viewport.
const frameContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
const framePage = await frameContext.newPage();
watch(framePage, 'frame');
const cdp = await frameContext.newCDPSession(framePage);
await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
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

// Offline/update recovery in an isolated browser context.
const offlineContext = await browser.newContext();
const offlinePage = await offlineContext.newPage();
watch(offlinePage, 'offline');
await offlinePage.goto(`${base}/demo`, { waitUntil: 'networkidle' });
const serviceWorker = await offlinePage.evaluate(async () => {
  const registration = await navigator.serviceWorker.ready;
  await registration.update();
  return { active: Boolean(registration.active), scope: registration.scope };
});
assert.equal(serviceWorker.active, true);
await offlinePage.reload({ waitUntil: 'networkidle' });
await offlineContext.setOffline(true);
await offlinePage.reload({ waitUntil: 'domcontentloaded' });
const offlineState = {
  bannerVisible: await offlinePage.getByText('Demo — sample data, nothing is saved').isVisible(),
  canvasVisible: await offlinePage.locator('#race-canvas').isVisible(),
  title: await offlinePage.title(),
};
assert.equal(offlineState.bannerVisible, true);
assert.equal(offlineState.canvasVisible, true);
await offlinePage.screenshot({ path: `${out}offline-demo.png` });
result.offline = { serviceWorker, offlineState };
await offlineContext.setOffline(false);
await offlineContext.close();

// Routes, route titles, structure, focus, reduced motion, axe, links, privacy
// deletion, and deliberate live 404 behavior.
const routeContext = await browser.newContext({ viewport: { width: 1280, height: 900 }, reducedMotion: 'reduce' });
const routePage = await routeContext.newPage();
watch(routePage, 'routes');
const routeExpectations = {
  '/': ['One Screen Sprint — Race on one keyboard', 'Race a friend on one keyboard'],
  '/demo': ['Demo — One Screen Sprint', 'Race a friend on one keyboard'],
  '/privacy': ['Privacy — One Screen Sprint', 'See what this game stores'],
  '/terms': ['Terms — One Screen Sprint', 'Play the game fairly and safely'],
};
const internalLinks = new Set();
const externalLinks = new Set();
for (const [path, [title, heading]] of Object.entries(routeExpectations)) {
  const response = await routePage.goto(`${base}${path}`, { waitUntil: 'networkidle' });
  assert.equal(response?.status(), 200);
  assert.equal(await routePage.title(), title);
  assert.equal((await routePage.locator('h1').allTextContents()).length, 1);
  assert.equal((await routePage.locator('h1').textContent())?.trim(), heading);
  assert.equal(await routePage.locator('html').getAttribute('lang'), 'en');
  assert.equal(await routePage.locator('main').count(), 1);
  const axe = await new AxeBuilder({ page: routePage }).analyze();
  const serious = axe.violations.filter((item) => ['serious', 'critical'].includes(item.impact ?? ''));
  assert.deepEqual(serious, []);
  result.accessibility[path] = { violations: axe.violations.length, seriousOrCritical: serious.length };
  const hrefs = await routePage.locator('a').evaluateAll((anchors) => anchors.map((anchor) => anchor.href));
  for (const href of hrefs) {
    const url = new URL(href);
    if (url.origin === base) internalLinks.add(`${url.pathname}${url.search}`);
    else externalLinks.add(href);
  }
  result.routes[path] = { status: response?.status(), title, heading };
}

await routePage.goto(base);
await routePage.getByRole('link', { name: 'Privacy' }).first().click();
assert.equal(await routePage.locator('h1').evaluate((element) => element === document.activeElement), true);
await routePage.goBack();
assert.equal(await routePage.locator('h1').evaluate((element) => element === document.activeElement), true);
await routePage.keyboard.press('Tab');
const focusedAfterTab = await routePage.evaluate(() => document.activeElement?.textContent?.trim());
assert.ok(focusedAfterTab);

await routePage.evaluate(() => {
  localStorage.setItem('one-screen-sprint:game', '{bad json');
  localStorage.setItem('one-screen-sprint:settings', JSON.stringify({ muted: true, effects: false, assist: true }));
});
await routePage.goto(`${base}/`);
await routePage.getByRole('button', { name: 'Start match' }).waitFor();
await routePage.goto(`${base}/privacy`);
routePage.once('dialog', (dialog) => dialog.accept());
await routePage.getByRole('button', { name: 'Clear saved game' }).click();
assert.equal(await routePage.getByRole('status').textContent(), 'Saved match and settings removed.');
assert.deepEqual(await routePage.evaluate(() => Object.keys(localStorage).filter((key) => key.startsWith('one-screen-sprint:'))), []);

for (const href of [...internalLinks].sort()) {
  const response = await routeContext.request.get(`${base}${href}`);
  assert.equal(response.status(), 200, href);
  result.links[href] = response.status();
}
result.links.externalNotFetched = [...externalLinks].sort();

assert.deepEqual(result.consoleErrors, []);
const missingResponse = await routePage.goto(`${base}/verification-missing-course`, { waitUntil: 'networkidle' });
assert.equal(missingResponse?.status(), 404);
assert.equal(await routePage.title(), 'Page not found — One Screen Sprint');
assert.equal((await routePage.locator('h1').textContent())?.trim(), 'Find the race from the start');
assert.equal(await routePage.getByRole('link', { name: 'Return to the game' }).getAttribute('href'), '/');
const axe404 = await new AxeBuilder({ page: routePage }).analyze();
const serious404 = axe404.violations.filter((item) => ['serious', 'critical'].includes(item.impact ?? ''));
assert.deepEqual(serious404, []);
result.accessibility['404'] = { violations: axe404.violations.length, seriousOrCritical: serious404.length };
result.routes['404'] = { status: missingResponse?.status(), title: await routePage.title(), heading: (await routePage.locator('h1').textContent())?.trim() };
await routePage.screenshot({ path: `${out}designed-404.png`, fullPage: true });

const reducedMotion = await routePage.evaluate(() => matchMedia('(prefers-reduced-motion: reduce)').matches);
assert.equal(reducedMotion, true);
result.accessibility.keyboard = { routeHeadingFocus: true, focusedAfterTab };
result.accessibility.reducedMotion = reducedMotion;

await routeContext.close();

const crossOriginRequests = desktopRequests.filter((raw) => new URL(raw).origin !== base);
assert.deepEqual(crossOriginRequests, []);
result.desktop.requests = { total: desktopRequests.length, crossOrigin: crossOriginRequests };
result.expected404Console = result.consoleErrors.filter((message) => message.includes('status of 404'));
result.consoleErrors = result.consoleErrors.filter((message) => !message.includes('status of 404'));
assert.deepEqual(result.consoleErrors, []);

await browser.close();
await writeFile(`${out}live-results.json`, `${JSON.stringify(result, null, 2)}\n`);
console.log(JSON.stringify(result, null, 2));
