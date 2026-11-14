import { test, expect } from "@playwright/test";
test("client project fields persist, export and print with working navigation", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/with-lunch/");
  await page.locator('[data-card="client"]').fill("Acme <Client>");
  await page.locator('[data-card="project"]').fill("Website");
  await page.reload();
  await expect(page.locator('[data-card="client"]')).toHaveValue("Acme <Client>");
  await expect(page.locator('[data-card="project"]')).toHaveValue("Website");
  await expect(page.locator('#print-report')).toContainText("Acme <Client>");
  await expect(page.locator('#print-report')).toContainText("Website");
  const download = page.waitForEvent("download");
  await page.locator('#csv').click();
  const file = await download;
  const { readFile } = await import("node:fs/promises");
  expect(await readFile((await file.path())!, "utf8")).toContain('"Client","Acme <Client>","Project","Website"');
  await expect(page.locator('#templates')).toHaveCount(0);
  await expect(page.locator('#help')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: 'test-results/client-project-mobile.png', fullPage: true });
  await page.locator('.brand').click();
  await expect(page).toHaveURL(/\/$/);
  for (const anchor of ['lunch', 'biweekly', 'decimal-settings']) {
    await page.locator(`#shortcuts a[href="#${anchor}"]`).click();
    await expect(page.locator(`#${anchor}`)).toBeVisible();
    await expect(page.locator(`#${anchor}`)).toHaveCount(1);
  }
  await page.locator('#add-time-card').click();
  await expect(page.locator('#lunch')).toHaveCount(1);
  await expect(page.locator('#biweekly')).toHaveCount(1);
  expect(errors).toEqual([]);
});
test("all static entry paths have independent canonicals and survive refresh", async ({
  page,
}) => {
  for (const route of ["/", "/with-lunch/", "/biweekly/", "/decimal/"]) {
    await page.goto(route);
    await page.reload();
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      "href",
      "https://hourscalculator.io" + route,
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
test('browser storage refusal reports draft save failures', async ({ page }) => {
  await page.addInitScript(() => {
    Storage.prototype.setItem = () => { throw new DOMException('Storage denied', 'QuotaExceededError'); };
  });
  await page.goto('/');
  await page.locator('[data-card="name"]').fill('Unsaved worker');
  await expect(page.locator('#save-status')).toContainText('Save failed');
  await expect(page.locator('#templates')).toHaveCount(0);
});
