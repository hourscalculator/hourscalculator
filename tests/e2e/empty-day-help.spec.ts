import { openDetailed } from "./helpers";
import { test, expect } from '@playwright/test';
test('last removal persists empty day and overtime help opens', async ({page}) => {
  await openDetailed(page);
  const day = page.locator('.day').first();
  await day.locator('[data-remove]').click();
  await expect(day.locator('.period')).toHaveCount(0);
  await expect(day.locator('button')).toHaveCount(3);
  await page.reload();
  await expect(day.locator('.period')).toHaveCount(0);
  await day.locator('[data-add-break]').click();
  await expect(day.locator('[data-duration-date]')).toHaveCount(1);
  await page.getByRole('button', {name:'Explain overtime'}).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.getByRole('dialog')).toContainText('Over 40 hours a week');
  await expect(page.getByRole('dialog')).toContainText('seventh');
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).not.toBeVisible();
});
