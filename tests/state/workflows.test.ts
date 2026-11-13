import { test, expect } from "vitest";
import {
  createCard,
  addEntry,
  setMinute,
  getReport,
  getTableReport,
  addEmployee,
  selectEmployee,
  cardPeriod,
} from "../../src/state/card";
import { decodeCard, encodeShare, decodeShare } from "../../src/io/delivery";
import {
  makeTemplate,
  applyTemplate,
  snapshotId,
  makeReceipt,
  receiptStatus,
} from "../../src/io/workflows";
function shift(
  c: ReturnType<typeof createCard>,
  date: string,
  key: string,
  minutes = 60,
) {
  const e = addEntry(c, date, key);
  setMinute(c, e, e.start, 540);
  setMinute(c, e, e.end, 540 + minutes);
}
test("custom inclusive dates, daily billing and retained out of range records", () => {
  const c = createCard("2026-11-30");
  c.length = "custom";
  c.endDate = "2026-12-02";
  c.billing = "daily";
  c.settings.rate = 12345;
  shift(c, "2026-11-30", "a");
  shift(c, "2026-11-30", "b", 30);
  c.entries[1].start.value = 700;
  c.entries[1].end.value = 730;
  shift(c, "2026-12-02", "c");
  shift(c, "2026-12-03", "d");
  expect(cardPeriod(c).end - cardPeriod(c).start).toBe(3);
  expect(getReport(c).pay).toBe(24690);
  expect(c.entries).toHaveLength(4);
  c.billing = "fixed";
  expect(getReport(c).pay).toBe(12345);
});
test("employees isolate minutes and sum independently rounded bills", () => {
  const c = createCard("2026-11-09");
  c.settings.rate = 100;
  shift(c, c.anchor, "a", 1);
  addEmployee(c, "second");
  c.settings.rate = 100;
  shift(c, c.anchor, "b", 1);
  expect(getTableReport(c).pay).toBe(4);
  selectEmployee(c, "primary");
  expect(getReport(c).total).toBe(1);
  c.multi = false;
  expect(getTableReport(c).employees).toHaveLength(1);
  c.multi = true;
  expect(getTableReport(c).employees).toHaveLength(2);
});
test("v1 migrates and complete v2 shares roundtrip", async () => {
  const c = createCard("2026-11-09");
  const legacy = { ...c, version: 1 };
  delete (legacy as any).employees;
  expect(decodeCard(JSON.stringify(legacy)).version).toBe(2);
  c.currency = "EUR";
  c.client = "<client>";
  c.billing = "fixed";
  c.settings.rate = 123;
  addEmployee(c, "other");
  const restored = await decodeShare("#" + (await encodeShare(c)));
  expect(restored.currency).toBe("EUR");
  expect(getTableReport(restored).employees).toHaveLength(2);
});
test("templates exclude identity, records and fixed amount, receipts bind content", async () => {
  const c = createCard("2026-11-09");
  c.name = "Private";
  c.client = "Client";
  c.billing = "fixed";
  c.settings.rate = 1234;
  shift(c, c.anchor, "a");
  const template = makeTemplate(c, "Rules", "t");
  expect(JSON.stringify(template)).not.toContain("Private");
  const target = createCard(c.anchor);
  target.name = "Keep";
  target.settings.rate = 500;
  applyTemplate(target, template);
  expect(target.name).toBe("Keep");
  expect(target.settings.rate).toBe(500);
  const receipt = await makeReceipt(c, "Reviewer", "Approved", "Fine");
  expect(await receiptStatus(c, receipt)).toBe("Matches current snapshot");
  c.name = "Changed";
  expect(await snapshotId(c)).not.toBe(receipt.snapshot);
  expect(await receiptStatus(c, receipt)).toBe(
    "Receipt targets an older or different snapshot",
  );
});
test("snapshot is stable across employee selection and receipt additions", async () => {
  const c = createCard("2026-11-09");
  shift(c, c.anchor, "a");
  addEmployee(c, "second");
  shift(c, c.anchor, "b");
  const before = await snapshotId(c);
  selectEmployee(c, "primary");
  expect(await snapshotId(c)).toBe(before);
  c.receipts.push(await makeReceipt(c, "Reviewer", "Approved", ""));
  expect(await snapshotId(c)).toBe(before);
});
test("a new employee cannot inherit an existing fixed invoice amount", () => {
  const c = createCard("2026-11-09");
  c.billing = "fixed";
  c.settings.rate = 12345;
  addEmployee(c, "new");
  expect(c.settings.rate).toBeNull();
});
