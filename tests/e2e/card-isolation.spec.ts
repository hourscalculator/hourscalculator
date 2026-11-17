import { openDetailed } from "./helpers";
import { test, expect } from '@playwright/test';

test('copied cards preserve independent periods and daily breaks after reload', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await openDetailed(page);
  await page.locator('[data-card="name"]').fill('First');
  await page.locator('[data-card="length"]').selectOption('2');
  await page.locator('[data-bulk-break]').click();
  await page.locator('#add-time-card').click();
  await page.locator('[data-card="name"]').last().fill('Second');
  await page.locator('[data-card="length"]').last().selectOption('3');
  const second = page.locator('.worker-card').last();
  while (await second.locator('[data-delete-duration]').count()) await second.locator('[data-delete-duration]').first().click();
  await page.locator('[data-bulk-minutes]').last().fill('45');
  await page.locator('[data-bulk-break]').last().click();
  await page.locator('#add-time-card').click();
  await expect(page.locator('[data-card="length"]').last()).toHaveValue('3');
  await expect(page.locator('[data-bulk-minutes]').last()).toHaveValue('30');
  await page.locator('[data-card="name"]').last().fill('Third');
  await page.locator('.date-range-control').last().click();
  await page.locator('[data-range-day]').nth(2).click();
  await page.locator('[data-range-day]').nth(5).click();
  await page.locator('#apply-dates').click();
  const ranges = await page.locator('.date-range-control').allTextContents();
  await page.reload();
  for (const [index, period] of ['2', '3', 'custom'].entries()) {
    await expect(page.locator('[data-card="length"]').nth(index)).toHaveValue(period);
    await expect(page.locator('[data-bulk-minutes]').nth(index)).toHaveValue('30');
    await expect(page.locator('.date-range-control').nth(index)).toHaveText(ranges[index]!);
    if (index < 2) await expect(page.locator('.worker-card').nth(index).locator('[data-duration-date]').first()).toHaveValue(index === 0 ? '30' : '45');
  }
  expect(errors).toEqual([]);
});
