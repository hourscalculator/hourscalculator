import { openDetailed } from "./helpers";
import { expect, test } from "@playwright/test";
test("reload, CSV download, copied report and print", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: {
      write: async (items: ClipboardItem[]) => { (window as unknown as {copied: string}).copied = await (await items[0].getType('text/plain')).text(); },
      writeText: async (value: string) => { (window as unknown as {copied: string}).copied = value; },
    }});
  });
  await openDetailed(page);
  await page.locator('[data-card="name"]').fill("Alex");
  await page.locator(".day").last().locator(".work-fields input").nth(0).fill("9");
  await page.locator(".day").last().locator(".work-fields input").nth(1).fill("5p");
  await page.locator(".day").last().locator(".work-fields input").nth(1).blur();
  await page.reload();
  await expect(page.locator("#daily-report .report-grand-total .report-total td:first-of-type")).toHaveText("8:00");
  const download = page.waitForEvent("download");
  await page.locator("#csv").click();
  const file = await download;
  await file.saveAs("test-results/time-card.csv");
  const { readFile } = await import("node:fs/promises");
  expect(await readFile("test-results/time-card.csv", "utf8")).toContain(
    '"480","8:00","8.00"',
  );
  await page.locator("#share").click();
  await expect(page.locator("#save-status")).toHaveText("Share link copied");
  const url = await page.evaluate(() => (window as unknown as {copied: string}).copied);
  expect(url).toContain('#report=');
  await page.locator('[data-card="name"]').fill("Local");
  await page.goto(url);
  await expect(page.locator("#readonly-view")).toBeVisible();
  await expect(page.locator("#editor")).toBeHidden();
  await expect(page.locator("#approval-receipt")).toBeHidden();
  await expect(page.locator("input:visible, select:visible")).toHaveCount(0);
  await expect(page.locator("#readonly-report")).toContainText("Alex");
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('time-card-v1')!).name)).toBe('Local');
  await page.screenshot({ path: "test-results/shared-report.png", fullPage: true });
  await page.emulateMedia({ media: "print" });
  await expect(page.locator("#print-report")).toBeVisible();
  await expect(page.locator("#print-report")).toContainText("8:00");
  await page.screenshot({ path: "test-results/print.png", fullPage: true });
});
test("damaged storage survives editing", async ({ page }) => {
  await openDetailed(page);
  await page.evaluate(() => localStorage.setItem("time-card-v1", "broken"));
  await page.reload();
  await expect(page.locator("#save-status")).toContainText("preserved");
  await page.locator('[data-card="name"]').fill("New");
  expect(await page.evaluate(() => localStorage.getItem("time-card-v1"))).toBe(
    "broken",
  );
});
test("populated month prints across multiple pages", async ({
  page,
  browserName,
}) => {
  const { createCard, addEntry, setMinute } =
    await import("../../src/state/card");
  const c = createCard("2026-11-09");
  c.length = "month";
  c.name = "Monthly report";
  c.settings.rate = 2000;
  for (let day = 1; day <= 30; day++) {
    const e = addEntry(
      c,
      `2026-11-${String(day).padStart(2, "0")}`,
      `month-${day}`,
    );
    setMinute(c, e, e.start, 540);
    setMinute(c, e, e.end, 1020);
  }
  await openDetailed(page);
  await page.evaluate(
    (data) => localStorage.setItem("time-card-v1", JSON.stringify(data)),
    c,
  );
  await page.reload();
  await expect(page.locator("#daily-report .report-grand-total .report-total td:first-of-type")).toHaveText("240:00");
  await page.emulateMedia({ media: "print" });
  await expect(page.locator("#print-report .employee-report .summary-table > tbody:not(.pay-summary) > tr:not(.report-total)")).toHaveCount(30);
  await expect(page.locator("#print-report .employee-report .summary-table > tbody:not(.pay-summary) > .report-total")).toContainText("240:00");
  await page.screenshot({
    path: `test-results/month-print-${browserName}.png`,
    fullPage: true,
  });
  if (browserName === "chromium") {
    const pdf = await page.pdf({
      path: "test-results/month-report.pdf",
      format: "A4",
    });
    expect(pdf.length).toBeGreaterThan(10000);
  }
});
