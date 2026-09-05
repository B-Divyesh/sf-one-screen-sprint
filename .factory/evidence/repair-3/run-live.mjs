import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
import { chromium } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const base = 'https://one-screen-sprint.sociobot.in';
const out = new URL('./', import.meta.url).pathname;
const videoDir = '/tmp/one-screen-sprint-repair-3-video';
const results = {
  checkedAt: new Date().toISOString(),
  implementation: '6584718359bf7ca6daff94c7c3b9ff8126e7c82b',
  firstScreen: {},
  settings: {},
  sample: {},
  phone: {},
  routes: {},
  accessibility: {},
  recovery: {},
  offline: {},
  performance: {},
  consoleErrors: [],
};

function watch(page, label) {
  page.on('pageerror', (error) => results.consoleErrors.push(`${label}: pageerror: ${String(error)}`));
  page.on('console', (message) => {
    if (message.type() === 'error') results.consoleErrors.push(`${label}: console: ${message.text()}`);
  });
}

async function installOutputProbes(page) {
  await page.addInitScript(() => {
    window.__toneStarts = 0;
    window.__paperFlecks = 0;
    class AudioContextProbe {
      state = 'running';
      currentTime = 0;
      destination = {};
      createOscillator() {
        return {
          type: 'square', frequency: { value: 0 },
          connect(node) { return node; },
          start() { window.__toneStarts += 1; }, stop() {},
        };
      }
      createGain() {
        return {
          gain: { setValueAtTime() {}, exponentialRampToValueAtTime() {} },
          connect(node) { return node; },
        };
      }
      resume() { return Promise.resolve(); }
      close() { return Promise.resolve(); }
    }
    window.AudioContext = AudioContextProbe;
    const fillRect = CanvasRenderingContext2D.prototype.fillRect;
    CanvasRenderingContext2D.prototype.fillRect = function observedFillRect(x, y, width, height) {
      const color = String(this.fillStyle).toLowerCase();
      if ((width === 5 || width === 8) && (height === 3 || height === 5) &&
          (color === '#d94a3d' || color === '#176b87')) window.__paperFlecks += 1;
      return fillRect.call(this, x, y, width, height);
    };
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
const desktopContext = await browser.newContext({
  viewport: { width: 1440, height: 1000 },
  recordVideo: { dir: videoDir, size: { width: 960, height: 720 } },
});
const desktop = await desktopContext.newPage();
watch(desktop, 'desktop');
await installOutputProbes(desktop);
const requests = [];
desktop.on('request', (request) => requests.push(request.url()));
assert.equal((await desktop.goto(base, { waitUntil: 'networkidle' }))?.status(), 200);
const desktopFirst = await firstScreen(desktop);
assert.equal(desktopFirst.scrollY, 0);
assert.equal(desktopFirst.heading, 'Race a friend on one keyboard');
assert.match(desktopFirst.audience ?? '', /^For two people together/);
assert.equal(desktopFirst.action, 'Try it with sample data');
assert.equal(desktopFirst.actionNote, 'Loads a fixed 1–1 rematch.');
assert.equal(desktopFirst.facts.length, 3);
assert.ok(desktopFirst.game && desktopFirst.game.top < desktopFirst.viewport.height);
results.firstScreen.desktop = desktopFirst;
await desktop.screenshot({ path: `${out}desktop-cold.png` });

await desktop.evaluate(() => localStorage.setItem(
  'one-screen-sprint:settings',
  JSON.stringify({ muted: true, effects: false, assist: false }),
));
const realBefore = await desktop.evaluate(() => localStorage.getItem('one-screen-sprint:settings'));
await desktop.getByRole('link', { name: 'Try it with sample data' }).click();
assert.equal(new URL(desktop.url()).pathname, '/demo');
assert.equal(await desktop.getByText('Demo — sample data, nothing is saved').isVisible(), true);
assert.equal(await desktop.getByText('Weekend rematch · sample').isVisible(), true);
assert.equal(await desktop.locator('#course-label').textContent(), 'Course CLUB-7');
assert.deepEqual(await desktop.locator('#score-one, #score-two').allTextContents(), ['1', '1']);
await enableAssist(desktop);
await desktop.getByRole('button', { name: 'Start sample round' }).first().click();
await desktop.locator('#race-canvas').focus();
const before = await desktop.evaluate(() => ({
  p1: Number(document.querySelector('#progress-one')?.getAttribute('value')),
  p2: Number(document.querySelector('#progress-two')?.getAttribute('value')),
}));
await desktop.keyboard.down('KeyD');
await desktop.keyboard.down('ArrowRight');
await desktop.keyboard.down('KeyS');
await desktop.waitForFunction(() => window.__paperFlecks > 0, null, { timeout: 5_000 });
await desktop.waitForTimeout(1000);
await desktop.keyboard.up('ArrowRight');
const after = await desktop.evaluate(() => ({
  p1: Number(document.querySelector('#progress-one')?.getAttribute('value')),
  p2: Number(document.querySelector('#progress-two')?.getAttribute('value')),
}));
assert.ok(after.p1 > before.p1 && after.p2 > before.p2);
await desktop.waitForFunction(
  () => /^Player 1 wins round/.test(document.querySelector('#game-overlay h2')?.textContent ?? ''),
  null,
  { timeout: 20_000 },
);
await desktop.keyboard.up('KeyS');
await desktop.keyboard.up('KeyD');
assert.equal(await desktop.evaluate(() => window.__toneStarts), 4);
assert.ok(await desktop.evaluate(() => window.__paperFlecks) > 0);
await desktop.getByRole('button', { name: 'Start next round' }).click();
await finishRoundAsPlayerOne(desktop);
assert.equal(await desktop.locator('#game-overlay h2').textContent(), 'Player 1 wins 3–1');
assert.equal(await desktop.getByText('Demo — sample data, nothing is saved').isVisible(), true);
await desktop.screenshot({ path: `${out}sample-match-end.png`, fullPage: true });
await desktop.getByRole('button', { name: 'Reset demo' }).click();
const reset = await desktop.evaluate(() => ({
  score: [document.querySelector('#score-one')?.textContent, document.querySelector('#score-two')?.textContent],
  round: document.querySelector('#round-label')?.textContent,
  course: document.querySelector('#course-label')?.textContent,
}));
assert.deepEqual(reset, { score: ['1', '1'], round: 'Round 3 of 5', course: 'Course CLUB-7' });
assert.equal(await desktop.evaluate(() => localStorage.getItem('one-screen-sprint:settings')), realBefore);
await desktop.evaluate(() => history.back());
await desktop.waitForURL(`${base}/`);
assert.deepEqual(await desktop.evaluate(() => Object.keys(localStorage).filter((key) => key.startsWith('demo:'))), []);
assert.equal(await desktop.evaluate(() => localStorage.getItem('one-screen-sprint:settings')), realBefore);
assert.deepEqual(requests.filter((raw) => new URL(raw).origin !== base), []);
const video = desktop.video();
await desktop.close();
if (video) await video.saveAs(`${out}sample-match.webm`);
await desktopContext.close();
results.settings.unmutedToneStarts = 4;
results.settings.paperFlecksDrawn = true;
results.sample = {
  entry: { course: 'CLUB-7', score: [1, 1], round: 3 },
  simultaneousProgress: { before, after },
  end: 'Player 1 wins 3–1',
  edgeAssistRunWithoutJumpKey: true,
  persistentLabel: true,
  reset,
  leavingClearsDemo: true,
  realDataUnchanged: true,
  crossOriginRequests: [],
};

const disabledContext = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const disabledPage = await disabledContext.newPage();
watch(disabledPage, 'disabled-settings');
await installOutputProbes(disabledPage);
await disabledPage.goto(`${base}/demo`, { waitUntil: 'networkidle' });
await disabledPage.getByRole('button', { name: 'Settings' }).click();
await disabledPage.getByRole('checkbox', { name: /Mute sound/ }).check();
await disabledPage.getByRole('checkbox', { name: /Movement effects/ }).uncheck();
await disabledPage.getByRole('button', { name: 'Save settings' }).click();
await disabledPage.getByRole('button', { name: 'Start sample round' }).first().click();
await disabledPage.locator('#race-canvas').focus();
await disabledPage.keyboard.down('KeyD');
await disabledPage.keyboard.down('KeyS');
await disabledPage.locator('#game-overlay').waitFor({ state: 'hidden', timeout: 5_000 });
await disabledPage.waitForTimeout(300);
await disabledPage.keyboard.up('KeyS');
await disabledPage.keyboard.up('KeyD');
assert.equal(await disabledPage.evaluate(() => window.__toneStarts), 0);
assert.equal(await disabledPage.evaluate(() => window.__paperFlecks), 0);
results.settings.mutedToneStarts = 0;
results.settings.disabledPaperFlecks = 0;
await disabledContext.close();

const phoneContext = await browser.newContext({
  viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2,
});
const phone = await phoneContext.newPage();
watch(phone, 'phone');
await phone.goto(base, { waitUntil: 'networkidle' });
const phoneFirst = await firstScreen(phone);
assert.equal(phoneFirst.heading, 'Race a friend on one keyboard');
assert.equal(phoneFirst.action, 'Try it with sample data');
assert.ok(phoneFirst.game && phoneFirst.game.top < phoneFirst.viewport.height);
results.firstScreen.phone = phoneFirst;
await phone.screenshot({ path: `${out}phone-cold.png` });
const targetsByRoute = {};
for (const route of ['/', '/demo', '/privacy', '/terms', '/repair-3-missing']) {
  const response = await phone.goto(`${base}${route}`, { waitUntil: 'networkidle' });
  assert.equal(response?.status(), route.endsWith('missing') ? 404 : 200);
  const targets = await phone.locator('a[href], button, input:not([type="hidden"])').evaluateAll((elements) => (
    elements.flatMap((element) => {
      const rect = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      if (!rect.width || !rect.height || style.display === 'none' || style.visibility === 'hidden') return [];
      return [{ name: element.getAttribute('aria-label') ?? element.textContent?.trim(), width: rect.width, height: rect.height }];
    })
  ));
  assert.deepEqual(targets.filter((target) => target.width < 44 || target.height < 44), []);
  targetsByRoute[route] = targets;
}
await phone.goto(base, { waitUntil: 'networkidle' });
const typeSizes = await phone.evaluate(() => Object.fromEntries(
  ['.audience', '.hero-actions span', '.plain-facts', '.game-foot', '.site-footer', '.site-header nav a', 'button']
    .map((selector) => [selector, Math.min(...[...document.querySelectorAll(selector)]
      .filter((element) => element.getClientRects().length > 0)
      .map((element) => Number.parseFloat(getComputedStyle(element).fontSize)))]),
));
assert.deepEqual(Object.values(typeSizes).filter((size) => size < 17), []);
await phone.evaluate(() => { document.documentElement.style.fontSize = '200%'; });
const resized = await phone.evaluate(() => ({
  clientWidth: document.documentElement.clientWidth,
  scrollWidth: document.documentElement.scrollWidth,
  actionVisible: Boolean(document.querySelector('.primary-action')?.getClientRects().length),
  canvasVisible: Boolean(document.querySelector('#race-canvas')?.getClientRects().length),
}));
assert.ok(resized.scrollWidth <= resized.clientWidth + 1 && resized.actionVisible && resized.canvasVisible);
await phone.evaluate(() => { document.documentElement.style.fontSize = ''; });
await phone.goto(`${base}/demo`, { waitUntil: 'networkidle' });
await enableAssist(phone);
await phone.getByRole('button', { name: 'Start sample round' }).first().click();
const right = phone.getByRole('button', { name: 'P1 move right' });
const touchStart = Number(await phone.locator('#progress-one').getAttribute('value'));
await right.dispatchEvent('pointerdown', { pointerId: 1, pointerType: 'touch' });
await phone.waitForTimeout(3400);
await right.dispatchEvent('pointerup', { pointerId: 1, pointerType: 'touch' });
const touchEnd = Number(await phone.locator('#progress-one').getAttribute('value'));
assert.ok(touchEnd > touchStart);
results.phone = { targetsByRoute, typeSizes, resized, touchProgress: { before: touchStart, after: touchEnd } };
await phoneContext.close();

const routeContext = await browser.newContext({ viewport: { width: 1280, height: 900 }, reducedMotion: 'reduce' });
const routePage = await routeContext.newPage();
watch(routePage, 'routes');
await installOutputProbes(routePage);
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
  const axe = await new AxeBuilder({ page: routePage }).analyze();
  assert.deepEqual(axe.violations, []);
  results.routes[route] = { status: 200, title, heading };
  results.accessibility[route] = { violations: 0 };
}
await routePage.goto(base, { waitUntil: 'networkidle' });
await routePage.keyboard.press('Tab');
assert.equal(await routePage.locator('.skip-link').evaluate((element) => element === document.activeElement), true);
await routePage.getByRole('button', { name: 'Settings' }).focus();
await routePage.keyboard.press('Enter');
assert.equal(await routePage.getByRole('dialog', { name: 'Game settings' }).isVisible(), true);
await routePage.keyboard.press('Escape');
assert.equal(await routePage.getByRole('button', { name: 'Settings' }).evaluate((element) => element === document.activeElement), true);
assert.equal(await routePage.evaluate(() => matchMedia('(prefers-reduced-motion: reduce)').matches), true);
await routePage.goto(`${base}/demo`, { waitUntil: 'networkidle' });
await routePage.getByRole('button', { name: 'Start sample round' }).first().click();
await routePage.locator('#race-canvas').focus();
await routePage.keyboard.down('KeyD');
await routePage.keyboard.down('KeyS');
await routePage.locator('#game-overlay').waitFor({ state: 'hidden', timeout: 5_000 });
await routePage.waitForTimeout(300);
await routePage.keyboard.up('KeyS');
await routePage.keyboard.up('KeyD');
assert.equal(await routePage.evaluate(() => window.__paperFlecks), 0);
results.accessibility.reducedMotionDisablesFlecks = true;
await routePage.locator('#race-canvas').focus();
await routePage.keyboard.press('Escape');
assert.equal(await routePage.getByRole('heading', { name: 'Match paused' }).isVisible(), true);
await routePage.reload({ waitUntil: 'networkidle' });
assert.equal(await routePage.getByRole('heading', { name: 'Match paused' }).isVisible(), true);
await routePage.getByRole('button', { name: 'Resume match' }).click();
results.recovery.pausedReloadResume = true;
await routePage.evaluate(() => localStorage.setItem('one-screen-sprint:game', '{invalid json'));
await routePage.goto(base, { waitUntil: 'networkidle' });
assert.equal(await routePage.getByRole('button', { name: 'Start match' }).isVisible(), true);
results.recovery.invalidStorage = 'new playable match';
const missing = await routePage.goto(`${base}/repair-3-missing`, { waitUntil: 'networkidle' });
assert.equal(missing?.status(), 404);
assert.equal(await routePage.title(), 'Page not found — One Screen Sprint');
assert.equal(await routePage.locator('header').count(), 1);
assert.equal(await routePage.locator('main').count(), 1);
assert.equal(await routePage.locator('footer').count(), 1);
const axe404 = await new AxeBuilder({ page: routePage }).analyze();
assert.deepEqual(axe404.violations, []);
results.routes['404'] = { status: 404, title: await routePage.title(), standardStructure: true };
results.accessibility['404'] = { violations: 0 };
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
