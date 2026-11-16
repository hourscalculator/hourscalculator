import {
  dateString,
  parseTime,
  type Segment,
  type Settings,
  type FieldIssue,
} from "../domain/core";
import { dayNumber, period, report } from "../domain/report";
export type Field = {
  raw: string;
  value: number | null;
  ampm: string;
  dirty: boolean;
};
export type Entry = {
  dailyBreakMinutes?: number;
  id: string;
  row: string;
  actualDate: string | null;
  start: Field;
  end: Field;
  breaks: { id: string; start: Field; end: Field; paid: boolean; automatic?: boolean }[];
};
export type Card = {
  durationBreaks?: Record<string, number[]>;
  hidePeriod?: boolean;
  visibleFields?: { client: boolean; project: boolean; content: boolean };
  content?: Record<string, string>;
  emptyRows?: string[];
  syncedRows?: Record<string, string>;
  version: 2;
  endDate: string;
  currency: string;
  client: string;
  project: string;
  billing: "hourly" | "daily" | "fixed";
  decimalFirst: boolean;
  multi: boolean;
  selectedEmployee: string;
  employeeOrder?: string[];
  employees: Employee[];
  receipts: Receipt[];
  name: string;
  anchor: string;
  length: string;
  format: string;
  showAmPm: boolean;
  defaultSegments: number;
  defaultBreaks: number;
  settings: Settings;
  entries: Entry[];
  confirmed: string[];
};
export type Employee = Pick<
  Card,
  | "durationBreaks"
  | "name"
  | "content"
  | "settings"
  | "entries"
  | "confirmed"
  | "billing"
  | "client"
  | "project"
  | "anchor"
  | "endDate"
  | "length"
> & { id: string };
export type Receipt = {
  version: 1;
  snapshot: string;
  name: string;
  note: string;
  decision: "Approved" | "Changes requested";
  time: string;
};
export function cardPeriod(card: Card) {
  return period(
    card.anchor,
    card.length,
    card.settings.weekStart,
    card.endDate,
  );
}
export function currentEmployee(card: Card): Employee {
  return {
    id: card.selectedEmployee,
    ...(card.durationBreaks === undefined ? {} : { durationBreaks: card.durationBreaks }),
    content: card.content ?? {},
    name: card.name,
    settings: card.settings,
    entries: card.entries,
    confirmed: card.confirmed,
    billing: card.billing,
    client: card.client,
    project: card.project,
    anchor: card.anchor,
    endDate: card.endDate,
    length: card.length,
  };
}
export function employeeCards(card: Card) {
  const employees = card.multi
    ? [currentEmployee(card), ...card.employees]
    : [currentEmployee(card)];
  const byId = new Map(employees.map((employee) => [employee.id, employee]));
  const ordered = (card.employeeOrder ?? [])
    .map((employeeId) => byId.get(employeeId))
    .filter((employee): employee is Employee => Boolean(employee));
  const orderedIds = new Set(ordered.map((employee) => employee.id));
  return [...ordered, ...employees.filter((employee) => !orderedIds.has(employee.id))].map(
    (employee) => ({
      ...card,
      ...employee,
      selectedEmployee: employee.id,
      durationBreaks: employee.durationBreaks,
      content: employee.content ?? {},
      employees: [],
    }),
  );
}
export function selectEmployee(card: Card, employeeId: string) {
  const next = card.employees.find((e) => e.id === employeeId);
  if (!next) return;
  const previous = currentEmployee(card);
  card.employees = card.employees.filter((e) => e.id !== employeeId);
  card.employees.push(previous);
  const { id, ...values } = next;
  Object.assign(card, values, { selectedEmployee: id, durationBreaks: next.durationBreaks, content: next.content ?? {} });
}
export function addEmployee(card: Card, employeeId: string) {
  card.employeeOrder ??= [
    card.selectedEmployee,
    ...card.employees.map((employee) => employee.id),
  ];
  if (!card.employeeOrder.includes(employeeId)) card.employeeOrder.push(employeeId);
  card.employees.push({
    ...currentEmployee(card),
    id: employeeId,
    content: {},
    name: "",
    client: "",
    project: "",
    entries: [],
    durationBreaks: undefined,
    confirmed: [],
    settings: {
      ...card.settings,
      rate: null,
    },
  });
  card.multi = true;
  selectEmployee(card, employeeId);
}
export function removeEmployee(card: Card, employeeId: string) {
  card.employeeOrder ??= [
    card.selectedEmployee,
    ...card.employees.map((employee) => employee.id),
  ];
  if (
    card.employeeOrder[0] === employeeId ||
    !card.employeeOrder.includes(employeeId)
  )
    return false;
  if (card.selectedEmployee === employeeId)
    selectEmployee(card, card.employeeOrder[0]);
  card.employees = card.employees.filter((employee) => employee.id !== employeeId);
  card.employeeOrder = card.employeeOrder.filter((id) => id !== employeeId);
  card.multi = card.employees.length > 0;
  return true;
}
export function getTableReport(card: Card) {
  const employees = employeeCards(card).map((c) => ({
    card: c,
    report: getReport(c),
  }));
  return {
    employees,
    total: employees.reduce((n, e) => n + e.report.total, 0),
    pay: employees.some((e) => e.report.pay === null)
      ? null
      : employees.reduce((n, e) => n + e.report.pay!, 0),
    errors: employees.flatMap((e) =>
      e.report.errors.map(
        (error) => `${e.card.name || e.card.selectedEmployee}: ${error}`,
      ),
    ),
  };
}
export const field = (): Field => ({
  raw: "",
  value: null,
  ampm: "AM",
  dirty: false,
});
export function createCard(today: string): Card {
  return {
    version: 2,
    endDate: today,
    currency: "USD",
    client: "",
    project: "",
    billing: "hourly",
    decimalFirst: false,
    multi: false,
    selectedEmployee: "primary",
    employeeOrder: ["primary"],
    employees: [],
    receipts: [],
    name: "",
    anchor: today,
    length: "1",
    format: "12",
    showAmPm: true,
    defaultSegments: 1,
    defaultBreaks: 0,
    settings: {
      mode: "weekly",
      overtime: true,
      rate: null,
      multiplier: 1.5,
      dayStart: 0,
      weekStart: 1,
      auto: false,
      threshold: 360,
      deduction: 30,
      round: "two",
    },
    entries: [],
    confirmed: [],
  };
}
export function addEntry(card: Card, date: string, id: string) {
  const entry: Entry = {
    id,
    row: date,
    actualDate: null,
    start: field(),
    end: field(),
    breaks: [],
  };
  if (card.defaultBreaks > 0 && !card.entries.some(existing => existing.row === date)) {
    card.durationBreaks ??= {};
    card.durationBreaks[date] ??= Array.from({ length: card.defaultBreaks }, () => 30);
  }
  card.entries.push(entry);
  return entry;
}
export function initialize(card: Card, id: () => string) {
  for (const date of cardPeriod(card).dates) {
    if (card.emptyRows?.includes(`${card.selectedEmployee}:${date}`)) continue;
    const existing = card.entries.filter((e) => e.row === date);
    if (
      existing.every((e) =>
        [e.start, e.end].every((f) => f.value === null && !f.raw),
      )
    ) {
      for (let i = existing.length; i < card.defaultSegments; i++)
        addEntry(card, date, id());
      if (card.defaultBreaks > 0) {
        card.durationBreaks ??= {};
        card.durationBreaks[date] ??= Array.from({ length: card.defaultBreaks }, () => 30);
      }
    }
  }
}
export function displayTime(value: number, card: Card) {
  const hour = Math.floor(value / 60),
    minute = String(value % 60).padStart(2, "0");
  return `${card.format === "12" && card.showAmPm ? hour % 12 || 12 : String(hour).padStart(2, "0")}:${minute}`;
}
export function commitField(card: Card, entry: Entry, target: Field) {
  if (!target.dirty) return;
  target.value = target.raw.trim()
    ? parseTime(
        target.raw,
        card.format === "12" && card.showAmPm ? target.ampm : undefined,
      )
    : null;
  target.dirty = false;
  if (target.value !== null) {
    target.ampm = target.value >= 720 ? "PM" : "AM";
    target.raw = displayTime(target.value, card);
  }
  if (entry.start.value !== null && entry.actualDate === null)
    entry.actualDate = dateString(
      dayNumber(entry.row) +
        (entry.start.value < card.settings.dayStart ? 1 : 0),
    );
}
export function setMinute(
  card: Card,
  entry: Entry,
  target: Field,
  minute: number,
) {
  target.value = minute;
  target.dirty = false;
  target.ampm = minute >= 720 ? "PM" : "AM";
  target.raw = displayTime(minute, card);
  if (target === entry.start && entry.actualDate === null)
    entry.actualDate = dateString(
      dayNumber(entry.row) + (minute < card.settings.dayStart ? 1 : 0),
    );
}
export function getReport(card: Card) {
  const segments: Segment[] = [],
    draftErrors: string[] = [];
  const draftIssues: FieldIssue[] = [];
  const selectedIds = new Set<string>();
  const range = cardPeriod(card);
  const fieldValue = (f: Field) =>
    f.dirty
      ? f.raw.trim()
        ? parseTime(
            f.raw,
            card.format === "12" && card.showAmPm ? f.ampm : undefined,
          )
        : null
      : f.value;
  for (const e of card.entries) {
    const date = dayNumber(e.row);
    if (date < range.contextStart - 1 || date >= range.contextEnd) continue;
    const fields = [e.start, e.end];
    const selected = date >= range.start && date < range.end;
    if (selected) selectedIds.add(e.id);
    if (!selected && (fields.some((f) => f.value === null || f.dirty) || e.breaks.some((rest) => [rest.start, rest.end].some((f) => f.dirty || (f.raw && f.value === null))))) continue;
    const active = fields.some((f) => f.raw.trim() || f.value !== null || f.dirty);
    if (!active) {
      if (e.breaks.some((b) => !b.automatic && (b.start.raw || b.end.raw))) {
        draftErrors.push(`${e.id}: break needs a work period`);
        for (const field of ["start", "end"] as const) draftIssues.push({ segmentId: e.id, field, message: `Enter a work ${field === "start" ? "In" : "Out"} time for this break.` });
      }
      continue;
    }
    if (fields.some((f) => fieldValue(f) === null)) {
      draftErrors.push(`${e.id}: complete valid In and Out times`);
      for (const field of ["start", "end"] as const) {
        if (fieldValue(e[field]) === null) draftIssues.push({ segmentId: e.id, field, message: e[field].raw.trim() ? `Enter a valid ${field === "start" ? "In" : "Out"} time.` : `Enter an ${field === "start" ? "In" : "Out"} time.` });
      }
      continue;
    }
    const start = fieldValue(e.start)!;
    const end = fieldValue(e.end)!;
    const breaks: Segment["breaks"] = [];
    for (const b of e.breaks) {
      if (b.automatic && card.durationBreaks?.[e.row] !== undefined) continue;
      if (
        !b.start.raw &&
        !b.end.raw &&
        b.start.value === null &&
        b.end.value === null &&
        !b.start.dirty &&
        !b.end.dirty
      )
        continue;
      if ([b.start, b.end].some((f) => fieldValue(f) === null)) {
        draftErrors.push(`${e.id}: complete break times`);
        for (const field of ["start", "end"] as const) {
          if (fieldValue(b[field]) === null) draftIssues.push({ segmentId: e.id, breakId: b.id, field, message: `Enter a valid break ${field} time.` });
        }
      } else breaks.push({ id: b.id, start: fieldValue(b.start)!, end: fieldValue(b.end)!, paid: b.paid });
    }
    if (card.durationBreaks?.[e.row] === undefined && e.dailyBreakMinutes && !card.settings.auto && !e.breaks.some(rest => !rest.automatic && (rest.start.raw || rest.end.raw))) {
      breaks.push({ start, end: (start + e.dailyBreakMinutes) % 1440, paid: false });
    }
    segments.push({
      id: e.id,
      date:
        e.actualDate ??
        (e.start.dirty
          ? dateString(date + (start < card.settings.dayStart ? 1 : 0))
          : e.row),
      start,
      end,
      breaks,
    });
  }
  for (const [date, values] of Object.entries(card.durationBreaks ?? {})) {
    const day = dayNumber(date);
    if (day < range.contextStart || day >= range.contextEnd) continue;
    if (!Array.isArray(values) || values.some(value => !Number.isInteger(value) || value < 0 || value > 1439)) {
      draftErrors.push(`${card.name || card.selectedEmployee}: ${date}: invalid duration break`);
      continue;
    }
    let remaining = values.reduce((sum, value) => sum + value, 0);
    const work = segments.filter(segment => card.entries.find(entry => entry.id === segment.id)?.row === date)
      .sort((a, b) => dayNumber(a.date) * 1440 + a.start - dayNumber(b.date) * 1440 - b.start);
    for (const segment of work) {
      segment.suppressAutomatic = true;
      const length = (segment.end - segment.start + 1440) % 1440;
      let runStart: number | null = null;
      for (let offset = 0; offset <= length; offset++) {
        const minute = (segment.start + offset) % 1440;
        const unpaid = segment.breaks.some(rest => !rest.paid && (minute - rest.start + 1440) % 1440 < (rest.end - rest.start + 1440) % 1440);
        const deduct = offset < length && remaining > 0 && !unpaid;
        if (deduct) {
          if (runStart === null) runStart = offset;
          remaining--;
        } else if (runStart !== null) {
          segment.breaks.push({ start: (segment.start + runStart) % 1440, end: minute, paid: false, duration: true });
          runStart = null;
        }
      }
    }
    if (work.length && remaining > 0) {
      const message = `${card.name || card.selectedEmployee}: ${date}: duration breaks exceed work minutes`;
      draftErrors.push(message);
      draftIssues.push({ segmentId: work[0].id, field: "end", message });
    }
  }
  const settings = card.settings;
  let result = report(segments, settings, range, range.dates, card.billing);
  const invalidOutside = new Set(result.issues.filter((issue) => !selectedIds.has(issue.segmentId)).map((issue) => issue.segmentId));
  if (invalidOutside.size) result = report(segments.filter((segment) => !invalidOutside.has(segment.id)), settings, range, range.dates, card.billing);
  result.errors.push(...draftErrors);
  if (result.errors.length) result.status = "Input incomplete";
  return {
    ...result,
    issues: [...result.issues, ...draftIssues],
    billing: card.billing,
    currency: card.currency,
    rate: card.settings.rate,
    range,
  };
}
