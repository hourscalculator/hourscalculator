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
  | "name"
  | "content"
  | "settings"
  | "entries"
  | "confirmed"
  | "billing"
  | "client"
  | "project"
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
    content: card.content ?? {},
    name: card.name,
    settings: card.settings,
    entries: card.entries,
    confirmed: card.confirmed,
    billing: card.billing,
    client: card.client,
    project: card.project,
  };
}
export function employeeCards(card: Card) {
  const employees = card.multi
    ? [currentEmployee(card), ...card.employees]
    : [currentEmployee(card)];
  return employees.map((employee) => ({
    ...card,
    ...employee,
    selectedEmployee: employee.id,
    content: employee.content ?? {},
    employees: [],
  }));
}
export function selectEmployee(card: Card, employeeId: string) {
  const next = card.employees.find((e) => e.id === employeeId);
  if (!next) return;
  const previous = currentEmployee(card);
  card.employees = card.employees.filter((e) => e.id !== employeeId);
  card.employees.push(previous);
  const { id, ...values } = next;
  Object.assign(card, values, { selectedEmployee: id, content: next.content ?? {} });
}
export function addEmployee(card: Card, employeeId: string) {
  card.employees.push({
    ...currentEmployee(card),
    id: employeeId,
    content: {},
    name: "",
    client: "",
    project: "",
    entries: [],
    confirmed: [],
    settings: {
      ...card.settings,
      rate: null,
    },
  });
  card.multi = true;
  selectEmployee(card, employeeId);
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
  for (let i = 0; i < card.defaultBreaks; i++)
    entry.breaks.push({
      id: `${id}-b${i}`,
      start: field(),
      end: field(),
      paid: false,
    });
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
      for (const entry of existing)
        for (let i = entry.breaks.length; i < card.defaultBreaks; i++)
          entry.breaks.push({
            id: id(),
            start: field(),
            end: field(),
            paid: false,
          });
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
  for (const e of card.entries) {
    const date = dayNumber(e.row);
    if (date < range.contextStart - 1 || date >= range.contextEnd) continue;
    const fields = [e.start, e.end];
    const selected = date >= range.start && date < range.end;
    if (selected) selectedIds.add(e.id);
    if (!selected && (fields.some((f) => f.value === null || f.dirty) || e.breaks.some((rest) => [rest.start, rest.end].some((f) => f.dirty || (f.raw && f.value === null))))) continue;
    const active = fields.some((f) => f.raw.trim() || f.value !== null);
    if (!active) {
      if (e.breaks.some((b) => !b.automatic && (b.start.raw || b.end.raw))) {
        draftErrors.push(`${e.id}: break needs a work period`);
        for (const field of ["start", "end"] as const) draftIssues.push({ segmentId: e.id, field, message: `Enter a work ${field === "start" ? "In" : "Out"} time for this break.` });
      }
      continue;
    }
    if (fields.some((f) => f.value === null || f.dirty)) {
      draftErrors.push(`${e.id}: complete valid In and Out times`);
      for (const field of ["start", "end"] as const) {
        if (e[field].value === null || e[field].dirty) draftIssues.push({ segmentId: e.id, field, message: e[field].raw.trim() ? `Enter a valid ${field === "start" ? "In" : "Out"} time.` : `Enter an ${field === "start" ? "In" : "Out"} time.` });
      }
      continue;
    }
    const breaks: Segment["breaks"] = [];
    for (const b of e.breaks) {
      if (
        !b.start.raw &&
        !b.end.raw &&
        b.start.value === null &&
        b.end.value === null
      )
        continue;
      if ([b.start, b.end].some((f) => f.value === null || f.dirty)) {
        draftErrors.push(`${e.id}: complete break times`);
        for (const field of ["start", "end"] as const) {
          if (b[field].value === null || b[field].dirty) draftIssues.push({ segmentId: e.id, breakId: b.id, field, message: `Enter a valid break ${field} time.` });
        }
      } else breaks.push({ id: b.id, start: b.start.value!, end: b.end.value!, paid: b.paid });
    }
    if (e.dailyBreakMinutes) {
      breaks.push({ start: e.start.value!, end: (e.start.value! + e.dailyBreakMinutes) % 1440, paid: false });
    }
    segments.push({
      id: e.id,
      date: e.actualDate ?? e.row,
      start: e.start.value!,
      end: e.end.value!,
      breaks,
    });
  }
  const settings = card.entries.some((e) => e.dailyBreakMinutes !== undefined) ? { ...card.settings, auto: false } : card.settings;
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
