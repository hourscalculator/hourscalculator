export type Break = { id?: string; start: number; end: number; paid: boolean; duration?: boolean };
export type FieldIssue = { segmentId: string; field: "start" | "end"; breakId?: string; message: string };
export type Segment = {
  suppressAutomatic?: boolean;
  id: string;
  date: string;
  start: number;
  end: number;
  breaks: Break[];
};
export type Settings = {
  overtime?: boolean;
  mode: "weekly" | "daily" | "ca";
  rate: number | null;
  multiplier: number;
  dayStart: number;
  weekStart: number;
  auto: boolean;
  threshold: number;
  deduction: number;
  round: string;
};
export function parseTime(raw: string, meridiem?: string): number | null {
  const match = raw
    .trim()
    .toLowerCase()
    .replace(/\s/g, "")
    .match(/^(\d{1,4})(?::(\d{2}))?([ap]m?)?$/);
  if (!match) return null;
  const digits = match[1];
  let hour = Number(
    match[2] !== undefined
      ? digits
      : digits.length > 2
        ? digits.slice(0, -2)
        : digits,
  );
  const minute = Number(match[2] ?? (digits.length > 2 ? digits.slice(-2) : 0));
  const suffix = (match[3] ?? meridiem?.toLowerCase())?.slice(0, 1);
  if (minute > 59 || hour > (suffix ? 12 : 23) || (suffix && hour < 1))
    return null;
  if (suffix) hour = (hour % 12) + (suffix.startsWith("p") ? 12 : 0);
  return hour * 60 + minute;
}
export function decimal(minutes: number, round: string): string {
  if (round === "quarter") return (Math.round(minutes / 15) / 4).toFixed(2);
  if (round === "two") return (minutes / 60).toFixed(2);
  const value = minutes / 60;
  return `${Number(value.toFixed(6))}${minutes % 3 ? " ≈" : ""}`;
}
export const hhmm = (minutes: number) =>
  `${Math.floor(minutes / 60)}:${String(minutes % 60).padStart(2, "0")}`;
export const dayNumber = (date: string) =>
  Math.floor(Date.parse(`${date}T00:00:00Z`) / 86400000);
export const dateString = (day: number) =>
  new Date(day * 86400000).toISOString().slice(0, 10);
export function calculate(segments: Segment[], settings: Settings) {
  const errors: string[] = [];
  const issues: FieldIssue[] = [];
  function mark(segmentId: string, message: string, breakId?: string, fields: ("start" | "end")[] = ["start", "end"]) {
    for (const field of fields) issues.push({ segmentId, field, breakId, message });
  }
  const days = new Map<number, { minutes: number; manual: number; suppressAutomatic?: boolean }>();
  const intervals: { start: number; end: number; id: string }[] = [];
  for (const segment of segments) {
    if (
      ![segment.start, segment.end].every(
        (n) => Number.isInteger(n) && n >= 0 && n < 1440,
      ) ||
      !isCivilDate(segment.date)
    ) {
      errors.push(`${segment.id}: invalid time or date`);
      mark(segment.id, "Enter valid work times.");
      continue;
    }
    const base = dayNumber(segment.date) * 1440;
    const start = base + segment.start;
    const end = base + segment.end + (segment.end < segment.start ? 1440 : 0);
    if (start === end) {
      errors.push(`${segment.id}: zero duration`);
      mark(segment.id, "In and Out must be different times.");
    }
    const overlapping = intervals.filter((interval) => start < interval.end && end > interval.start);
    if (overlapping.length) {
      errors.push(`${segment.id}: overlapping work periods`);
      mark(segment.id, "This work period overlaps another work period.");
      for (const interval of overlapping) mark(interval.id, "This work period overlaps another work period.");
    }
    intervals.push({ start, end, id: segment.id });
    if (
      segment.breaks.some(
        (b) =>
          ![b.start, b.end].every(
            (n) => Number.isInteger(n) && n >= 0 && n < 1440,
          ),
      )
    ) {
      errors.push(`${segment.id}: invalid break minutes`);
      for (const rest of segment.breaks) {
        if (![rest.start, rest.end].every((value) => Number.isInteger(value) && value >= 0 && value < 1440)) mark(segment.id, "Enter valid break times.", rest.id);
      }
      continue;
    }
    const breaks = segment.breaks.map((b) => {
      const a = base + b.start + (b.start < segment.start ? 1440 : 0);
      return {
        id: b.id,
        start: a,
        end: a + ((b.end - b.start + 1440) % 1440),
        paid: b.paid,
        duration: b.duration,
      };
    });
    breaks.forEach((b, index) => {
      const startOutside = b.start < start || b.start > end;
      const endOutside = b.end > end || b.end < start;
      const conflicts = breaks.slice(0, index).filter((a) => a.start < b.end && a.end > b.start && !((a.duration && b.paid) || (b.duration && a.paid)));
      if (startOutside || endOutside || conflicts.length) {
        errors.push(`${segment.id}: invalid break`);
        if (startOutside) mark(segment.id, "Break start must fall within this work period.", b.id, ["start"]);
        if (endOutside) mark(segment.id, "Break end must fall within this work period.", b.id, ["end"]);
        if (conflicts.length) {
          mark(segment.id, "This break overlaps another break.", b.id);
          for (const conflict of conflicts) mark(segment.id, "This break overlaps another break.", conflict.id);
        }
      }
    });
    for (let cursor = start; cursor < end;) {
      const day = Math.floor((cursor - settings.dayStart) / 1440);
      const boundary = Math.min(end, (day + 1) * 1440 + settings.dayStart);
      const unpaid = breaks
        .filter((b) => !b.paid)
        .reduce(
          (sum, b) =>
            sum +
            Math.max(0, Math.min(boundary, b.end) - Math.max(cursor, b.start)),
          0,
        );
      const previous = days.get(day) ?? { minutes: 0, manual: 0 };
      days.set(day, {
        minutes: previous.minutes + boundary - cursor - unpaid,
        manual: previous.manual + unpaid,
        suppressAutomatic: previous.suppressAutomatic || segment.suppressAutomatic,
      });
      cursor = boundary;
    }
  }
  const weeks = new Map<number, number>();
  const rows = [...days]
    .sort(([a], [b]) => a - b)
    .map(([day, value]) => {
      let minutes = value.minutes;
      const automaticDeduction =
        settings.auto && !value.suppressAutomatic && minutes + value.manual >= settings.threshold
          ? Math.max(0, settings.deduction - value.manual)
          : 0;
      minutes -= automaticDeduction;
      if (minutes < 0)
        errors.push(`${dateString(day)}: automatic break exceeds hours`);
      const weekday = (((day + 4) % 7) + 7) % 7;
      const week = day - ((weekday - settings.weekStart + 7) % 7);
      const used = weeks.get(week) ?? 0;
      const seventh =
        settings.mode === "ca" &&
        day === week + 6 &&
        Array.from(
          { length: 6 },
          (_, i) => days.get(week + i)?.minutes ?? 0,
        ).every((n) => n > 0);
      let double =
        settings.mode === "ca"
          ? Math.max(0, minutes - (seventh ? 480 : 720))
          : 0;
      let overtime =
        settings.mode === "weekly"
          ? 0
          : seventh
            ? Math.min(minutes, 480)
            : Math.max(0, minutes - 480 - double);
      let regular = minutes - overtime - double;
      if (settings.mode !== "daily") {
        const weekly = Math.max(0, regular - Math.max(0, 2400 - used));
        regular -= weekly;
        overtime += weekly;
      }
      if (settings.overtime === false) {
        regular = minutes;
        overtime = 0;
        double = 0;
      }
      weeks.set(week, used + regular);
      return {
        date: dateString(day),
        week: dateString(week),
        minutes,
        automaticDeduction,
        regular,
        overtime,
        double,
      };
    });
  const total = rows.reduce((n, r) => n + r.minutes, 0);
  const regular = rows.reduce((n, r) => n + r.regular, 0);
  const overtime = rows.reduce((n, r) => n + r.overtime, 0);
  const double = rows.reduce((n, r) => n + r.double, 0);
  const pay = grossPay(regular, overtime, double, settings);
  return { rows, total, regular, overtime, double, pay, errors, issues };
}

export function grossPay(
  regular: number,
  overtime: number,
  double: number,
  settings: Settings,
): number | null {
  if (settings.rate === null) return null;
  const weightedHalfMinutes =
    regular * 2 +
    overtime * (settings.mode === "ca" ? 3 : settings.multiplier * 2) +
    double * 4;
  return Number(
    (BigInt(settings.rate) * BigInt(weightedHalfMinutes) + 60n) / 120n,
  );
}

export function isCivilDate(date: string): boolean {
  return (
    /^\d{4}-\d{2}-\d{2}$/.test(date) &&
    Number.isFinite(dayNumber(date)) &&
    dateString(dayNumber(date)) === date
  );
}
