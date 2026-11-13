import { decodeReceipt } from "./workflows";
import {
  type Receipt,
  type Card,
  getReport,
  employeeCards,
  getTableReport,
  currentEmployee,
} from "../state/card";
import { hhmm, decimal, isCivilDate, dateString } from "../domain/core";
export const STORAGE_KEY = "time-card-v1";
export function decodeCard(text: string): Card {
  if (text.length > 1000000) throw Error("Time card too large");
  const parsed = JSON.parse(text);
  if (parsed?.version === 1)
    Object.assign(parsed, {
      version: 2,
      endDate: parsed.anchor,
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
    });
  if (parsed && typeof parsed === "object") delete parsed.workdays;
  const c = parsed as Card;
  if (
    !c ||
    c.version !== 2 ||
    typeof c.name !== "string" ||
    c.name.length > 200 ||
    !isCivilDate(c.anchor) ||
    !["1", "2", "3", "4", "month", "custom"].includes(c.length) ||
    !["12", "24"].includes(c.format) ||
    typeof c.showAmPm !== "boolean" ||
    !Array.isArray(c.entries) ||
    c.entries.length > 2000 ||
    !Array.isArray(c.confirmed) ||
    !c.settings
  )
    throw Error("Unsupported or damaged time card");
  if (
    !isCivilDate(c.endDate) ||
    !["USD", "EUR", "GBP", "CAD", "AUD"].includes(c.currency) ||
    !["hourly", "daily", "fixed"].includes(c.billing) ||
    typeof c.multi !== "boolean" ||
    typeof c.decimalFirst !== "boolean" ||
    typeof c.selectedEmployee !== "string" ||
    !Array.isArray(c.employees) ||
    c.employees.length > 99 ||
    !Array.isArray(c.receipts) ||
    c.receipts.length > 100 ||
    [c.client, c.project].some(
      (value) => typeof value !== "string" || value.length > 200,
    )
  )
    throw Error("Invalid workflow settings");
  if (
    c.length === "custom" &&
    c.endDate < c.anchor
  )
    throw Error("End date must be on or after the start date");
  const employeeIds = new Set([c.selectedEmployee]);
  c.employees = c.employees.map((employee) => {
    if (
      !employee ||
      typeof employee.id !== "string" ||
      employeeIds.has(employee.id)
    )
      throw Error("Invalid employee");
    employeeIds.add(employee.id);
    const validated = decodeCard(
      JSON.stringify({
        ...c,
        ...employee,
        content: employee.content ?? {},
        version: 2,
        selectedEmployee: employee.id,
        employeeOrder: undefined,
        employees: [],
        receipts: [],
      }),
    );
    return currentEmployee(validated);
  });
  if (c.employeeOrder !== undefined) {
    if (
      !Array.isArray(c.employeeOrder) ||
      c.employeeOrder.length !== employeeIds.size ||
      new Set(c.employeeOrder).size !== employeeIds.size ||
      c.employeeOrder.some((employeeId) => !employeeIds.has(employeeId))
    )
      throw Error("Invalid employee order");
  } else c.employeeOrder = [c.selectedEmployee, ...c.employees.map((employee) => employee.id)];
  for (const receipt of c.receipts) decodeReceipt(JSON.stringify(receipt));
  if (c.emptyRows !== undefined && (!Array.isArray(c.emptyRows) || c.emptyRows.some((key: unknown) => typeof key !== "string"))) throw Error("Invalid empty day state");
  if (c.syncedRows !== undefined && (!c.syncedRows || typeof c.syncedRows !== "object" || Array.isArray(c.syncedRows) || Object.values(c.syncedRows).some((value) => typeof value !== "string"))) throw Error("Invalid synchronized day state");
  if (c.content !== undefined && (!c.content || typeof c.content !== "object" || Array.isArray(c.content) || Object.entries(c.content).some(([date, value]) => !isCivilDate(date) || typeof value !== "string" || value.length > 2000))) throw Error("Invalid daily content");
  const s = c.settings;
  if (
    !["weekly", "daily", "ca"].includes(s.mode) ||
    ![1.5, 2].includes(s.multiplier) ||
    !["two", "none", "quarter"].includes(s.round) ||
    !Number.isInteger(s.weekStart) ||
    s.weekStart < 0 ||
    s.weekStart > 6 ||
    !Number.isInteger(s.dayStart) ||
    s.dayStart < 0 ||
    s.dayStart >= 1440 ||
    ![s.threshold, s.deduction].every(
      (n) => Number.isInteger(n) && n >= 0 && n <= 1440,
    ) ||
    typeof s.auto !== "boolean" ||
    (s.overtime !== undefined && typeof s.overtime !== "boolean") ||
    (s.rate !== null &&
      (!Number.isSafeInteger(s.rate) || s.rate < 0 || s.rate > 100000000))
  )
    throw Error("Invalid settings");
  if (
    ![c.defaultSegments, c.defaultBreaks].every(
      (n) => Number.isInteger(n) && n >= 0 && n <= 20,
    ) ||
    c.defaultSegments < 1
  )
    throw Error("Invalid defaults");
  const ids = new Set<string>();
  for (const e of c.entries) {
    if (e.dailyBreakMinutes !== undefined && (!Number.isInteger(e.dailyBreakMinutes) || e.dailyBreakMinutes < 0 || e.dailyBreakMinutes > 1439)) throw Error("Invalid daily break minutes");
    if (
      !e ||
      typeof e.id !== "string" ||
      !/^[A-Za-z0-9_-]{1,100}$/.test(e.id) ||
      ids.has(e.id) ||
      !isCivilDate(e.row) ||
      (e.actualDate !== null && !isCivilDate(e.actualDate)) ||
      !Array.isArray(e.breaks) ||
      e.breaks.length > 100
    )
      throw Error("Invalid record");
    ids.add(e.id);
    for (const f of [
      e.start,
      e.end,
      ...e.breaks.flatMap((b) => [b.start, b.end]),
    ])
      if (
        !f ||
        typeof f.raw !== "string" ||
        f.raw.length > 100 ||
        typeof f.dirty !== "boolean" ||
        !["AM", "PM"].includes(f.ampm) ||
        (f.value !== null &&
          (!Number.isInteger(f.value) || f.value < 0 || f.value >= 1440))
      )
        throw Error("Invalid time");
    if (
      e.breaks.some(
        (b) =>
          typeof b.paid !== "boolean" ||
          typeof b.id !== "string" ||
          !/^[A-Za-z0-9_-]{1,100}$/.test(b.id),
      )
    )
      throw Error("Invalid break");
  }
  if (c.confirmed.some((d) => typeof d !== "string" || !isCivilDate(d)))
    throw Error("Invalid context");
  return c;
}
export function load(storage: Pick<Storage, "getItem">) {
  try {
    const raw = storage.getItem(STORAGE_KEY);
    return { card: raw ? decodeCard(raw) : null, error: "", blocked: false };
  } catch (error) {
    return {
      card: null,
      error: `Draft could not be loaded. Original data preserved. ${String(error)}`,
      blocked: true,
    };
  }
}
export function save(storage: Pick<Storage, "setItem">, card: Card) {
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(card));
    return "Saved on this browser";
  } catch {
    return "Save failed — browser storage unavailable";
  }
}
const csvCell = (value: unknown) =>
  `"${String(value ?? "")
    .replace(/^[\s]*[=+@-]/, "'$&")
    .replace(/"/g, '""')}"`;
export function csv(card: Card): string {
  const table = getTableReport(card);
  if (table.errors.length)
    throw Error("Fix input errors before exporting");
  if (card.multi && card.employees.length)
    return (
      employeeCards(card)
        .map((employee, index) => {
          const c = {
            ...employee,
            name: employee.name || `Worker ${index + 1}`,
          };
          return index
            ? csv({ ...c, multi: false }).slice(1)
            : csv({ ...c, multi: false });
        })
        .join("\r\n") +
      "\r\n" +
      [
        ["Table total minutes", table.total, "hh:mm", hhmm(table.total)],
        ["Table total cents", table.pay, card.currency],
      ]
        .map((row) => row.map(csvCell).join(","))
        .join("\r\n")
    );
  const r = getReport(card);
  if (r.errors.length) throw Error("Fix input errors before exporting");
  const rows: unknown[][] = [
    ["Time card", card.name],
    ["Currency", card.currency],
    ["Billing", r.billing, "Quantity", r.quantity, "Rate cents", r.rate],
    ["Client", card.client, "Project", card.project],
    [
      "Complete settings",
      JSON.stringify({ ...card, entries: undefined, employees: undefined, employeeOrder: undefined }),
    ],
    ["Status", r.status],
    ["Period", dateString(r.range.start), dateString(r.range.end - 1), card.length],
    ["Start date", dateString(r.range.start)],
    ["End date", dateString(r.range.end - 1)],
    [
      "Rule",
      card.settings.mode,
      "Multiplier",
      card.settings.mode === "ca" ? "1.5 / 2" : card.settings.multiplier,
    ],
    ["Overtime enabled", card.settings.overtime !== false],
    ["Decimal display", card.settings.round],
    ["Hourly rate cents", card.settings.rate],
    [
      "Date",
      "Minutes",
      "hh:mm",
      "Decimal",
      "Regular minutes",
      "Overtime minutes",
      "Double time minutes",
      "1.5x minutes",
      "2x minutes",
      "Automatic unpaid deduction minutes",
    ],
  ];
  for (const row of r.rows)
    rows.push([
      row.date,
      row.minutes,
      hhmm(row.minutes),
      decimal(row.minutes, card.settings.round),
      row.regular,
      row.overtime,
      row.double,
      card.settings.mode === "ca" || card.settings.multiplier === 1.5
        ? row.overtime
        : 0,
      row.double +
        (card.settings.mode !== "ca" && card.settings.multiplier === 2
          ? row.overtime
          : 0),
      row.automaticDeduction,
    ]);
  for (const week of [...new Set(r.rows.map((row) => row.week))]) {
    const days = r.rows.filter((row) => row.week === week),
      minutes = days.reduce((n, row) => n + row.minutes, 0);
    rows.push([
      "Week " + week,
      minutes,
      hhmm(minutes),
      decimal(minutes, card.settings.round),
      ...["regular", "overtime", "double"].map((key) =>
        days.reduce((n, row) => n + row[key as "regular"], 0),
      ),
    ]);
  }
  rows.push(
    [
      "Total",
      r.total,
      hhmm(r.total),
      decimal(r.total, card.settings.round),
      r.regular,
      r.overtime,
      r.double,
    ],
    ["Gross pay cents", r.pay],
    ["Work period", "Actual date", "In minutes", "Out minutes"],
  );
  for (const e of card.entries.filter(
    (e) => e.start.value !== null || e.end.value !== null,
  )) {
    rows.push([e.id, e.actualDate ?? e.row, e.start.value, e.end.value]);
    for (const b of e.breaks)
      rows.push([
        "Break",
        b.paid ? "Paid" : "Unpaid",
        b.start.value,
        b.end.value,
      ]);
  }
  rows.push(
    ["Conversion", "60 minutes = 1 hour; decimal hours = actual minutes / 60"],
    [
      "Conversion",
      "24:03 = 24.05 decimal hours; display rounding preserves minutes and pay",
    ],
    [
      "Clock basis",
      "Civil clock arithmetic does not adjust daylight saving transitions",
    ],
    ["Workday starts", hhmm(card.settings.dayStart)],
    [
      "Automatic break",
      card.settings.auto
        ? `${card.settings.threshold} minute threshold / ${card.settings.deduction} minute deduction`
        : "Off",
    ],
  );
  return "\ufeff" + rows.map((row) => row.map(csvCell).join(",")).join("\r\n");
}
async function transform(bytes: Uint8Array, compress: boolean) {
  const stream = new Blob([bytes as BlobPart])
    .stream()
    .pipeThrough(
      compress
        ? new CompressionStream("gzip")
        : new DecompressionStream("gzip"),
    );
  const reader = stream.getReader();
  let size = 0;
  const chunks: Uint8Array[] = [];
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.length;
    if (size > 1000000) {
      await reader.cancel();
      throw Error("Share payload too large");
    }
    chunks.push(value);
  }
  const out = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    out.set(chunk, offset);
    offset += chunk.length;
  }
  return out;
}
async function encodePayload(key: string, value: unknown) {
  const text = JSON.stringify(value);
  if (text.length > 1000000) throw Error("Share payload too large");
  const bytes = await transform(new TextEncoder().encode(text), true);
  const encoded = btoa(
    Array.from(bytes, (b) => String.fromCharCode(b)).join(""),
  )
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
  if (encoded.length > 149980) throw Error("Share payload too large");
  return key + "=" + encoded;
}
async function decodePayload(hash: string, keys: string[]) {
  const match = hash.match(/^#([a-z]+)=([A-Za-z0-9_-]+)$/);
  if (!match || !keys.includes(match[1]) || hash.length > 150000)
    throw Error("Invalid or oversized share link");
  try {
    const bytes = Uint8Array.from(
      atob(match[2].replace(/-/g, "+").replace(/_/g, "/")),
      (c) => c.charCodeAt(0),
    );
    return new TextDecoder().decode(await transform(bytes, false));
  } catch {
    throw Error("Damaged, oversized, or unsupported share link");
  }
}
export async function encodeShare(
  card: Card,
  mode: "editable" | "readonly" | "report" = "editable",
) {
  if (getTableReport(card).errors.length)
    throw Error("Fix input errors before sharing");
  return encodePayload(mode === "editable" ? "card" : mode, card);
}
export async function decodeShare(hash: string) {
  return decodeCard(await decodePayload(hash, ["card", "readonly", "report"]));
}
export async function encodeReceiptLink(receipt: Receipt) {
  return encodePayload("receipt", decodeReceipt(JSON.stringify(receipt)));
}
export async function decodeReceiptLink(hash: string) {
  return decodeReceipt(await decodePayload(hash, ["receipt"]));
}
