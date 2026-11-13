import { decodeCard } from "./delivery";
import {
  type Card,
  type Receipt,
  currentEmployee,
  createCard,
} from "../state/card";
export type Template = {
  version: 1;
  id: string;
  name: string;
  values: Pick<
    Card,
    | "length"
    | "format"
    | "showAmPm"
    | "defaultSegments"
    | "defaultBreaks"
    | "decimalFirst"
    | "billing"
    | "currency"
  >;
  settings: Omit<Card["settings"], "rate">;
};
export function makeTemplate(card: Card, name: string, id: string): Template {
  const { rate, ...settings } = card.settings;
  const {
    length,
    format,
    showAmPm,
    defaultSegments,
    defaultBreaks,
    decimalFirst,
    billing,
    currency,
  } = card;
  return {
    version: 1,
    id,
    name,
    values: {
      length,
      format,
      showAmPm,
      defaultSegments,
      defaultBreaks,
      decimalFirst,
      billing,
      currency,
    },
    settings,
  };
}
export function applyTemplate(card: Card, template: Template) {
  Object.assign(card, template.values);
  if (card.length === "custom" && card.endDate < card.anchor)
    card.endDate = card.anchor;
  card.settings = { ...template.settings, rate: card.settings.rate };
}
export function loadTemplates(storage: Pick<Storage, "getItem">): Template[] {
  const raw = storage.getItem("time-card-templates-v1");
  if (!raw) return [];
  const templates = JSON.parse(raw);
  if (
    !Array.isArray(templates) ||
    templates.length > 100 ||
    templates.some(
      (t) =>
        t.version !== 1 ||
        typeof t.name !== "string" ||
        !t.values ||
        !t.settings,
    )
  )
    throw Error("Damaged template collection preserved");
  return templates.map((template) => {
    if (
      typeof template.id !== "string" ||
      template.id.length > 100 ||
      template.name.length > 100
    )
      throw Error("Invalid template");
    const card = createCard("2026-01-01");
    Object.assign(card, template.values);
    if (card.length === "custom" && card.endDate < card.anchor)
      card.endDate = card.anchor;
    card.settings = { ...template.settings, rate: null };
    const validated = decodeCard(JSON.stringify(card));
    return makeTemplate(validated, template.name, template.id);
  });
}
export function saveTemplates(
  storage: Pick<Storage, "setItem">,
  templates: Template[],
) {
  storage.setItem("time-card-templates-v1", JSON.stringify(templates));
}
export async function snapshotId(card: Card) {
  const employees = [currentEmployee(card), ...card.employees]
    .sort((a, b) => a.id.localeCompare(b.id))
    .map((e) => ({
      ...e,
      entries: e.entries.filter(
        (entry) =>
          entry.start.raw ||
          entry.end.raw ||
          entry.start.value !== null ||
          entry.end.value !== null ||
          entry.breaks.some((b) => b.start.raw || b.end.raw),
      ),
      confirmed: [...e.confirmed].sort(),
    }));
  const {
    entries,
    settings,
    name,
    confirmed,
    billing,
    client,
    project,
    receipts,
    selectedEmployee,
    employees: ignored,
    ...table
  } = card;
  const bytes = new TextEncoder().encode(
    JSON.stringify({ ...table, employees }),
  );
  const hash = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(hash), (n) =>
    n.toString(16).padStart(2, "0"),
  ).join("");
}
export async function makeReceipt(
  card: Card,
  name: string,
  decision: Receipt["decision"],
  note: string,
): Promise<Receipt> {
  if (!name.trim() || name.length > 200 || note.length > 2000)
    throw Error(
      "Enter reviewer name (up to 200 characters) and note (up to 2000 characters)",
    );
  return {
    version: 1,
    snapshot: await snapshotId(card),
    name,
    decision,
    note,
    time: new Date().toISOString(),
  };
}
export function decodeReceipt(text: string): Receipt {
  const r = JSON.parse(text);
  if (
    r?.version !== 1 ||
    !/^[a-f0-9]{64}$/.test(r.snapshot) ||
    typeof r.name !== "string" ||
    !r.name.trim() ||
    r.name.length > 200 ||
    typeof r.note !== "string" ||
    r.note.length > 2000 ||
    !["Approved", "Changes requested"].includes(r.decision) ||
    !Number.isFinite(Date.parse(r.time))
  )
    throw Error("Invalid approval receipt");
  return r;
}
export async function receiptStatus(card: Card, receipt: Receipt) {
  return (await snapshotId(card)) === receipt.snapshot
    ? "Matches current snapshot"
    : "Receipt targets an older or different snapshot";
}
