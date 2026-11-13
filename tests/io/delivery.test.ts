import { expect, test } from "vitest";
import { createCard, addEntry, setMinute } from "../../src/state/card";
import {
  csv,
  decodeCard,
  load,
  save,
  encodeShare,
  decodeShare,
} from "../../src/io/delivery";
test("damaged storage is protected and failure reported", () => {
  expect(load({ getItem: () => "{" }).blocked).toBe(true);
  expect(
    save(
      {
        setItem: () => {
          throw Error();
        },
      },
      createCard("2026-11-09"),
    ),
  ).toContain("failed");
  expect(() => decodeCard('{"version":2}')).toThrow();
});
test("CSV escapes formula name and shares report totals", () => {
  const c = createCard("2026-11-09");
  c.name = "=SUM(1,2)";
  const e = addEntry(c, c.anchor, "x");
  setMinute(c, e, e.start, 540);
  setMinute(c, e, e.end, 1020);
  expect(csv(c)).toContain("'=SUM(1,2)");
  expect(csv(c)).toContain('"480","8:00","8.00"');
});
test("month snapshot compression roundtrip", async () => {
  const c = createCard("2026-11-09");
  c.length = "month";
  for (let i = 0; i < 30; i++)
    for (let j = 0; j < 3; j++) {
      const e = addEntry(
        c,
        `2026-11-${String(i + 1).padStart(2, "0")}`,
        `${i}-${j}`,
      );
      setMinute(c, e, e.start, 360 + j * 240);
      setMinute(c, e, e.end, 540 + j * 240);
    }
  const hash = await encodeShare(c);
  expect(await decodeShare("#" + hash)).toEqual(c);
});
test("invalid civil dates rejected", () => {
  const c = createCard("2026-02-31");
  expect(() => decodeCard(JSON.stringify(c))).toThrow();
});
test("rejects injected record attributes", () => {
  const c = createCard("2026-11-09");
  addEntry(c, c.anchor, '"><img src=x onerror=alert(1)>');
  expect(() => decodeCard(JSON.stringify(c))).toThrow();
});
test('receipt uses bounded shared codec and read-only mode uses v2 migration', async () => {
  const { encodeReceiptLink, decodeReceiptLink } = await import('../../src/io/delivery');
  const { makeReceipt } = await import('../../src/io/workflows');
  const c = createCard('2026-11-09');
  const receipt = await makeReceipt(c, 'Reviewer', 'Changes requested', '<safe>');
  expect(await decodeReceiptLink('#' + await encodeReceiptLink(receipt))).toEqual(receipt);
  expect((await decodeShare('#' + await encodeShare(c, 'readonly'))).version).toBe(2);
});
