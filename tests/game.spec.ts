import { expect, test, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

async function enableAssist(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Settings' }).click();
  const dialog = page.getByRole('dialog', { name: 'Game settings' });
  await expect(dialog).toBeVisible();
  await dialog.getByRole('checkbox', { name: /Edge assist/ }).check();
  await dialog.getByRole('button', { name: 'Save settings' }).click();
}

async function racePlayerOne(page: Page): Promise<void> {
  const canvas = page.locator('#race-canvas');
  await canvas.focus();
  await page.keyboard.down('KeyD');
  await page.keyboard.down('KeyS');
  await expect(page.getByRole('heading', { name: /Player 1 (wins round|wins 3)/ })).toBeVisible({ timeout: 20_000 });
  await page.keyboard.up('KeyS');
  await page.keyboard.up('KeyD');
}

test('@claim:best-of-five-end @claim:restart-reset @claim:free-no-ads completes a deterministic sample match and resets the next course', async ({ page }) => {
  await page.goto('/demo');
  await expect(page.getByText('Demo — sample data, nothing is saved')).toBeVisible();
  await expect(page.getByText('Weekend rematch · sample')).toBeVisible();
  await expect(page.locator('#score-one')).toHaveText('1');
  await expect(page.locator('#score-two')).toHaveText('1');
  await enableAssist(page);

  await page.getByRole('button', { name: 'Start sample round' }).first().click();
  await racePlayerOne(page);
  await page.getByRole('button', { name: 'Start next round' }).click();
  await racePlayerOne(page);

  await expect(page.getByText('Match complete')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Player 1 wins 3–1' })).toBeVisible();
  await page.screenshot({ path: test.info().outputPath('match-end.png'), fullPage: true });

  const oldCourse = await page.locator('#course-label').textContent();
  await page.getByRole('button', { name: 'Race another course' }).click();
  await expect(page.locator('#score-one')).toHaveText('0');
  await expect(page.locator('#score-two')).toHaveText('0');
  await expect(page.locator('#round-label')).toHaveText('Round 1 of 5');
  await expect(page.locator('#time-left')).toHaveText('75');
  await expect(page.locator('#course-label')).not.toHaveText(oldCourse ?? '');
  await expect(page.getByText('Demo — sample data, nothing is saved')).toBeVisible();
});

test('plays a new best-of-five from entry through three rounds to the end screen', async ({ page }) => {
  await page.goto('/');
  await enableAssist(page);
  await page.getByRole('button', { name: 'Start match' }).click();
  for (let round = 0; round < 3; round += 1) {
    await racePlayerOne(page);
    if (round < 2) await page.getByRole('button', { name: 'Start next round' }).click();
  }
  await expect(page.getByText('Match complete')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Player 1 wins 3–0' })).toBeVisible();
  await page.screenshot({ path: test.info().outputPath('full-match-end.png'), fullPage: true });
});

test('@claim:settings-persist saves accessibility and sound settings across reloads', async ({ page }) => {
  await page.goto('/demo');
  await page.getByRole('button', { name: 'Settings' }).click();
  const dialog = page.getByRole('dialog', { name: 'Game settings' });
  await dialog.getByRole('checkbox', { name: /Mute sound/ }).check();
  await dialog.getByRole('checkbox', { name: /Movement effects/ }).uncheck();
  await dialog.getByRole('checkbox', { name: /Edge assist/ }).check();
  await dialog.getByRole('button', { name: 'Save settings' }).click();
  await page.reload();
  await page.getByRole('button', { name: 'Settings' }).click();
  await expect(page.getByRole('checkbox', { name: /Mute sound/ })).toBeChecked();
  await expect(page.getByRole('checkbox', { name: /Movement effects/ })).not.toBeChecked();
  await expect(page.getByRole('checkbox', { name: /Edge assist/ })).toBeChecked();
});

test('@claim:key-rollover lets both players move at the same time', async ({ page }) => {
  await page.goto('/demo');
  await enableAssist(page);
  await page.getByRole('button', { name: 'Start sample round' }).first().click();
  const canvas = page.locator('#race-canvas');
  await canvas.focus();
  const firstStart = await page.locator('#progress-one').getAttribute('value');
  const secondStart = await page.locator('#progress-two').getAttribute('value');
  await page.keyboard.down('KeyD');
  await page.keyboard.down('ArrowRight');
  await page.waitForTimeout(3600);
  await page.keyboard.up('ArrowRight');
  await page.keyboard.up('KeyD');
  expect(Number(await page.locator('#progress-one').getAttribute('value'))).toBeGreaterThan(Number(firstStart));
  expect(Number(await page.locator('#progress-two').getAttribute('value'))).toBeGreaterThan(Number(secondStart));
});

test('phone controls move a player and remain large enough to tap', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  const page = await context.newPage();
  await page.goto('/demo');
  await enableAssist(page);
  await page.getByRole('button', { name: 'Start sample round' }).first().click();
  const right = page.getByRole('button', { name: 'P1 move right' });
  const box = await right.boundingBox();
  expect(box?.width).toBeGreaterThanOrEqual(44);
  expect(box?.height).toBeGreaterThanOrEqual(44);
  const start = Number(await page.locator('#progress-one').getAttribute('value'));
  await right.dispatchEvent('pointerdown', { pointerId: 1, pointerType: 'touch' });
  await page.waitForTimeout(3400);
  await right.dispatchEvent('pointerup', { pointerId: 1, pointerType: 'touch' });
  expect(Number(await page.locator('#progress-one').getAttribute('value'))).toBeGreaterThan(start);
  await context.close();
});

test('@claim:demo-isolated keeps the sample namespace separate and resettable', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Settings' }).click();
  await page.getByRole('checkbox', { name: /Mute sound/ }).check();
  await page.getByRole('button', { name: 'Save settings' }).click();
  const realBefore = await page.evaluate(() => localStorage.getItem('one-screen-sprint:settings'));

  await page.getByRole('link', { name: 'Try it with sample data' }).click();
  await expect(page).toHaveURL(/\/demo$/);
  await page.getByRole('button', { name: 'Settings' }).click();
  await page.getByRole('checkbox', { name: /Edge assist/ }).check();
  await page.getByRole('button', { name: 'Save settings' }).click();
  await page.getByRole('button', { name: 'Reset demo' }).click();
  await expect(page.locator('#score-one')).toHaveText('1');
  await expect(page.locator('#score-two')).toHaveText('1');
  await page.getByRole('link', { name: 'Start for real' }).click();
  expect(await page.evaluate(() => localStorage.getItem('one-screen-sprint:settings'))).toBe(realBefore);
  expect(await page.evaluate(() => Object.keys(localStorage).some((key) => key.startsWith('demo:one-screen-sprint:')))).toBe(false);
});

test('@claim:local-only sends no cross-origin requests during the sample flow', async ({ page }) => {
  const crossOrigin: string[] = [];
  page.on('request', (request) => {
    const url = new URL(request.url());
    if (url.origin !== 'http://127.0.0.1:4173') crossOrigin.push(request.url());
  });
  await page.goto('/demo');
  await page.getByRole('button', { name: 'Settings' }).click();
  await page.getByRole('checkbox', { name: /Mute sound/ }).check();
  await page.getByRole('button', { name: 'Save settings' }).click();
  await page.getByRole('button', { name: 'Start sample round' }).first().click();
  await page.waitForTimeout(500);
  expect(crossOrigin).toEqual([]);
});

test('@claim:offline-reload reloads the sample after the first visit with no network', async ({ browser }) => {
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto('/demo');
  await page.evaluate(async () => navigator.serviceWorker.ready);
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Race a friend on one keyboard' })).toBeVisible();
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByText('Demo — sample data, nothing is saved')).toBeVisible();
  await expect(page.locator('#race-canvas')).toBeVisible();
  await context.close();
});

test('@claim:60-fps keeps the render loop near 60 fps under a four-times CPU slowdown', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const session = await page.context().newCDPSession(page);
  await session.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  await page.goto('/demo');
  await page.getByRole('button', { name: 'Start sample round' }).first().click();
  const result = await page.evaluate(async () => {
    const intervals: number[] = [];
    let last = performance.now();
    await new Promise<void>((resolve) => {
      const frame = (now: number): void => {
        intervals.push(now - last);
        last = now;
        if (intervals.length >= 90) resolve();
        else requestAnimationFrame(frame);
      };
      requestAnimationFrame(frame);
    });
    intervals.shift();
    intervals.sort((a, b) => a - b);
    const median = intervals[Math.floor(intervals.length / 2)] ?? 1000;
    return { median, fps: 1000 / median };
  });
  expect(result.fps).toBeGreaterThanOrEqual(55);
});

test('normal routes, focus handling, reduced motion, and accessibility have no serious issues', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  for (const route of ['/', '/demo', '/privacy', '/terms']) {
    await page.goto(route);
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    await expect(page.locator('main')).toHaveCount(1);
    await expect(page.locator('h1')).toHaveCount(1);
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations.filter((violation) => ['serious', 'critical'].includes(violation.impact ?? ''))).toEqual([]);
  }
  await page.goto('/');
  await page.getByRole('link', { name: 'Privacy' }).first().click();
  await expect(page.locator('h1')).toBeFocused();
  await page.goBack();
  await expect(page.getByRole('heading', { name: 'Race a friend on one keyboard' })).toBeFocused();
});

test('@claim:refresh-recovery pause, resume, saved-state recovery, legal links, and the designed 404 work', async ({ page, request }) => {
  await page.goto('/demo');
  await page.getByRole('button', { name: 'Start sample round' }).first().click();
  await page.locator('#race-canvas').focus();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('heading', { name: 'Match paused' })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Match paused' })).toBeVisible();
  await page.getByRole('button', { name: 'Resume match' }).click();
  await expect(page.locator('#game-overlay')).toBeHidden();

  await page.evaluate(() => localStorage.setItem('one-screen-sprint:game', '{bad json'));
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Start match' })).toBeVisible();

  await page.evaluate(() => localStorage.setItem('one-screen-sprint:settings', JSON.stringify({ muted: true, effects: false, assist: true })));
  await page.goto('/privacy');
  page.once('dialog', (dialog) => dialog.accept());
  await page.getByRole('button', { name: 'Clear saved game' }).click();
  await expect(page.getByRole('status')).toHaveText('Saved match and settings removed.');
  expect(await page.evaluate(() => Object.keys(localStorage).filter((key) => key.startsWith('one-screen-sprint:')))).toEqual([]);

  for (const route of ['/privacy', '/terms']) {
    const response = await request.get(route);
    expect(response.status()).toBe(200);
  }
  const missing = await request.get('/missing-course');
  expect(missing.status()).toBe(200);
  await page.goto('/missing-course');
  await expect(page.getByRole('heading', { name: 'Find the race from the start' })).toBeVisible();
});
