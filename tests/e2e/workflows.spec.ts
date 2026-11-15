import { openDetailed } from "./helpers";
import { test, expect } from "@playwright/test";
test("client project fields persist, export and print with working navigation", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/with-lunch/");
  await page.locator('#settings').evaluate((node: HTMLDetailsElement) => node.open = true);
  await page.getByLabel('Show Client', {exact:true}).check();
  await page.getByLabel('Show Project', {exact:true}).check();
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
  await expect(page.locator('#templates')).toHaveCount(1);
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
    if (route === "/") await openDetailed(page);
    else await page.goto(route);
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
  await openDetailed(page);
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
  await openDetailed(page);
  await page.locator('[data-card="name"]').fill('Unsaved worker');
  await expect(page.locator('#save-status')).toContainText('Save failed');
  await page.locator('summary').filter({ hasText: 'Templates and approval receipts' }).click();
  await page.locator('#template-name').fill('Unsaved template');
  await page.locator('#save-template').click();
  await expect(page.locator('#save-status')).toContainText('Storage denied');
  await expect(page.locator('#templates option')).toHaveCount(0);
});

test("restored templates and approval lifecycle", async ({ page, browserName }) => {
  const { createCard, addEntry, setMinute } = await import("../../src/state/card");
  const card = createCard("2026-11-09");
  card.name = "Worker A";
  card.client = "Client A";
  card.project = "Project A";
  card.settings.rate = 2000;
  const entry = addEntry(card, "2026-11-09", "work");
  setMinute(card, entry, entry.start, 540);
  setMinute(card, entry, entry.end, 1020);
  await openDetailed(page);
  await page.evaluate(c => localStorage.setItem("time-card-v1", JSON.stringify(c)), card);
  await page.reload();
  const open = async () => {
    const summary = page.locator("summary").filter({ hasText: "Templates and approval receipts" });
    if (!(await summary.evaluate(e => e.parentElement!.hasAttribute("open")))) await summary.click();
  };
  await open();
  await page.locator("#template-name").fill("Rules");
  await page.locator("#save-template").click();
  await page.reload();
  await open();
  await expect(page.locator("#templates")).toContainText("Rules");
  const before = await page.evaluate(() => localStorage.getItem("time-card-v1"));
  page.once("dialog", d => d.dismiss());
  await page.locator("#apply-template").click();
  expect(await page.evaluate(() => localStorage.getItem("time-card-v1"))).toBe(before);
  page.once("dialog", d => d.accept());
  await page.locator("#apply-template").click();
  await expect(page.locator('[data-card="client"]')).toHaveValue("Client A");
  await page.locator("#readonly-share").click();
  const link = await page.locator("#share-url").inputValue();
  expect(link).toContain("#readonly=");
  await page.goto(link);
  await expect(page.locator("#readonly-view")).toBeVisible();
  await page.locator("#reviewer").fill("Reviewer");
  await page.locator("#make-receipt").click();
  await expect(page.locator("#receipt-output")).toHaveValue(/#receipt=/);
  const receipt = await page.locator("#receipt-output").inputValue();
  await page.screenshot({path:`test-results/approval-${browserName}.png`, fullPage:true});
  await page.goto(receipt);
  await open();
  await expect(page.locator("#receipt-input")).toHaveValue(receipt);
  await page.locator("#import-receipt").click();
  await expect(page.locator("#receipts")).toContainText("Matches current snapshot");
  await page.reload();
  await open();
  await expect(page.locator("#receipts")).toContainText("Matches current snapshot");
  const receiptJSON = await page.evaluate(() => JSON.stringify(JSON.parse(localStorage.getItem("time-card-v1")!).receipts[0]));
  await page.locator("#receipt-input").fill(receiptJSON);
  await page.locator("#import-receipt").click();
  await expect(page.locator("#receipts p")).toHaveCount(2);
  await page.locator('[data-card="name"]').fill("Changed");
  await expect(page.locator("#receipts")).toContainText("older or different snapshot");
  page.once("dialog", d => d.accept());
  await page.locator("#delete-template").click();
  await expect(page.locator("#templates option")).toHaveCount(0);
  await page.setViewportSize({width:390,height:844});
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({path:`test-results/templates-${browserName}.png`,fullPage:true});
});

test("template capacity, damaged data and invalid receipts preserve storage", async ({ page }) => {
  const { createCard } = await import("../../src/state/card");
  const { makeTemplate } = await import("../../src/io/workflows");
  const c = createCard("2026-11-09");
  // Receipt hashing needs browser Web Crypto, so use a structurally valid old snapshot.
  c.receipts = Array.from({length:100}, () => ({version:1 as const,snapshot:"a".repeat(64),name:"Reviewer",decision:"Approved" as const,note:"",time:"2026-11-14T00:00:00Z"}));
  const templates = Array.from({length:100}, (_, i) => makeTemplate(c, `Rules ${i}`, `${i}`));
  await openDetailed(page);
  await page.evaluate(({c, templates}) => {
    localStorage.setItem("time-card-v1", JSON.stringify(c));
    localStorage.setItem("time-card-templates-v1", JSON.stringify(templates));
  }, {c, templates});
  await page.reload();
  await page.locator("summary").filter({hasText:"Templates and approval receipts"}).click();
  await page.locator("#template-name").fill("Overflow");
  await page.locator("#save-template").click();
  await expect(page.locator("#save-status")).toContainText("Template limit reached");
  await expect(page.locator("#templates option")).toHaveCount(100);
  await page.locator("#receipt-input").fill(JSON.stringify(c.receipts[0]));
  await page.locator("#import-receipt").click();
  await expect(page.locator("#save-status")).toContainText("Receipt limit reached");
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem("time-card-v1")!).receipts.length)).toBe(100);
  await page.locator("#receipt-input").fill("broken");
  await page.locator("#import-receipt").click();
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem("time-card-v1")!).receipts.length)).toBe(100);
  await page.evaluate(() => localStorage.setItem("time-card-templates-v1", "broken"));
  await page.reload();
  await expect(page.locator("#save-status")).not.toBeEmpty();
  expect(await page.evaluate(() => localStorage.getItem("time-card-templates-v1"))).toBe("broken");
});
