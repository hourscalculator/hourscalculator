import { expect, test } from '@playwright/test';
test('four overtime choices share calculation and day layout', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await expect(page.locator('.entry-table thead th')).toHaveCount(0);
  const day = page.locator('.day').last();
  await day.locator('[data-field="start"]').fill('5a');
  await day.locator('[data-field="end"]').fill('8p');
  await day.locator('[data-field="end"]').blur();
  const choice = page.locator('#overtime-rule');
  await expect(choice.locator('option')).toHaveCount(4);
  for (const [value, expected] of [['none', '15:00 / 0:00 / 0:00'], ['weekly', '15:00 / 0:00 / 0:00'], ['daily', '8:00 / 7:00 / 0:00'], ['ca', '8:00 / 4:00 / 3:00']]) {
    await choice.selectOption(value);
    await expect(page.locator('#regular')).toHaveText(expected);
  }
  const track = await day.locator('.timeline').boundingBox();
  const input = await day.locator('.period').boundingBox();
  expect(Math.abs(track!.x - input!.x)).toBeLessThan(2);
  expect(track!.y).toBeLessThan(input!.y);
  const formula = page.locator('#daily-report .pay-summary');
  await expect(formula.locator('tr').nth(2).locator('.operator')).toHaveText(['+', '=']);
  expect(await formula.locator('td').first().evaluate((el) => getComputedStyle(el).borderTopWidth)).toBe('0px');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: 'test-results/overtime-layout-mobile.png', fullPage: true });
});
