import { expect, test } from "vitest";
import { calculate, type Settings } from "../../src/domain/core";
import { period, report } from "../../src/domain/report";
const settings: Settings = {
  mode: "weekly",
  rate: 2000,
  multiplier: 1.5,
  dayStart: 0,
  weekStart: 1,
  auto: false,
  threshold: 360,
  deduction: 30,
  round: "two",
};
const shift = (date: string, hours: number) => ({
  id: date,
  date,
  start: 0,
  end: hours * 60,
  breaks: [],
});
test("two weeks classify independently", () => {
  const s = [
    ...Array.from({ length: 5 }, (_, i) =>
      shift(`2026-11-${String(9 + i).padStart(2, "0")}`, 9),
    ),
    ...Array.from({ length: 5 }, (_, i) => shift(`2026-11-${16 + i}`, 7)),
  ];
  const r = report(s, settings, period("2026-11-09", "2", 1), []);
  expect([r.regular, r.overtime, r.pay]).toEqual([4500, 300, 165000]);
});
test("CA thirteen hours", () => {
  const r = calculate([shift("2026-11-09", 13)], { ...settings, mode: "ca" });
  expect([r.regular, r.overtime, r.double, r.pay]).toEqual([
    480, 240, 60, 32000,
  ]);
});
test("months retain actual length and context", () => {
  for (const [anchor, n] of [
    ["2024-02-10", 29],
    ["2025-02-10", 28],
    ["2026-04-10", 30],
    ["2026-01-10", 31],
  ] as const) {
    const p = period(anchor, "month", 1);
    expect(p.end - p.start).toBe(n);
  }
});
test("manual break counts toward automatic once per day", () => {
  const s = shift("2026-11-09", 8);
  const r = calculate(
    [{ ...s, breaks: [{ start: 120, end: 135, paid: false }] }],
    { ...settings, auto: true },
  );
  expect(r.total).toBe(450);
});
test("day boundary reclassifies actual records without moving them", () => {
  const s = { ...shift("2026-11-09", 3), start: 60 };
  expect(calculate([s], { ...settings, dayStart: 240 }).rows[0].date).toBe(
    "2026-11-08",
  );
  expect(s.date).toBe("2026-11-09");
});
test("unknown adjacent days are explicit", () =>
  expect(
    report([], settings, period("2026-11-15", "month", 1), []).status,
  ).toBe("Estimate incomplete"));
test("rejects invalid break minute instead of silent arithmetic", () =>
  expect(
    calculate(
      [
        {
          ...shift("2026-11-09", 8),
          breaks: [{ start: 60, end: 1500, paid: false }],
        },
      ],
      settings,
    ).errors.length,
  ).toBeGreaterThan(0));
test("zero duration warns while retaining zero hours", () => {
  const r = calculate([shift("2026-11-09", 0)], settings);
  expect(r.total).toBe(0);
  expect(r.errors).toHaveLength(1);
});
test("overlap across civil dates is detected", () => {
  const r = calculate(
    [{ ...shift("2026-11-09", 6), start: 1320 }, shift("2026-11-10", 8)],
    settings,
  );
  expect(r.errors.join()).toContain("overlapping");
});
test("CA seventh day and weekly premiums never double count", () => {
  const s = Array.from({ length: 7 }, (_, i) =>
    shift(`2026-11-${String(9 + i).padStart(2, "0")}`, 9),
  );
  const r = calculate(s, { ...settings, mode: "ca" });
  expect([r.regular, r.overtime, r.double]).toEqual([2400, 1320, 60]);
  expect(r.regular + r.overtime + r.double).toBe(r.total);
});
test("automatic deduction cannot exceed available hours", () => {
  const r = calculate([shift("2026-11-09", 1)], {
    ...settings,
    auto: true,
    threshold: 30,
    deduction: 90,
  });
  expect(r.errors.join()).toContain("exceeds");
});
test.each([
  [8, 480, 0, 0],
  [12, 480, 240, 0],
  [13, 480, 240, 60],
])("CA %i hour thresholds", (hours, regular, overtime, double) => {
  const r = calculate([shift("2026-11-09", hours)], {
    ...settings,
    mode: "ca",
  });
  expect([r.regular, r.overtime, r.double]).toEqual([
    regular,
    overtime,
    double,
  ]);
});
test("paid breaks and gaps preserve only actual work", () => {
  const first = {
    ...shift("2026-11-09", 4),
    breaks: [{ start: 60, end: 75, paid: true }],
  };
  const second = { ...shift("2026-11-09", 10), id: "second", start: 360 };
  expect(calculate([first, second], settings).total).toBe(480);
});
test("night shift splits unpaid break across workday boundary", () => {
  const r = calculate(
    [
      {
        id: "night",
        date: "2026-11-08",
        start: 1320,
        end: 360,
        breaks: [{ start: 1410, end: 30, paid: false }],
      },
    ],
    settings,
  );
  expect(r.rows.map((r) => [r.date, r.minutes])).toEqual([
    ["2026-11-08", 90],
    ["2026-11-09", 330],
  ]);
});
test("overlapping and outside breaks are localized", () => {
  const r = calculate(
    [
      {
        ...shift("2026-11-09", 8),
        breaks: [
          { start: 60, end: 120, paid: false },
          { start: 90, end: 150, paid: true },
          { start: 600, end: 660, paid: false },
        ],
      },
    ],
    settings,
  );
  expect(r.errors.length).toBe(2);
});
test("weekly threshold is independent of display rounding", () => {
  const s = Array.from({ length: 5 }, (_, i) =>
    shift(`2026-11-${String(9 + i).padStart(2, "0")}`, 8),
  );
  s[0].date = "2026-11-09";
  s[4].end += 1;
  const exact = calculate(s, settings),
    rounded = calculate(s, { ...settings, round: "quarter" });
  expect(exact.overtime).toBe(1);
  expect(rounded.pay).toBe(exact.pay);
});
