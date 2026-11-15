import { openDetailed } from "./helpers";
import { test, expect } from '@playwright/test';
test('weekly default and compact page', async ({page}) => {
  await openDetailed(page);
  await expect(page.locator('.overtime-rule')).toHaveValue('weekly');
  await page.locator('[data-setting="rate"]').fill('20');
  await page.locator('[data-setting="rate"]').blur();
  await expect(page.locator('#daily-report .pay-summary')).not.toContainText('USD');
  await expect(page.locator('#daily-report .pay-summary')).toContainText('$20.00');
  await expect(page.locator('#help')).toBeVisible();
  await page.locator('.site-header').getByRole('link', {name:'Help'}).click();
  await expect(page.locator('#help-details')).toHaveCount(0);
});
