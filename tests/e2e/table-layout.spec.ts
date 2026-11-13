import { expect, test } from '@playwright/test';
test('two tables, persistent rows and any-day forward fill', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await expect(page.locator('#days .entry-table')).toHaveCount(1);
  await expect(page.locator('#days details')).toHaveCount(0);
  const wednesday = page.locator('.day').nth(2);
  await wednesday.locator('[data-field="start"]').fill('9');
  await wednesday.locator('[data-field="end"]').fill('5p');
  await wednesday.locator('[data-field="end"]').blur();
  await expect(page.locator('.day').nth(4).locator('[data-field="end"]')).toHaveValue('5:00');
  await expect(page.locator('.day').first().locator('[data-field="start"]')).toHaveValue('');
  await wednesday.locator('[data-add-break]').click();
  await expect(page.locator('[data-paid]')).toHaveCount(0);
  await expect(page.locator('#daily-report > table')).toHaveCount(1);
  const report = page.locator('#daily-report > table');
  expect(await report.evaluate((el) => el.outerHTML)).toBe(
    await page.locator('#print-report .summary-table').evaluate((el) => el.outerHTML),
  );
  expect(await page.locator('.report').evaluate((el) => getComputedStyle(el).backgroundColor)).toBe('rgb(255, 255, 255)');
  const positions = await page.evaluate(() => ({
    settings: document.querySelector('.quick-settings')!.getBoundingClientRect().top,
    entry: document.querySelector('#days')!.getBoundingClientRect().top,
    name: document.querySelector('[data-card="name"]')!.getBoundingClientRect().top,
    report: document.querySelector('.report')!.getBoundingClientRect().bottom,
  }));
  expect(positions.settings).toBeLessThan(positions.entry);
  expect(positions.name).toBeLessThan(positions.report);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: 'test-results/two-tables-mobile.png', fullPage: true });
});
