import { chromium } from '@playwright/test';
import { writeFile } from 'node:fs/promises';

const browser = await chromium.launch();
const page = await browser.newPage();
const routes = ['/', '/demo', '/privacy', '/terms', '/verification-5-missing'];
const results = [];

function channel(value) {
  const normalized = value / 255;
  return normalized <= 0.04045
    ? normalized / 12.92
    : ((normalized + 0.055) / 1.055) ** 2.4;
}

function luminance(rgb) {
  return (0.2126 * channel(rgb[0])) + (0.7152 * channel(rgb[1])) + (0.0722 * channel(rgb[2]));
}

function contrast(foreground, background) {
  const lighter = Math.max(luminance(foreground), luminance(background));
  const darker = Math.min(luminance(foreground), luminance(background));
  return (lighter + 0.05) / (darker + 0.05);
}

for (const route of routes) {
  const response = await page.goto(`https://one-screen-sprint.sociobot.in${route}`, { waitUntil: 'networkidle' });
  const style = await page.locator('.wordmark-number').evaluate((element) => {
    const computed = getComputedStyle(element);
    return {
      color: computed.color,
      backgroundColor: computed.backgroundColor,
      fontSize: computed.fontSize,
      fontWeight: computed.fontWeight,
    };
  });
  const parse = (value) => value.match(/[\d.]+/g).slice(0, 3).map(Number);
  const ratio = contrast(parse(style.color), parse(style.backgroundColor));
  results.push({ route, status: response.status(), ...style, contrastRatio: ratio, requiredRatio: 4.5, passes: ratio >= 4.5 });
}

await browser.close();
await writeFile(new URL('./contrast-check.json', import.meta.url), `${JSON.stringify(results, null, 2)}\n`);
console.log(JSON.stringify(results, null, 2));
