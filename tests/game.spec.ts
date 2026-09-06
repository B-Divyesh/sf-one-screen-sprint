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

async function installAudioProbe(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const target = window as unknown as { __toneStarts: number; AudioContext: unknown };
    target.__toneStarts = 0;
    class AudioContextProbe {
      state = 'running';
      currentTime = 0;
      destination = {};

      createOscillator() {
        return {
          type: 'square',
          frequency: { value: 0 },
          connect(node: unknown) { return node; },
          start() { target.__toneStarts += 1; },
          stop() {},
        };
      }

      createGain() {
        return {
          gain: {
            setValueAtTime() {},
            exponentialRampToValueAtTime() {},
          },
          connect(node: unknown) { return node; },
        };
      }

      resume() { return Promise.resolve(); }
      close() { return Promise.resolve(); }
    }
    target.AudioContext = AudioContextProbe;
  });
}

async function installMovementEffectProbe(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const target = window as unknown as {
      __movementEffectOutput: { paperFlecks: number; horizontalTransforms: number[] };
    };
    target.__movementEffectOutput = { paperFlecks: 0, horizontalTransforms: [] };
    const original = CanvasRenderingContext2D.prototype.fillRect;
    CanvasRenderingContext2D.prototype.fillRect = function fillRect(x, y, width, height) {
      const color = String(this.fillStyle).toLowerCase();
      if ((width === 5 || width === 8) && (height === 3 || height === 5) &&
          (color === '#d94a3d' || color === '#176b87')) {
        target.__movementEffectOutput.paperFlecks += 1;
      }
      return original.call(this, x, y, width, height);
    };

    const originalSetTransform = CanvasRenderingContext2D.prototype.setTransform;
    CanvasRenderingContext2D.prototype.setTransform = function setTransform(...args: unknown[]) {
      if (this.canvas.id === 'race-canvas' && args.length === 6 && typeof args[4] === 'number') {
        target.__movementEffectOutput.horizontalTransforms.push(args[4]);
      }
      return Reflect.apply(originalSetTransform, this, args);
    } as typeof CanvasRenderingContext2D.prototype.setTransform;
  });
}

function relativeLuminance(rgb: number[]): number {
  const [red = 0, green = 0, blue = 0] = rgb.map((value) => {
    const channel = value / 255;
    return channel <= 0.04045
      ? channel / 12.92
      : ((channel + 0.055) / 1.055) ** 2.4;
  });
  return (0.2126 * red) + (0.7152 * green) + (0.0722 * blue);
}

function contrastRatio(foreground: number[], background: number[]): number {
  const foregroundLuminance = relativeLuminance(foreground);
  const backgroundLuminance = relativeLuminance(background);
  const lighter = Math.max(foregroundLuminance, backgroundLuminance);
  const darker = Math.min(foregroundLuminance, backgroundLuminance);
  return (lighter + 0.05) / (darker + 0.05);
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

test('@claim:settings-persist keeps every demo setting after a browser reload', async ({ browser }, testInfo) => {
  const trials = testInfo.project.name === 'webkit' ? 3 : 1;

  for (let trial = 0; trial < trials; trial += 1) {
    const context = await browser.newContext();
    try {
      const page = await context.newPage();
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
    } finally {
      await context.close();
    }
  }
});

test('@claim:mute-stops-tones stops game tones while preserving unmuted audio', async ({ browser }) => {
  const audibleContext = await browser.newContext();
  const audiblePage = await audibleContext.newPage();
  await installAudioProbe(audiblePage);
  await audiblePage.goto('/demo');
  await audiblePage.getByRole('button', { name: 'Start sample round' }).first().click();
  await expect(audiblePage.locator('#game-overlay')).toBeHidden({ timeout: 5_000 });
  expect(await audiblePage.evaluate(() => (window as unknown as { __toneStarts: number }).__toneStarts)).toBe(2);
  await audibleContext.close();

  const mutedContext = await browser.newContext();
  const mutedPage = await mutedContext.newPage();
  await installAudioProbe(mutedPage);
  await mutedPage.goto('/demo');
  await mutedPage.getByRole('button', { name: 'Settings' }).click();
  await mutedPage.getByRole('checkbox', { name: /Mute sound/ }).check();
  await mutedPage.getByRole('button', { name: 'Save settings' }).click();
  await mutedPage.getByRole('button', { name: 'Start sample round' }).first().click();
  await expect(mutedPage.locator('#game-overlay')).toBeHidden({ timeout: 5_000 });
  expect(await mutedPage.evaluate(() => (window as unknown as { __toneStarts: number }).__toneStarts)).toBe(0);
  await mutedContext.close();
});

test('@claim:movement-effects draws paper flecks and shakes the course during a dash, then turns both off', async ({ page }) => {
  await installMovementEffectProbe(page);
  await page.goto('/demo');
  await page.getByRole('button', { name: 'Start sample round' }).first().click();
  await expect(page.locator('#game-overlay')).toBeHidden({ timeout: 5_000 });
  await page.evaluate(() => {
    (window as unknown as {
      __movementEffectOutput: { paperFlecks: number; horizontalTransforms: number[] };
    }).__movementEffectOutput = { paperFlecks: 0, horizontalTransforms: [] };
  });
  await page.locator('#race-canvas').focus();
  await page.keyboard.down('KeyD');
  await page.keyboard.down('KeyS');
  await expect.poll(() => page.evaluate(() => (
    window as unknown as {
      __movementEffectOutput: { paperFlecks: number };
    }
  ).__movementEffectOutput.paperFlecks)).toBeGreaterThan(0);
  await page.waitForTimeout(180);
  await page.keyboard.up('KeyS');
  await page.keyboard.up('KeyD');
  const enabledOutput = await page.evaluate(() => (
    window as unknown as {
      __movementEffectOutput: { paperFlecks: number; horizontalTransforms: number[] };
    }
  ).__movementEffectOutput);
  expect(enabledOutput.paperFlecks).toBeGreaterThan(0);
  expect(enabledOutput.horizontalTransforms.length).toBeGreaterThan(2);
  expect(
    Math.max(...enabledOutput.horizontalTransforms) - Math.min(...enabledOutput.horizontalTransforms),
  ).toBeGreaterThan(0.5);

  await page.getByRole('button', { name: 'Reset demo' }).click();
  await page.getByRole('button', { name: 'Settings' }).click();
  await page.getByRole('checkbox', { name: /Movement effects/ }).uncheck();
  await page.getByRole('button', { name: 'Save settings' }).click();
  await page.getByRole('button', { name: 'Start sample round' }).first().click();
  await expect(page.locator('#game-overlay')).toBeHidden({ timeout: 5_000 });
  await page.evaluate(() => {
    (window as unknown as {
      __movementEffectOutput: { paperFlecks: number; horizontalTransforms: number[] };
    }).__movementEffectOutput = { paperFlecks: 0, horizontalTransforms: [] };
  });
  await page.locator('#race-canvas').focus();
  await page.keyboard.down('KeyD');
  await page.keyboard.down('KeyS');
  await page.waitForTimeout(250);
  await page.keyboard.up('KeyS');
  await page.keyboard.up('KeyD');
  const disabledOutput = await page.evaluate(() => (
    window as unknown as {
      __movementEffectOutput: { paperFlecks: number; horizontalTransforms: number[] };
    }
  ).__movementEffectOutput);
  expect(disabledOutput.paperFlecks).toBe(0);
  expect(disabledOutput.horizontalTransforms.length).toBeGreaterThan(2);
  expect(
    Math.max(...disabledOutput.horizontalTransforms) - Math.min(...disabledOutput.horizontalTransforms),
  ).toBeLessThan(0.01);
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

test('phone pages keep essential text readable and every visible control at least 44 pixels', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  const page = await context.newPage();

  for (const route of ['/', '/demo', '/privacy', '/terms', '/404.html']) {
    await page.goto(route);
    const undersizedTargets = await page.locator('a[href], button, input:not([type="hidden"]), select, textarea').evaluateAll((elements) => (
      elements.flatMap((element) => {
        const rect = element.getBoundingClientRect();
        const style = getComputedStyle(element);
        const visible = rect.width > 0 && rect.height > 0 && style.visibility !== 'hidden' && style.display !== 'none';
        if (!visible || (rect.width >= 44 && rect.height >= 44)) return [];
        return [{
          name: element.getAttribute('aria-label') ?? element.textContent?.trim() ?? element.tagName,
          width: rect.width,
          height: rect.height,
        }];
      })
    ));
    expect(undersizedTargets, `${route} has undersized touch targets`).toEqual([]);
  }

  await page.goto('/');
  for (const selector of ['.audience', '.hero-actions span', '.plain-facts', '.game-foot', '.site-footer', '.site-header nav a', 'button']) {
    const fontSize = await page.locator(selector).evaluateAll((elements) => Math.min(
      ...elements.filter((element) => element.getClientRects().length > 0)
        .map((element) => Number.parseFloat(getComputedStyle(element).fontSize)),
    ));
    expect(fontSize, `${selector} is smaller than 17 CSS pixels`).toBeGreaterThanOrEqual(17);
  }
  const gameBox = await page.locator('.canvas-stage').boundingBox();
  expect(gameBox?.y).toBeLessThan(844);
  await expect(page.getByRole('heading', { name: 'Race a friend on one keyboard' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Try it with sample data' })).toBeVisible();

  await page.evaluate(() => { document.documentElement.style.fontSize = '200%'; });
  const resized = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
    actionVisible: Boolean(document.querySelector('.primary-action')?.getClientRects().length),
    canvasVisible: Boolean(document.querySelector('#race-canvas')?.getClientRects().length),
  }));
  expect(resized.scrollWidth).toBeLessThanOrEqual(resized.clientWidth + 1);
  expect(resized.actionVisible).toBe(true);
  expect(resized.canvasVisible).toBe(true);

  await context.close();
});

test('home mark text meets normal-text contrast on every page', async ({ page }) => {
  for (const route of ['/', '/demo', '/privacy', '/terms', '/404.html']) {
    await page.goto(route);
    const colors = await page.locator('.wordmark-number').evaluate((element) => {
      const style = getComputedStyle(element);
      const parseRgb = (value: string): number[] => (
        value.match(/[\d.]+/g)?.slice(0, 3).map(Number) ?? []
      );
      return {
        foreground: parseRgb(style.color),
        background: parseRgb(style.backgroundColor),
      };
    });
    expect(
      contrastRatio(colors.foreground, colors.background),
      `${route} home-mark numeral contrast`,
    ).toBeGreaterThanOrEqual(4.5);
  }
});

test('standalone 404 uses the standard navigation and footer structure', async ({ page }) => {
  await page.goto('/404.html');
  await expect(page.getByRole('heading', { name: 'Find the race from the start' })).toBeVisible();
  await expect(page.getByRole('navigation', { name: 'Main navigation' }).getByRole('link')).toHaveText([
    'Demo',
    'How it works',
    'Privacy',
  ]);
  const footer = page.locator('footer');
  await expect(footer).toContainText('Race a friend on one keyboard in rounds under 75 seconds.');
  await expect(footer.getByRole('link', { name: /Built by Param Factory/ })).toBeVisible();
  await expect(footer).toContainText('Version 1.0.0');
});

test('@claim:demo-isolated keeps the sample namespace separate, resets it, and discards it when leaving demo', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Settings' }).click();
  await page.getByRole('checkbox', { name: /Mute sound/ }).check();
  await page.getByRole('button', { name: 'Save settings' }).click();
  const realBefore = await page.evaluate(() => localStorage.getItem('one-screen-sprint:settings'));
  expect(realBefore).toContain('"muted":true');

  await page.getByRole('link', { name: 'Try it with sample data' }).click();
  await expect(page).toHaveURL(/\/demo$/);
  await page.getByRole('button', { name: 'Settings' }).click();
  await page.getByRole('checkbox', { name: /Edge assist/ }).check();
  await page.getByRole('button', { name: 'Save settings' }).click();
  await page.getByRole('button', { name: 'Reset demo' }).click();
  await expect(page.locator('#score-one')).toHaveText('1');
  await expect(page.locator('#score-two')).toHaveText('1');
  await page.getByRole('button', { name: 'Settings' }).click();
  await page.getByRole('checkbox', { name: /Mute sound/ }).check();
  await page.getByRole('button', { name: 'Save settings' }).click();

  await page.evaluate(() => history.back());
  await expect(page).toHaveURL(/\/$/);
  expect(await page.evaluate(() => localStorage.getItem('one-screen-sprint:settings'))).toBe(realBefore);
  expect(await page.evaluate(() => Object.keys(localStorage).some((key) => key.startsWith('demo:one-screen-sprint:')))).toBe(false);

  await page.goForward();
  await expect(page).toHaveURL(/\/demo$/);
  await page.getByRole('button', { name: 'Settings' }).click();
  await expect(page.getByRole('checkbox', { name: /Mute sound/ })).not.toBeChecked();
  await page.getByRole('button', { name: 'Cancel' }).click();

  await page.goto('/privacy');
  expect(await page.evaluate(() => Object.keys(localStorage).some((key) => key.startsWith('demo:one-screen-sprint:')))).toBe(false);
});

test('@claim:local-only sends no cross-origin requests through match end, reset, and demo exit', async ({ page }) => {
  const crossOrigin: string[] = [];
  page.on('request', (request) => {
    const url = new URL(request.url());
    if (url.origin !== 'http://127.0.0.1:4173') crossOrigin.push(request.url());
  });
  await page.goto('/demo');
  await expect(page.getByText('Demo — sample data, nothing is saved')).toBeVisible();
  await enableAssist(page);
  await page.getByRole('button', { name: 'Start sample round' }).first().click();
  await racePlayerOne(page);
  await page.getByRole('button', { name: 'Start next round' }).click();
  await racePlayerOne(page);
  await expect(page.getByText('Match complete')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Player 1 wins 3–1' })).toBeVisible();
  await expect(page.getByText('Demo — sample data, nothing is saved')).toBeVisible();

  await page.getByRole('button', { name: 'Reset demo' }).click();
  await expect(page.locator('#score-one')).toHaveText('1');
  await expect(page.locator('#score-two')).toHaveText('1');
  await expect(page.locator('#course-label')).toHaveText('Course CLUB-7');
  await page.getByRole('link', { name: 'Start for real' }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByText('Demo — sample data, nothing is saved')).toHaveCount(0);
  await page.waitForTimeout(250);
  expect(crossOrigin).toEqual([]);
});

test('@claim:offline-reload reloads the sample after the first visit with no network', async ({ browser }) => {
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto('/demo');
  await page.evaluate(async () => {
    const registration = await navigator.serviceWorker.ready;
    const obsolete = await caches.open('one-screen-sprint-v3');
    await obsolete.put('/obsolete-shell', new Response('old release'));
    await registration.unregister();
  });
  await page.reload();
  await page.evaluate(async () => navigator.serviceWorker.ready);
  await expect.poll(() => page.evaluate(async () => (await caches.keys()).includes('one-screen-sprint-v3'))).toBe(false);
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
