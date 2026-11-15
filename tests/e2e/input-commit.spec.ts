import { test, expect } from '@playwright/test';
test('Detailed commits a real time input before rebuilding rows', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', {name:'Close wizard'}).click();
  const input = page.locator('.day').first().locator('[data-field="start"]');
  await input.fill('855');
  await input.blur();
  await expect(input).toHaveValue('8:55');
});
