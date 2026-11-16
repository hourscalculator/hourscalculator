import { readFile, writeFile } from 'node:fs/promises';
import { chromium } from '@playwright/test';

const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
  await page.setContent(await readFile(new URL('./templates/og-image.html', import.meta.url), 'utf8'));
  await page.evaluate(() => document.fonts.ready);
  const png = await page.screenshot({ type: 'png' });
  if (png.length >= 300_000) throw new Error(`Social image exceeds 300KB: ${png.length} bytes`);
  await writeFile(new URL('../dist/og-image.png', import.meta.url), png);
  console.log(`Generated og-image.png: 1200×630, ${png.length} bytes`);
} finally {
  await browser.close();
}
