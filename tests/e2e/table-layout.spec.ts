import { openDetailed } from "./helpers";
import { expect, test } from '@playwright/test';
test('two tables, persistent rows and any-day forward fill', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openDetailed(page);
  await expect(page.locator('[data-days] .entry-table')).toHaveCount(1);
  await expect(page.locator('[data-days] details')).toHaveCount(0);
  const wednesday = page.locator('.day').nth(2);
  await wednesday.locator('[data-field="start"]').fill('9');
  await wednesday.locator('[data-field="end"]').fill('5p');
  await wednesday.locator('[data-field="end"]').blur();
  await expect(page.locator('.day').nth(4).locator('[data-field="end"]')).toHaveValue('5:00');
  await expect(page.locator('.day').first().locator('[data-field="start"]')).toHaveValue('');
  await wednesday.locator('[data-add-break]').click();
  await expect(page.locator('[data-paid]')).toHaveCount(0);
  await expect(page.locator('#report-body')).toBeEmpty();
  const printed = page.locator('#print-report > .report-hours');
  await expect(printed).toContainText('Wed');
  await expect(page.locator('#print-report .readonly-time-card')).toHaveCount(1);
  const actions = page.locator('#editor .actions');
  await expect(actions.getByRole('button', {name:'Print / PDF',exact:true})).toBeVisible();
  const positions = await page.evaluate(() => ({
    settings: document.querySelector('.quick-settings')!.getBoundingClientRect().top,
    entry: document.querySelector('[data-days]')!.getBoundingClientRect().top,
    name: document.querySelector('[data-card="name"]')!.getBoundingClientRect().top,
    report: document.querySelector('.report')!.getBoundingClientRect().bottom,
  }));
  expect(positions.settings).toBeLessThan(positions.entry);
  expect(positions.name).toBeLessThan(positions.report);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: 'test-results/two-tables-mobile.png', fullPage: true });
});
