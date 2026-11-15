import { openDetailed } from "./helpers";
import { expect, test } from "@playwright/test";
test("timeline keyboard and real drag share state, cancellation rolls back preview", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await openDetailed(page);
  const inputs = page.locator(".day").last().locator(".work-fields input");
  await inputs.nth(0).fill("9");
  await inputs.nth(1).fill("5p");
  await inputs.nth(1).blur();
  let handle = page.locator(".day").last().locator('[data-handle="start"]').first();
  await handle.focus();
  await page.keyboard.press("ArrowRight");
  await expect(inputs.nth(0)).toHaveValue("9:05");
  const before = await inputs.nth(0).inputValue();
  let box = await handle.boundingBox();
  await page.mouse.move(box!.x + 22, box!.y + 22);
  await page.mouse.down();
  await page.mouse.move(box!.x + 60, box!.y + 22);
  await expect(handle.locator(".endpoint-time")).toBeVisible();
  await expect(handle.locator(".endpoint-time")).toContainText(":");
  await handle.dispatchEvent("pointercancel", { pointerId: 1 });
  await expect(handle.locator(".endpoint-time")).toBeHidden();
  await page.mouse.up();
  await expect(inputs.nth(0)).toHaveValue(before);
  handle = page.locator(".day").last().locator('[data-handle="start"]').first();
  box = await handle.boundingBox();
  await page.mouse.move(box!.x + 22, box!.y + 22);
  await page.mouse.down();
  await page.mouse.move(box!.x + 60, box!.y + 22);
  await page.mouse.up();
  await expect(inputs.nth(0)).not.toHaveValue(before);
  expect(errors).toEqual([]);
});
test("tap empty timeline leaves work periods unchanged", async ({ page }) => {
  await openDetailed(page);
  const track = page.locator(".timeline").first();
  await track.click({ position: { x: 100, y: 32 } });
  await expect(page.locator('[data-handle="start"]')).toHaveCount(0);
  await expect(page.locator("#daily-report .report-grand-total .report-total td:first-of-type")).toHaveText("0:00");
});
test("mobile touch scroll preserves input and handles have 44px targets", async ({
  page,
  browserName,
}) => {
  test.skip(browserName !== "chromium", "Chromium touch dispatch");
  await page.setViewportSize({ width: 390, height: 844 });
  await openDetailed(page);
  await page.locator(".day").last().locator(".work-fields input").nth(0).fill("855");
  await page.locator(".day").last().locator(".work-fields input").nth(1).fill("5p");
  await page.locator(".day").last().locator(".work-fields input").nth(1).blur();
  const before = await page.locator("#daily-report .report-grand-total .report-total td:first-of-type").textContent();
  const box = await page.locator("[data-handle]").first().boundingBox();
  expect(box!.width).toBeGreaterThanOrEqual(44);
  expect(box!.height).toBeGreaterThanOrEqual(44);
  const session = await page.context().newCDPSession(page);
  await session.send("Emulation.setTouchEmulationEnabled", { enabled: true });
  await page.evaluate(() => scrollTo(0, 0));
  await session.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [{ x: 200, y: 700 }],
  });
  for (let y = 650; y >= 300; y -= 50)
    await session.send("Input.dispatchTouchEvent", {
      type: "touchMove",
      touchPoints: [{ x: 200, y }],
    });
  await session.send("Input.dispatchTouchEvent", {
    type: "touchEnd",
    touchPoints: [],
  });
  await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(0);
  await expect(page.locator("#daily-report .report-grand-total .report-total td:first-of-type")).toHaveText(before!);
  await page.screenshot({ path: "test-results/mobile-viewport.png" });
});
