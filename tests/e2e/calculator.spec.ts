import { openDetailed } from "./helpers";
import { expect, test } from "@playwright/test";
test.beforeEach(async ({ page }) => {
  await openDetailed(page);
});
test("table entry, breaks, totals and 390px layout", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const inputs = page.locator(".day").last().locator(".work-fields input");
  await inputs.nth(0).fill("9");
  await inputs.nth(1).fill("5p");
  await inputs.nth(1).blur();
  await expect(page.locator("#daily-report .report-grand-total .report-total td:first-of-type")).toHaveText("8:00");
  await page.locator(".day").last().locator("[data-add-break]").first().click();
  await expect(page.locator('.day').last().locator('[data-duration-date]')).toHaveValue('30');
  await expect(page.locator("#daily-report .report-grand-total .report-total td:first-of-type")).toHaveText("7:30");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({ path: "test-results/mobile.png", fullPage: true });
});
test("invalid partial draft blocks delivery", async ({ page }) => {
  await page.locator(".day").last().locator(".work-fields input").first().fill("999");
  await page.locator(".day").last().locator(".work-fields input").first().blur();
  const downloads: string[] = [];
  page.on("download", file => downloads.push(file.suggestedFilename()));
  await page.locator("#csv").click();
  await expect(page.locator(".day").last().locator(".work-fields input").first()).toHaveAttribute("aria-invalid", "true");
  expect(downloads).toEqual([]);
  await expect(page.locator(".day").last().locator(".field-message").first()).toBeVisible();
});
test("format changes preserve exact minutes and dates", async ({ page }) => {
  await page.locator(".day").last().locator(".work-fields input").nth(0).fill("855");
  await page.locator(".day").last().locator(".work-fields input").nth(1).fill("5p");
  await page.locator(".day").last().locator(".work-fields input").nth(1).blur();
  await page.locator("#settings").evaluate((e) => e.setAttribute("open", ""));
  await page.locator('[data-card="format"]').selectOption("24");
  await expect(page.locator(".day").last().locator(".work-fields input").nth(0)).toHaveValue("08:55");
  await expect(page.locator("#daily-report .report-grand-total .report-total td:first-of-type")).toHaveText("8:05");
});

test('header fields align and settings affordance is visible',async({page})=>{
 const name=await page.locator('[data-card="project"]').boundingBox(), date=await page.locator('[data-choose-dates]').boundingBox();
 expect(Math.abs(name!.y-date!.y)).toBeLessThan(2);
 await expect(page.locator('.settings-arrow')).toBeVisible();await page.locator('#settings > summary').click();await expect(page.locator('#settings')).toHaveAttribute('open',''); await expect(page.locator('[data-setting="weekStart"]')).toBeVisible();
 await page.screenshot({path:'test-results/header-fix.png'});
});
