import {
  calculate,
  dateString,
  type Segment,
  type Settings,
  dayNumber,
  grossPay,
} from "./core";
export { dayNumber } from "./core";
export function period(
  anchor: string,
  length: string,
  weekStart: number,
  endDate?: string,
) {
  const day = dayNumber(anchor);
  const start =
    length === "custom"
      ? day
      : length === "month"
        ? dayNumber(`${anchor.slice(0, 7)}-01`)
        : day - ((((day + 4 - weekStart) % 7) + 7) % 7);
  const end =
    length === "custom"
      ? dayNumber(endDate ?? anchor) + 1
      : length === "month"
        ? Math.floor(
            Date.UTC(
              Number(anchor.slice(0, 4)),
              Number(anchor.slice(5, 7)),
              1,
            ) / 86400000,
          )
        : start + Number(length) * 7;
  if (
    !Number.isFinite(start) ||
    !Number.isFinite(end) ||
    end <= start
  )
    throw Error("Choose valid inclusive start and end dates");
  const contextStart = start - ((((start + 4 - weekStart) % 7) + 7) % 7);
  const contextEnd = end + ((((7 - ((end + 4 - weekStart) % 7)) % 7) + 7) % 7);
  return {
    start,
    end,
    contextStart,
    contextEnd,
    dates: Array.from({ length: contextEnd - contextStart }, (_, i) =>
      dateString(contextStart + i),
    ),
  };
}
export function report(
  segments: Segment[],
  settings: Settings,
  range: ReturnType<typeof period>,
  confirmed: string[],
  billing: "hourly" | "daily" | "fixed" = "hourly",
) {
  const effectiveSettings =
    billing === "hourly" ? settings : { ...settings, overtime: false };
  const contextStartMinute = range.contextStart * 1440 + settings.dayStart;
  const contextEndMinute = range.contextEnd * 1440 + settings.dayStart;
  const relevant = segments.filter((s) => {
    const start = dayNumber(s.date) * 1440 + s.start;
    const end = dayNumber(s.date) * 1440 + s.end + (s.end < s.start ? 1440 : 0);
    return start < contextEndMinute && end >= contextStartMinute;
  });
  const all = calculate(relevant, effectiveSettings);
  const rows = all.rows.filter(
    (r) => dayNumber(r.date) >= range.start && dayNumber(r.date) < range.end,
  );
  const total = rows.reduce((n, r) => n + r.minutes, 0),
    regular = rows.reduce((n, r) => n + r.regular, 0),
    overtime = rows.reduce((n, r) => n + r.overtime, 0),
    double = rows.reduce((n, r) => n + r.double, 0);
  const quantity =
    billing === "daily"
      ? rows.filter((row) => row.minutes > 0).length
      : billing === "fixed"
        ? 1
        : total / 60;
  const pay =
    billing === "hourly"
      ? grossPay(regular, overtime, double, effectiveSettings)
      : settings.rate === null
        ? null
        : settings.rate * quantity;
  const missing = range.dates.filter(
    (d) =>
      (dayNumber(d) < range.start || dayNumber(d) >= range.end) &&
      !confirmed.includes(d),
  );
  return {
    ...all,
    rows,
    total,
    regular,
    overtime,
    double,
    pay,
    quantity,
    billing,
    missing,
    status: all.errors.length
      ? "Input incomplete"
      : missing.length
        ? "Estimate incomplete"
        : "Estimate ready",
  };
}
