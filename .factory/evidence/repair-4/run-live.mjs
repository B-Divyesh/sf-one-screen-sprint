import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { chromium } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const base = 'https://one-screen-sprint.sociobot.in';
const out = new URL('./', import.meta.url).pathname;
const videoDir = '/tmp/one-screen-sprint-repair-4-video';
await mkdir(videoDir, { recursive: true });

const results = {
  checkedAt: new Date().toISOString(),
  runtimeImplementation: '6584718359bf7ca6daff94c7c3b9ff8126e7c82b',
  claimRepair: '4bbd8d0',
  firstScreen: {},
  sample: {},
  movementEffects: {},
  routes: {},
  accessibility: {},
  offline: {},
  performance: {},
  artifactParity: {},
  consoleErrors: [],
};

async function listFiles(directory, prefix = '') {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const relative = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) files.push(...await listFiles(new URL(`${entry.name}/`, directory), relative));
    else files.push(relative);
  }
  return files;
}

const distDirectory = new URL('../../../dist/', import.meta.url);
const deployableFiles = (await listFiles(distDirectory))
  .filter((file) => file !== 'staticwebapp.config.json')
  .sort();
const parity = [];
for (const file of deployableFiles) {
  const local = await readFile(new URL(file, distDirectory));
  const response = await fetch(`${base}/${file}`);
  assert.equal(response.status, 200, `${file} did not return 200`);
  const remote = Buffer.from(await response.arrayBuffer());
  const localHash = createHash('sha256').update(local).digest('hex');
  const remoteHash = createHash('sha256').update(remote).digest('hex');
  assert.equal(remoteHash, localHash, `${file} differs from the deployed build`);
  parity.push({ file, sha256: localHash });
}
results.artifactParity = { matched: parity.length, files: parity };

function watch(page, label) {
  page.on('pageerror', (error) => results.consoleErrors.push(`${label}: pageerror: ${String(error)}`));
  page.on('console', (message) => {
    if (message.type() === 'error') results.consoleErrors.push(`${label}: console: ${message.text()}`);
  });
}

async function enableAssist(page) {
  await page.getByRole('button', { name: 'Settings' }).click();
  await page.getByRole('checkbox', { name: /Edge assist/ }).check();
  await page.getByRole('button', { name: 'Save settings' }).click();
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

async function installMovementEffectProbe(page) {
  await page.addInitScript(() => {
    window.__movementEffectOutput = { paperFlecks: 0, horizontalTransforms: [] };
    const originalFillRect = CanvasRenderingContext2D.prototype.fillRect;
    CanvasRenderingContext2D.prototype.fillRect = function fillRect(x, y, width, height) {
      const color = String(this.fillStyle).toLowerCase();
      if ((width === 5 || width === 8) && (height === 3 || height === 5)
        && (color === '#d94a3d' || color === '#176b87')) {
        window.__movementEffectOutput.paperFlecks += 1;
      }
      return originalFillRect.call(this, x, y, width, height);
    };
    const originalSetTransform = CanvasRenderingContext2D.prototype.setTransform;
    CanvasRenderingContext2D.prototype.setTransform = function setTransform(...args) {
      if (this.canvas.id === 'race-canvas' && args.length === 6 && typeof args[4] === 'number') {
        window.__movementEffectOutput.horizontalTransforms.push(args[4]);
      }
      return Reflect.apply(originalSetTransform, this, args);
    };
  });
}

async function resetMovementEffectProbe(page) {
  await page.evaluate(() => {
    window.__movementEffectOutput = { paperFlecks: 0, horizontalTransforms: [] };
  });
}

async function dashAndReadEffects(page) {
  await page.locator('#race-canvas').focus();
  await page.keyboard.down('KeyD');
  await page.keyboard.down('KeyS');
  await page.waitForTimeout(250);
  await page.keyboard.up('KeyS');
  await page.keyboard.up('KeyD');
  return page.evaluate(() => {
    const values = window.__movementEffectOutput.horizontalTransforms;
    return {
      paperFlecks: window.__movementEffectOutput.paperFlecks,
      transformSamples: values.length,
      horizontalRange: values.length ? Math.max(...values) - Math.min(...values) : 0,
    };
  });
}

const browser = await chromium.launch();

const desktopContext = await browser.newContext({
  viewport: { width: 1440, height: 1000 },
  recordVideo: { dir: videoDir, size: { width: 960, height: 720 } },
});
const desktopPage = await desktopContext.newPage();
watch(desktopPage, 'desktop-sample');
const requests = [];
desktopPage.on('request', (request) => requests.push(request.url()));
assert.equal((await desktopPage.goto(base, { waitUntil: 'networkidle' }))?.status(), 200);
const desktopFirst = await firstScreen(desktopPage);
assert.equal(desktopFirst.scrollY, 0);
assert.equal(desktopFirst.heading, 'Race a friend on one keyboard');
assert.match(desktopFirst.audience ?? '', /^For two people together/);
assert.equal(desktopFirst.action, 'Try it with sample data');
assert.equal(desktopFirst.actionNote, 'Loads a fixed 1–1 rematch.');
assert.equal(desktopFirst.facts.length, 3);
assert.ok(desktopFirst.game && desktopFirst.game.top < desktopFirst.viewport.height);
await desktopPage.screenshot({ path: `${out}desktop-cold.png` });
results.firstScreen.desktop = desktopFirst;

await desktopPage.evaluate(() => localStorage.setItem(
  'one-screen-sprint:settings',
  JSON.stringify({ muted: true, effects: false, assist: false }),
));
const realBefore = await desktopPage.evaluate(() => localStorage.getItem('one-screen-sprint:settings'));
await desktopPage.getByRole('link', { name: 'Try it with sample data' }).click();
assert.equal(new URL(desktopPage.url()).pathname, '/demo');
assert.equal(await desktopPage.getByText('Demo — sample data, nothing is saved').isVisible(), true);
assert.equal(await desktopPage.getByText('Weekend rematch · sample').isVisible(), true);
assert.equal(await desktopPage.locator('#course-label').textContent(), 'Course CLUB-7');
assert.equal(await desktopPage.locator('#score-one').textContent(), '1');
assert.equal(await desktopPage.locator('#score-two').textContent(), '1');
await enableAssist(desktopPage);
await desktopPage.getByRole('button', { name: 'Start sample round' }).first().click();
const progressBefore = await desktopPage.evaluate(() => ({
  p1: Number(document.querySelector('#progress-one')?.getAttribute('value')),
  p2: Number(document.querySelector('#progress-two')?.getAttribute('value')),
}));
await desktopPage.locator('#race-canvas').focus();
await desktopPage.keyboard.down('KeyD');
await desktopPage.keyboard.down('ArrowRight');
await desktopPage.waitForTimeout(3600);
await desktopPage.keyboard.up('ArrowRight');
await desktopPage.keyboard.up('KeyD');
const progressAfter = await desktopPage.evaluate(() => ({
  p1: Number(document.querySelector('#progress-one')?.getAttribute('value')),
  p2: Number(document.querySelector('#progress-two')?.getAttribute('value')),
}));
assert.ok(progressAfter.p1 > progressBefore.p1 && progressAfter.p2 > progressBefore.p2);
await finishRoundAsPlayerOne(desktopPage);
await desktopPage.getByRole('button', { name: 'Start next round' }).click();
await finishRoundAsPlayerOne(desktopPage);
assert.equal(await desktopPage.locator('#game-overlay h2').textContent(), 'Player 1 wins 3–1');
assert.equal(await desktopPage.getByText('Demo — sample data, nothing is saved').isVisible(), true);
await desktopPage.screenshot({ path: `${out}sample-match-end.png`, fullPage: true });
await desktopPage.getByRole('button', { name: 'Reset demo' }).click();
const reset = await desktopPage.evaluate(() => ({
  score: [document.querySelector('#score-one')?.textContent, document.querySelector('#score-two')?.textContent],
  round: document.querySelector('#round-label')?.textContent,
  course: document.querySelector('#course-label')?.textContent,
}));
assert.deepEqual(reset, { score: ['1', '1'], round: 'Round 3 of 5', course: 'Course CLUB-7' });
assert.equal(await desktopPage.evaluate(() => localStorage.getItem('one-screen-sprint:settings')), realBefore);
await desktopPage.getByRole('link', { name: 'Start for real' }).click();
assert.equal(new URL(desktopPage.url()).pathname, '/');
assert.deepEqual(await desktopPage.evaluate(() => Object.keys(localStorage).filter((key) => key.startsWith('demo:'))), []);
assert.equal(await desktopPage.evaluate(() => localStorage.getItem('one-screen-sprint:settings')), realBefore);
assert.deepEqual(requests.filter((raw) => new URL(raw).origin !== base), []);
const desktopVideo = desktopPage.video();
await desktopPage.close();
if (desktopVideo) await desktopVideo.saveAs(`${out}sample-match.webm`);
await desktopContext.close();
results.sample = {
  entry: { course: 'CLUB-7', score: [1, 1], round: 3 },
  simultaneousProgress: { before: progressBefore, after: progressAfter },
  end: 'Player 1 wins 3–1',
  persistentSampleLabel: true,
  reset,
  realDataUnchanged: true,
  crossOriginRequests: [],
};

const effectsContext = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const effectsPage = await effectsContext.newPage();
watch(effectsPage, 'movement-effects');
await installMovementEffectProbe(effectsPage);
await effectsPage.goto(`${base}/demo`, { waitUntil: 'networkidle' });
await effectsPage.getByRole('button', { name: 'Start sample round' }).first().click();
await effectsPage.locator('#game-overlay').waitFor({ state: 'hidden', timeout: 5_000 });
await resetMovementEffectProbe(effectsPage);
const enabledEffects = await dashAndReadEffects(effectsPage);
assert.ok(enabledEffects.paperFlecks > 0);
assert.ok(enabledEffects.transformSamples > 2);
assert.ok(enabledEffects.horizontalRange > 0.5);
await effectsPage.getByRole('button', { name: 'Reset demo' }).click();
await effectsPage.getByRole('button', { name: 'Settings' }).click();
await effectsPage.getByRole('checkbox', { name: /Movement effects/ }).uncheck();
await effectsPage.getByRole('button', { name: 'Save settings' }).click();
await effectsPage.getByRole('button', { name: 'Start sample round' }).first().click();
await effectsPage.locator('#game-overlay').waitFor({ state: 'hidden', timeout: 5_000 });
await resetMovementEffectProbe(effectsPage);
const disabledEffects = await dashAndReadEffects(effectsPage);
assert.equal(disabledEffects.paperFlecks, 0);
assert.ok(disabledEffects.transformSamples > 2);
assert.ok(disabledEffects.horizontalRange < 0.01);
results.movementEffects = { enabled: enabledEffects, disabled: disabledEffects };
await effectsContext.close();

const reducedEffectsContext = await browser.newContext({
  viewport: { width: 1280, height: 900 },
  reducedMotion: 'reduce',
});
const reducedEffectsPage = await reducedEffectsContext.newPage();
await installMovementEffectProbe(reducedEffectsPage);
await reducedEffectsPage.goto(`${base}/demo`, { waitUntil: 'networkidle' });
await reducedEffectsPage.getByRole('button', { name: 'Start sample round' }).first().click();
await reducedEffectsPage.locator('#game-overlay').waitFor({ state: 'hidden', timeout: 5_000 });
await resetMovementEffectProbe(reducedEffectsPage);
const reducedEffects = await dashAndReadEffects(reducedEffectsPage);
assert.equal(reducedEffects.paperFlecks, 0);
assert.ok(reducedEffects.transformSamples > 2);
assert.ok(reducedEffects.horizontalRange < 0.01);
results.movementEffects.reducedMotion = reducedEffects;
await reducedEffectsContext.close();

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
assert.equal(phoneFirst.scrollY, 0);
assert.equal(phoneFirst.heading, 'Race a friend on one keyboard');
assert.match(phoneFirst.audience ?? '', /^For two people together/);
assert.equal(phoneFirst.action, 'Try it with sample data');
assert.ok(phoneFirst.game && phoneFirst.game.top < phoneFirst.viewport.height);
await phonePage.screenshot({ path: `${out}phone-cold.png` });
results.firstScreen.phone = phoneFirst;
await phoneContext.close();

const routeContext = await browser.newContext({ viewport: { width: 1280, height: 900 }, reducedMotion: 'reduce' });
const routePage = await routeContext.newPage();
watch(routePage, 'routes');
const expectedRoutes = {
  '/': ['One Screen Sprint — Race on one keyboard', 'Race a friend on one keyboard', 200],
  '/demo': ['Demo — One Screen Sprint', 'Race a friend on one keyboard', 200],
  '/privacy': ['Privacy — One Screen Sprint', 'See what this game stores', 200],
  '/terms': ['Terms — One Screen Sprint', 'Play the game fairly and safely', 200],
  '/repair-4-missing': ['Page not found — One Screen Sprint', 'Find the race from the start', 404],
};
for (const [route, [title, heading, status]] of Object.entries(expectedRoutes)) {
  const response = await routePage.goto(`${base}${route}`, { waitUntil: 'networkidle' });
  assert.equal(response?.status(), status);
  assert.equal(await routePage.title(), title);
  assert.equal((await routePage.locator('h1').textContent())?.trim(), heading);
  assert.equal(await routePage.locator('h1').count(), 1);
  assert.equal(await routePage.locator('main').count(), 1);
  const axe = await new AxeBuilder({ page: routePage }).analyze();
  assert.deepEqual(axe.violations, []);
  results.routes[route] = { status, title, heading };
  results.accessibility[route] = { violations: 0 };
}
assert.equal(await routePage.evaluate(() => matchMedia('(prefers-reduced-motion: reduce)').matches), true);
results.accessibility.reducedMotion = true;
await routeContext.close();

const offlineContext = await browser.newContext();
const offlinePage = await offlineContext.newPage();
await offlinePage.goto(`${base}/demo`, { waitUntil: 'networkidle' });
const registration = await offlinePage.evaluate(async () => navigator.serviceWorker.ready.then((item) => ({
  active: Boolean(item.active),
  scope: item.scope,
})));
await offlinePage.reload({ waitUntil: 'networkidle' });
await offlineContext.setOffline(true);
await offlinePage.reload({ waitUntil: 'domcontentloaded' });
const offlineState = {
  bannerVisible: await offlinePage.getByText('Demo — sample data, nothing is saved').isVisible(),
  canvasVisible: await offlinePage.locator('#race-canvas').isVisible(),
};
assert.equal(registration.active && offlineState.bannerVisible && offlineState.canvasVisible, true);
results.offline = { registration, ...offlineState };
await offlineContext.close();

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

results.consoleErrors = results.consoleErrors.filter((message) => !message.includes('status of 404'));
assert.deepEqual(results.consoleErrors, []);
await browser.close();
await writeFile(`${out}live-results.json`, `${JSON.stringify(results, null, 2)}\n`);
console.log(JSON.stringify(results, null, 2));
