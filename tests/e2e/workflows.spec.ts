import { test, expect } from "@playwright/test";
test("entry presets, preserved drafts, templates and read-only receipts", async ({
  page,
  browserName,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/with-lunch");
  await expect(page.locator('[data-setting="auto"]')).toBeChecked();
  await expect(page.locator('[data-card="length"]')).toHaveValue("1");
  await page.locator('[data-card="name"]').fill("Worker A");
  await page.goto("/decimal");
  await expect(page.locator('[data-card="name"]')).toHaveValue("Worker A");
  await page.locator("#settings").evaluate((e) => e.setAttribute("open", ""));
  page.on("dialog", (d) => d.accept());
  await page.locator("#preset").selectOption("freelancer");
  await page.locator("#apply-preset").click();
  await expect(page.locator('#overtime-rule')).toHaveValue("none");
  await page.locator('[data-card="length"]').selectOption("custom");
  const anchor = await page.locator('[data-card="anchor"]').inputValue();
  await page.locator('[data-card="endDate"]').fill(anchor);
  await page
    .locator("summary")
    .filter({ hasText: "Templates and approval receipts" })
    .click();
  await page.locator("#template-name").fill("Hourly rules");
  await page.locator("#save-template").click();
  await expect(page.locator("#templates")).toContainText("Hourly rules");
  await page.locator('[data-setting="round"]').selectOption("two");
  await page.locator("#apply-template").click();
  await expect(page.locator('[data-setting="round"]')).toHaveValue("none");
  await expect(page.locator('[data-card="name"]')).toHaveValue("Worker A");
  await page.locator("#readonly-share").click();
  await expect(page.locator("#share-url")).toHaveValue(/#readonly=/);
  const link = await page.locator("#share-url").inputValue();
  await page.goto(link);
  await expect(page.locator("#readonly-view")).toBeVisible();
  await expect(page.locator("#editor")).toBeHidden();
  await expect(page.locator("#readonly-report")).toContainText("Worker A");
  await page.locator("#reviewer").fill("Reviewer");
  await page.locator("#review-note").fill("Checked");
  await page.locator("#make-receipt").click();
  const receipt = await page.locator("#receipt-output").inputValue();
  expect(receipt).toContain("#receipt=");
  await page.screenshot({
    path: `test-results/readonly-${browserName}.png`,
    fullPage: true,
  });
  await page.goto("/");
  await page
    .locator("summary")
    .filter({ hasText: "Templates and approval receipts" })
    .click();
  await page.locator("#receipt-input").fill(receipt);
  await page.locator("#import-receipt").click();
  await expect(page.locator("#receipts")).toContainText(
    "Matches current snapshot",
  );
  await page.locator('[data-card="name"]').fill("Changed");
  await expect(page.locator("#receipts")).toContainText(
    "older or different snapshot",
  );
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  expect(errors).toEqual([]);
});
test("all static entry paths have independent canonicals and survive refresh", async ({
  page,
}) => {
  for (const route of ["/", "/with-lunch", "/biweekly", "/decimal"]) {
    await page.goto(route);
    await page.reload();
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      "href",
      "https://example.test" + route,
    );
    await expect(page.locator(".day").first()).toBeVisible();
  }
});
test("monthly employee reports retain identity in print and independently sum CSV", async ({
  page,
  browserName,
}) => {
  const { createCard, addEmployee, addEntry, setMinute } =
    await import("../../src/state/card");
  const c = createCard("2026-11-09");
  c.length = "month";
  c.name = "Employee Alpha";
  c.settings.rate = 2000;
  function populate(prefix: string) {
    for (let day = 1; day <= 30; day++) {
      const e = addEntry(
        c,
        `2026-11-${String(day).padStart(2, "0")}`,
        prefix + day,
      );
      setMinute(c, e, e.start, 540);
      setMinute(c, e, e.end, 1020);
    }
  }
  populate("alpha");
  addEmployee(c, "beta");
  c.name = "Employee Beta";
  c.settings.rate = 2000;
  populate("beta");
  await page.goto("/");
  await page.evaluate(
    (value) => localStorage.setItem("time-card-v1", JSON.stringify(value)),
    c,
  );
  await page.reload();
  const download = page.waitForEvent("download");
  await page.locator("#csv").click();
  const file = await download;
  await file.saveAs(`test-results/multi-${browserName}.csv`);
  const { readFile } = await import("node:fs/promises");
  const csv = await readFile(`test-results/multi-${browserName}.csv`, "utf8");
  expect(csv).toContain('"Table total cents","1088000","USD"');
  expect(csv.match(/\uFEFF/g)).toHaveLength(1);
  await page.screenshot({
    path: `test-results/multi-desktop-${browserName}.png`,
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: `test-results/multi-mobile-${browserName}.png`,
  });
  await page.emulateMedia({ media: "print" });
  await expect(page.locator("#print-report .employee-report")).toHaveCount(2);
  await page.screenshot({
    path: `test-results/multi-print-${browserName}.png`,
    fullPage: true,
  });
  if (browserName === "chromium")
    await page.pdf({ path: "test-results/multi-month.pdf", format: "A4" });
});
test('browser storage refusal reports draft and template save failures', async ({ page }) => {
  await page.addInitScript(() => {
    Storage.prototype.setItem = () => { throw new DOMException('Storage denied', 'QuotaExceededError'); };
  });
  await page.goto('/');
  await page.locator('[data-card="name"]').fill('Unsaved worker');
  await expect(page.locator('#save-status')).toContainText('Save failed');
  await page.locator('summary').filter({ hasText: 'Templates and approval receipts' }).click();
  await page.locator('#template-name').fill('Unsaved template');
  await page.locator('#save-template').click();
  await expect(page.locator('#save-status')).toContainText('Storage denied');
  await expect(page.locator('#templates option')).toHaveCount(0);
});
