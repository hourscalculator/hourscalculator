import { type Card, getReport, getTableReport } from "../state/card";
import { decimal, hhmm, dateString } from "../domain/core";
export const escape = (value: unknown) =>
  String(value).replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );
export const money = (value: number | null, currency: string) =>
  value === null
    ? "Enter billing rate"
    : `${currency} ${new Intl.NumberFormat("en-US", { style: "currency", currency }).format(value / 100)}`;
export function summaryReport(card: Card) {
  const r = getReport(card);
  const weekday = (day: number) => new Intl.DateTimeFormat("en-US", {
    weekday: "short", timeZone: "UTC",
  }).format(new Date(day * 86400000));
  const hasContent = Array.from({ length: r.range.end - r.range.start }, (_, index) => card.content?.[dateString(r.range.start + index)]?.trim()).some(Boolean);
  const totalSpan = hasContent ? ' colspan="2"' : "";
  const rows = Array.from({ length: r.range.end - r.range.start }, (_, index) => {
    const day = r.range.start + index;
    const minutes = r.rows.find((row) => row.date === dateString(day))?.minutes ?? 0;
    return `<tr><th colspan="2" scope="row">${weekday(day)}<time class="report-date" datetime="${dateString(day)}">${dateString(day)}</time></th><td colspan="2">${hhmm(minutes)}</td><td colspan="2">${decimal(minutes, card.settings.round)}</td>${hasContent ? `<td class="report-content">${escape(card.content?.[dateString(day)] ?? "")}</td>` : ""}</tr>`;
  }).join("");
  const regularPay = r.pay === null ? null : r.billing === "hourly"
    ? Math.round(r.regular * (r.rate ?? 0) / 60) : r.pay;
  const premiumPay = r.pay === null ? null : r.pay - (regularPay ?? 0);
  const amount = (value: number | null) => value === null ? "—" : new Intl.NumberFormat("en-US", { style: "currency", currency: card.currency }).format(value / 100);
  return `<table class="summary-table"><caption>Report</caption><colgroup><col class="formula-label"><col><col class="formula-symbol"><col><col class="formula-symbol"><col>${hasContent ? '<col class="content-column">' : ""}</colgroup>
    <thead><tr><th colspan="2" scope="col">Day</th><th colspan="2" scope="col">hh:mm</th><th colspan="2" scope="col">Decimal</th>${hasContent ? '<th scope="col">Content</th>' : ""}</tr></thead>
    <tbody>${rows}<tr class="report-total"><th colspan="2" scope="row">Total</th><td colspan="2">${hhmm(r.total)}</td><td colspan="2">${decimal(r.total, card.settings.round)}</td>${hasContent ? "<td></td>" : ""}</tr></tbody>
    <tbody class="pay-summary">
      <tr><th colspan="${hasContent ? 7 : 6}">${card.length === "1" ? "Weekly totals" : "Period totals"}</th></tr>
      <tr><th></th><th scope="col">REG</th><th class="operator">+</th><th scope="col">OT</th><th class="operator">=</th><th scope="col"${totalSpan}>Total</th></tr>
      <tr><th scope="row">hh:mm</th><td>${hhmm(r.regular)}</td><td class="operator">+</td><td>${hhmm(r.overtime + r.double)}</td><td class="operator">=</td><td${totalSpan}>${hhmm(r.total)}</td></tr>
      <tr><th scope="row">Decimal</th><td>${decimal(r.regular, card.settings.round)}</td><td class="operator">+</td><td>${decimal(r.overtime + r.double, card.settings.round)}</td><td class="operator">=</td><td${totalSpan}>${decimal(r.total, card.settings.round)}</td></tr>
      <tr><th scope="row">Rate/Hr</th><td>${amount(r.rate)}</td><td></td><td>${amount(r.rate === null || r.billing !== "hourly" || card.settings.overtime === false ? null : Math.round(r.rate * (card.settings.mode === "ca" ? 1.5 : card.settings.multiplier)))}${card.settings.mode === "ca" && card.settings.overtime !== false ? ` / ${amount(r.rate === null ? null : r.rate * 2)}` : ""}</td><td></td><td${totalSpan}></td></tr>
      <tr class="report-total"><th scope="row">Gross pay</th><td>${amount(regularPay)}</td><td class="operator">+</td><td>${amount(premiumPay)}</td><td class="operator">=</td><td${totalSpan}>${amount(r.pay)}</td></tr>
    </tbody></table>`;
}

export function tableReport(card: Card, resultOnly = false) {
  const r = getTableReport(card);
  const sections = r.employees.map((employee, index) => {
    const name = employee.card.name || (resultOnly ? (r.employees.length > 1 ? `Worker ${index + 1}` : "") : "Unnamed worker");
    const heading = resultOnly ? name : `${name} · ${employee.card.selectedEmployee}`;
    const details = resultOnly
      ? [employee.card.client, employee.card.project, `Period ${dateString(employee.report.range.start)} – ${dateString(employee.report.range.end - 1)}`].filter(Boolean).join(" · ")
      : `${employee.card.client} ${employee.card.project} · ${dateString(employee.report.range.start)} – ${dateString(employee.report.range.end - 1)} · ${employee.report.status}`;
    return `<section class="employee-report">${heading ? `<h2>${escape(heading)}</h2>` : ""}<p>${escape(details)}</p>${summaryReport(employee.card)}<ul>${employee.report.errors.map((error) => `<li>${escape(error)}</li>`).join("")}</ul></section>`;
  }).join("");
  return `<h1>Time Card Calculator</h1>${sections}${!resultOnly || r.employees.length > 1 ? `<p>Table total ${hhmm(r.total)} · ${money(r.pay, card.currency)}</p>` : ""}`;
}
