import { openDetailed } from "./helpers";
import { expect, test } from "@playwright/test";
test("month, context, desktop and lifecycle", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await openDetailed(page);
  await page.locator("#settings").evaluate((e) => e.setAttribute("open", ""));
  await page.locator('[data-card="length"]').selectOption("custom");
  await page.locator('[data-custom-start]').fill('2026-11-01');
  await page.locator('[data-custom-end]').fill('2026-11-30');
  expect(await page.locator(".day").count()).toBeGreaterThanOrEqual(28);
  await page.locator("[data-add]").first().evaluate((e) => {
    for (let parent = e.parentElement; parent; parent = parent.parentElement)
      if (parent.tagName === "DETAILS") parent.setAttribute("open", "");
  });
  await page.locator("[data-add]").first().click();
  await page.locator("[data-remove]").first().click();
  await page.screenshot({ path: "test-results/desktop.png", fullPage: true });
  expect(errors).toEqual([]);
});
