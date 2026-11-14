import { type Card, getReport, getTableReport, displayTime, commitField } from "../state/card";
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
export function summaryReport(card: Card, combined = false) {
  const r = getReport(card);
  if (combined) {
    const all = getTableReport(card);
    const groups = all.employees.map(({ card: employee, report }, index) => {
      const hasContent = Object.values(employee.content ?? {}).some(value => value.trim());
      const rows = Array.from({ length: report.range.end - report.range.start }, (_, offset) => {
        const date = dateString(report.range.start + offset);
        const minutes = report.rows.find(row => row.date === date)?.minutes ?? 0;
        const weekday = new Intl.DateTimeFormat("en-US", { weekday: "short", timeZone: "UTC" }).format(new Date(date + "T00:00:00Z"));
        return `<tr><th scope="row">${weekday}<time class="report-date" datetime="${date}">${date}</time></th><td>${hhmm(minutes)}</td><td>${decimal(minutes, employee.settings.round)}</td>${hasContent ? `<td class="report-content">${escape(employee.content?.[date] ?? "")}</td>` : ""}</tr>`;
      }).join("");
      return `<section class="report-card"><table class="summary-table"><caption><span class="report-card-heading"><span>${escape(employee.name || `Time card ${index + 1}`)}${employee.client ? `<small class="report-date">Client · ${escape(employee.client)}</small>` : ""}${employee.project ? `<small class="report-date">Project · ${escape(employee.project)}</small>` : ""}</span><span class="report-period">${dateString(report.range.start)} – ${dateString(report.range.end - 1)}</span></span></caption><thead><tr><th scope="col">Day</th><th scope="col">hh:mm</th><th scope="col">Decimal</th>${hasContent ? '<th scope="col">Content</th>' : ""}</tr></thead><tbody>${rows}</tbody></table></section>`;
    }).join("");
    const totals = { ...r, pay: all.pay };
    for (const key of ["total", "regular", "overtime", "double"] as const)
      totals[key] = all.employees.reduce((sum, employee) => sum + employee.report[key], 0);
    return `<h2 class="report-title">Report</h2>${groups}<section class="report-grand-total" aria-label="Total time"><table class="summary-table"><tbody><tr class="report-total"><th scope="row">Total time</th><td>${hhmm(all.total)}</td><td>${decimal(all.total, card.settings.round)}</td></tr></tbody></table></section><h2 class="report-title">${card.length === "1" ? "Weekly totals" : "Period totals"}</h2><section class="report-card"><table class="summary-table">${paySummary(card, totals)}</table></section>`;
  }
  const weekday = (day: number) => new Intl.DateTimeFormat("en-US", {
    weekday: "short", timeZone: "UTC",
  }).format(new Date(day * 86400000));
  const hasContent = Array.from({ length: r.range.end - r.range.start }, (_, index) => card.content?.[dateString(r.range.start + index)]?.trim()).some(Boolean);
  const rows = Array.from({ length: r.range.end - r.range.start }, (_, index) => {
    const day = r.range.start + index;
    const minutes = r.rows.filter((row) => row.date === dateString(day)).reduce((sum, row) => sum + row.minutes, 0);
    return `<tr><th colspan="2" scope="row">${weekday(day)}<time class="report-date" datetime="${dateString(day)}">${dateString(day)}</time></th><td colspan="2">${hhmm(minutes)}</td><td colspan="2">${decimal(minutes, card.settings.round)}</td>${hasContent ? `<td class="report-content">${escape(card.content?.[dateString(day)] ?? "")}</td>` : ""}</tr>`;
  }).join("");
  return `<table class="summary-table"><caption>Report</caption><colgroup><col class="formula-label"><col><col class="formula-symbol"><col><col class="formula-symbol"><col>${hasContent ? '<col class="content-column">' : ""}</colgroup>
    <thead><tr><th colspan="2" scope="col">Day</th><th colspan="2" scope="col">hh:mm</th><th colspan="2" scope="col">Decimal</th>${hasContent ? '<th scope="col">Content</th>' : ""}</tr></thead>
    <tbody>${rows}<tr class="report-total"><th colspan="2" scope="row">Total</th><td colspan="2">${hhmm(r.total)}</td><td colspan="2">${decimal(r.total, card.settings.round)}</td>${hasContent ? "<td></td>" : ""}</tr></tbody>
    ${paySummary(card, r, hasContent)}</table>`;
}

function paySummary(card: Card, r: ReturnType<typeof getReport>, hasContent = false) {
  const totalSpan = hasContent ? ' colspan="2"' : "";
  const regularPay = r.pay === null ? null : r.billing === "hourly"
    ? Math.round(r.regular * (r.rate ?? 0) / 60) : r.pay;
  const premiumPay = r.pay === null ? null : r.pay - (regularPay ?? 0);
  const amount = (value: number | null) => value === null ? "—" : new Intl.NumberFormat("en-US", { style: "currency", currency: card.currency }).format(value / 100);
  return `    <tbody class="pay-summary">
      <tr><th></th><th scope="col">REG</th><th class="operator">+</th><th scope="col">OT</th><th class="operator">=</th><th scope="col"${totalSpan}>Total</th></tr>
      <tr><th scope="row">hh:mm</th><td>${hhmm(r.regular)}</td><td class="operator">+</td><td>${hhmm(r.overtime + r.double)}</td><td class="operator">=</td><td${totalSpan}>${hhmm(r.total)}</td></tr>
      <tr><th scope="row">Decimal</th><td>${decimal(r.regular, card.settings.round)}</td><td class="operator">+</td><td>${decimal(r.overtime + r.double, card.settings.round)}</td><td class="operator">=</td><td${totalSpan}>${decimal(r.total, card.settings.round)}</td></tr>
      <tr><th scope="row">Rate/Hr</th><td>${amount(r.rate)}</td><td></td><td>${amount(r.rate === null || r.billing !== "hourly" || card.settings.overtime === false ? null : Math.round(r.rate * (card.settings.mode === "ca" ? 1.5 : card.settings.multiplier)))}${card.settings.mode === "ca" && card.settings.overtime !== false ? ` / ${amount(r.rate === null ? null : r.rate * 2)}` : ""}</td><td></td><td${totalSpan}></td></tr>
      <tr class="report-total"><th scope="row">Gross pay</th><td>${amount(regularPay)}</td><td class="operator">+</td><td>${amount(premiumPay)}</td><td class="operator">=</td><td${totalSpan}>${amount(r.pay)}</td></tr>
    </tbody>`;
}

export function tableReport(card: Card, _resultOnly = false) {
  const cards = getTableReport(card).employees.map(({ card: employee, report }, index) => {
    const time = (field: typeof employee.entries[number]["start"]) => field.value === null
      ? escape(field.raw || "—")
      : `${displayTime(field.value, employee)}${employee.format === "12" && employee.showAmPm ? ` ${field.ampm}` : ""}`;
    const rows = employee.entries.filter(entry => entry.row >= dateString(report.range.start) && entry.row < dateString(report.range.end))
      .map(source => {
        const entry = structuredClone(source);
        for (const field of [entry.start, entry.end, ...entry.breaks.flatMap(rest => [rest.start, rest.end])]) commitField(employee, entry, field);
        const breaks = entry.breaks.map(rest => `${time(rest.start)} – ${time(rest.end)}${rest.paid ? " (paid)" : ""}`).join("<br>") || (entry.dailyBreakMinutes ? `${entry.dailyBreakMinutes} min` : "—");
        return `<tr><th scope="row">${escape(entry.row)}</th><td>${time(entry.start)}</td><td>${time(entry.end)}</td><td>${breaks}</td></tr>`;
      }).join("");
    return `<section class="report-card readonly-time-card"><table class="summary-table"><caption><span class="report-card-heading"><span>${escape(employee.name || `Time card ${index + 1}`)}${employee.client ? `<small class="report-date">Client · ${escape(employee.client)}</small>` : ""}${employee.project ? `<small class="report-date">Project · ${escape(employee.project)}</small>` : ""}</span><span class="report-period">${dateString(report.range.start)} – ${dateString(report.range.end - 1)}</span></span></caption><thead><tr><th scope="col">Day</th><th scope="col">In</th><th scope="col">Out</th><th scope="col">Break</th></tr></thead><tbody>${rows}</tbody></table></section>`;
  }).join("");
  return `<h1>Time Card Calculator</h1><h2 class="report-title">Time cards</h2>${cards}${summaryReport(card, true)}`;
}
