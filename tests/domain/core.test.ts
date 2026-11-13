import { expect, test } from "vitest";
import { parseTime, decimal, calculate } from "../../src/domain/core";
test("input tolerance and invalid minutes", () => {
  expect(parseTime("855")).toBe(535);
  expect(parseTime("930p")).toBe(1290);
  expect(parseTime("12am")).toBe(0);
  expect(parseTime("1265")).toBe(null);
});
test("aggregate decimal uses actual minutes", () =>
  expect(decimal(1443, "two")).toBe("24.05"));
test("night shift deducts unpaid break", () => {
  const r = calculate(
    [
      {
        id: "a",
        date: "2026-11-09",
        start: 1320,
        end: 360,
        breaks: [{ start: 60, end: 90, paid: false }],
      },
    ],
    {
      mode: "weekly",
      rate: 2000,
      multiplier: 1.5,
      dayStart: 0,
      weekStart: 1,
      auto: false,
      threshold: 360,
      deduction: 30,
      round: "two",
    },
  );
  expect(r.total).toBe(450);
});
test("rejects a suffix without a/p", () => expect(parseTime("9m")).toBe(null));
test("finite decimals are exact", () =>
  expect(decimal(1, "none")).toBe("0.016667 ≈"));
test("validates range before calculating", () => {
  expect(
    calculate(
      [{ id: "bad", date: "2026-11-09", start: -1, end: 600, breaks: [] }],
      {
        mode: "weekly",
        rate: null,
        multiplier: 1.5,
        dayStart: 0,
        weekStart: 1,
        auto: false,
        threshold: 360,
        deduction: 30,
        round: "two",
      },
    ).errors.length,
  ).toBeGreaterThan(0);
});
