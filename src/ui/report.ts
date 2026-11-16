import { type Card, getReport, getTableReport, displayTime, commitField } from "../state/card";
import { reportForMode } from "../state/simple";
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
export function summaryReport(card: Card, combined = false, simple = false, historical = false) {
  const r = reportForMode(card, simple);
  if (combined) {
    const all = simple
      ? { employees: [{ card, report: r }], total: r.total, pay: r.pay }
      : getTableReport(card);
    const groups = all.employees.length < 2 ? '' : all.employees.map(({card: employee, report}, index) =>
      `<section class="report-card"><h3>${escape(employee.name || `Time card ${index + 1}`)}</h3><table class="summary-table"><tbody><tr><th>Total time</th><td>${hhmm(report.total)}</td><td>${decimal(report.total, employee.settings.round)}</td></tr></tbody>${paySummary(employee, report)}</table></section>`
    ).join('');
    const totals = { ...r, pay: all.pay, rate: all.employees.some(employee => employee.report.rate !== r.rate) ? null : r.rate };
    for (const key of ["total", "regular", "overtime", "double"] as const)
      totals[key] = all.employees.reduce((sum, employee) => sum + employee.report[key], 0);
    return `<h2 class="report-title">All time cards</h2>${groups}<section class="report-grand-total" aria-label="Total time"><table class="summary-table"><tbody><tr class="report-total"><th scope="row">Total time</th><td>${hhmm(all.total)}</td><td>${decimal(all.total, card.settings.round)}</td></tr></tbody></table></section><h2 class="report-title">${card.length === "1" ? "Weekly totals" : "Period totals"}</h2><section class="report-card"><table class="summary-table">${paySummary(card, totals, false, false, all.pay === null ? null : all.employees.reduce((sum, employee) => sum + regularWages(employee.report)!, 0), all.pay === null ? null : all.employees.reduce((sum, employee) => sum + Math.round(employee.report.double * (employee.report.rate ?? 0) * 2 / 60), 0))}</table></section>`;
  }
  const weekday = (day: number) => new Intl.DateTimeFormat("en-US", {
    weekday: "short", timeZone: "UTC",
  }).format(new Date(day * 86400000));
  const hasContent = Array.from({ length: r.range.end - r.range.start }, (_, index) => card.content?.[dateString(r.range.start + index)]?.trim()).some(Boolean);
  const rows = Array.from({ length: r.range.end - r.range.start }, (_, index) => {
    const day = r.range.start + index;
    const minutes = r.rows.filter((row) => row.date === dateString(day)).reduce((sum, row) => sum + row.minutes, 0);
    if (!minutes) return "";
    return `<tr><th colspan="2" scope="row">${weekday(day)}<time class="report-date" datetime="${dateString(day)}">${dateString(day)}</time></th><td colspan="2">${hhmm(minutes)}</td><td colspan="2">${decimal(minutes, card.settings.round)}</td>${hasContent ? `<td class="report-content">${escape(card.content?.[dateString(day)] ?? "")}</td>` : ""}</tr>`;
  }).join("");
  return `<table class="summary-table report-hours"><caption>Hours</caption><colgroup><col class="formula-label"><col><col class="formula-symbol"><col><col class="formula-symbol"><col>${hasContent ? '<col class="content-column">' : ""}</colgroup>
    <thead><tr><th colspan="2" scope="col">Day</th><th colspan="2" scope="col">hh:mm</th><th colspan="2" scope="col">Decimal</th>${hasContent ? '<th scope="col">Content</th>' : ""}</tr></thead>
    <tbody>${rows}<tr class="report-total"><th colspan="2" scope="row">Total</th><td colspan="2">${hhmm(r.total)}</td><td colspan="2">${decimal(r.total, card.settings.round)}</td>${hasContent ? "<td></td>" : ""}</tr></tbody>
    </table>${readonlyBillingSettings(card)}<table class="summary-table">${paySummary(card, r, false, historical)}</table>`;
}

function overtimeRule(card: Card) {
  return card.settings.overtime === false ? 'No overtime' : card.settings.mode === 'ca' ? 'California rules · daily 8h / 12h, weekly 40h · 1.5× / 2×' : `${card.settings.mode === 'daily' ? 'Daily' : 'Weekly'} overtime after ${card.settings.mode === 'daily' ? 8 : 40} hours · ${card.settings.multiplier}×`;
}

function readonlyBillingSettings(card: Card) {
  const rate = card.settings.rate === null ? '' : String(card.settings.rate / 100);
  return `<div class="rate-settings report-billing-settings">${card.settings.rate === null ? "" : `<label><span class="field-label">Hourly rate</span><span class="rate-input"><span class="rate-currency">${escape(new Intl.NumberFormat('en-US', {style:'currency',currency:card.currency}).formatToParts(0).find(part=>part.type==='currency')!.value)}</span><input aria-label="Hourly rate" value="${escape(rate)}" readonly></span></label>`}<label><span class="field-label">Overtime rule</span><input aria-label="Overtime rule" value="${escape(overtimeRule(card))}" readonly></label></div>`;
}

function regularWages(r: Pick<ReturnType<typeof getReport>, "pay" | "billing" | "rate" | "regular">) {
  return r.pay === null ? null : r.billing === 'hourly' ? Math.round(r.regular * (r.rate ?? 0) / 60) : r.pay;
}

function paySummary(card: Card, r: Pick<ReturnType<typeof getReport>, "pay" | "billing" | "rate" | "regular" | "overtime" | "double" | "total">, hasContent = false, historical = false, combinedRegularPay?: number | null, combinedDoublePay?: number | null) {
  const totalSpan = hasContent ? ' colspan="2"' : "";
  const regularPay = combinedRegularPay === undefined ? regularWages(r) : combinedRegularPay;
  if (r.double > 0 || ["ca"].includes(card.settings.mode)) {
    const amount = (value: number | null) => value === null ? "—" : new Intl.NumberFormat("en-US", { style: "currency", currency: card.currency }).format(value / 100);
    const doublePay = combinedDoublePay === undefined ? (r.pay === null ? null : Math.round(r.double * (r.rate ?? 0) * 2 / 60)) : combinedDoublePay;
    const overtimePay = r.pay === null ? null : r.pay - (regularPay ?? 0) - (doublePay ?? 0);
    return `<tbody class="pay-summary"><tr><th></th><th scope="col">REG</th><th>+</th><th scope="col">OT</th><th>+</th><th scope="col">DT</th><th>=</th><th>Total</th></tr>
      <tr><th scope="row">hh:mm</th><td>${hhmm(r.regular)}</td><td class="operator">+</td><td>${hhmm(r.overtime)}</td><td class="operator">+</td><td>${hhmm(r.double)}</td><td class="operator">=</td><td>${hhmm(r.total)}</td></tr>
      <tr><th scope="row">Decimal</th><td>${decimal(r.regular, card.settings.round)}</td><td class="operator">+</td><td>${decimal(r.overtime, card.settings.round)}</td><td class="operator">+</td><td>${decimal(r.double, card.settings.round)}</td><td class="operator">=</td><td>${decimal(r.total, card.settings.round)}</td></tr>
      ${r.pay === null ? "" : `<tr><th scope="row">Rate/Hr</th><td>${amount(r.rate)}</td><td></td><td>${amount(r.rate === null ? null : Math.round(r.rate * 1.5))}</td><td></td><td>${amount(r.rate === null ? null : r.rate * 2)}</td><td></td><td></td></tr><tr class="report-total"><th scope="row">Gross pay</th><td>${amount(regularPay)}</td><td class="operator">+</td><td>${amount(overtimePay)}</td><td class="operator">+</td><td>${amount(doublePay)}</td><td class="operator">=</td><td>${amount(r.pay)}</td></tr>`}</tbody>`;
  }
  const premiumPay = r.pay === null ? null : r.pay - (regularPay ?? 0);
  const amount = (value: number | null) => value === null ? "—" : new Intl.NumberFormat("en-US", { style: "currency", currency: card.currency }).format(value / 100);
  return `    <tbody class="pay-summary">${historical ? `
      <tr><th colspan="${hasContent ? 7 : 6}">${card.length === "1" ? "Weekly totals" : "Period totals"}</th></tr>` : ""}
      <tr><th></th><th scope="col">REG</th><th class="operator">+</th><th scope="col">OT</th><th class="operator">=</th><th scope="col"${totalSpan}>Total</th></tr>
      <tr><th scope="row">hh:mm</th><td>${hhmm(r.regular)}</td><td class="operator">+</td><td>${hhmm(r.overtime + r.double)}</td><td class="operator">=</td><td${totalSpan}>${hhmm(r.total)}</td></tr>
      <tr><th scope="row">Decimal</th><td>${decimal(r.regular, card.settings.round)}</td><td class="operator">+</td><td>${decimal(r.overtime + r.double, card.settings.round)}</td><td class="operator">=</td><td${totalSpan}>${decimal(r.total, card.settings.round)}</td></tr>
      ${r.pay === null ? "" : `<tr><th scope="row">Rate/Hr</th><td>${amount(r.rate)}</td><td></td><td>${amount(r.rate === null || r.billing !== "hourly" || card.settings.overtime === false ? null : Math.round(r.rate * (card.settings.mode === "ca" ? 1.5 : card.settings.multiplier)))}${card.settings.mode === "ca" && card.settings.overtime !== false ? ` / ${amount(r.rate === null ? null : r.rate * 2)}` : ""}</td><td></td><td${totalSpan}></td></tr>
      <tr class="report-total"><th scope="row">Gross pay</th><td>${amount(regularPay)}</td><td class="operator">+</td><td>${amount(premiumPay)}</td><td class="operator">=</td><td${totalSpan}>${amount(r.pay)}</td></tr>`}
    </tbody>${r.pay === null ? `<caption>Hourly rate not set</caption>` : ""}`;
}

export function tableReport(card: Card, _resultOnly = false, simple = false) {
    const all = getTableReport(card);
    const employees = all.employees.map(({card: employee}) => ({card: employee, report: reportForMode(employee, simple)}));
    const totals = {...employees[0].report};
    for (const key of ["total", "regular", "overtime", "double"] as const)
      totals[key] = employees.reduce((sum, item) => sum + item.report[key], 0);
    totals.pay = employees.some(item => item.report.pay === null) ? null : employees.reduce((sum, item) => sum + item.report.pay!, 0);
    const sections = employees.map(({card: employee, report}) => {
      const identity = [["Name", employee.name], ["Period", !employee.hidePeriod && employee.anchor ? `${dateString(report.range.start)} – ${dateString(report.range.end - 1)}` : ""], ["Client", employee.client], ["Project", employee.project]];
      return `<section class="employee-report"><table class="summary-table report-identity"><tbody>${identity.filter(([,value]) => value).map(([label,value]) => `<tr><th scope="row">${label}</th><td>${escape(value)}</td></tr>`).join("")}</tbody></table>${timeCardDetails(employee, simple)}<ul>${report.errors.map(error => `<li>${escape(error)}</li>`).join("")}</ul></section>`;
    }).join("");
    const dates = [...new Set(employees.flatMap(item => item.report.rows.map(row => row.date)))].sort();
    const hours = `<table class="summary-table report-hours"><caption>Hours</caption><colgroup><col class="formula-label"><col><col class="formula-symbol"><col><col class="formula-symbol"><col></colgroup><thead><tr><th colspan="2">Day</th><th colspan="2">hh:mm</th><th colspan="2">Decimal</th></tr></thead><tbody>${dates.map(date => {
      const minutes = employees.reduce((sum,item) => sum + item.report.rows.filter(row => row.date === date).reduce((n,row) => n + row.minutes,0),0);
      const day = new Date(`${date}T12:00:00Z`).toLocaleDateString('en-US',{weekday:'short',timeZone:'UTC'});
      return minutes ? `<tr><th colspan="2">${day}${card.hidePeriod ? "" : `<time class="report-date">${date}</time>`}</th><td colspan="2">${hhmm(minutes)}</td><td colspan="2">${decimal(minutes,card.settings.round)}</td></tr>` : "";
    }).join("")}<tr class="report-total"><th colspan="2">Total</th><td colspan="2">${hhmm(totals.total)}</td><td colspan="2">${decimal(totals.total,card.settings.round)}</td></tr></tbody></table>`;
    const billing = employees.filter((item,index) => employees.findIndex(other => other.report.rate === item.report.rate && overtimeRule(other.card) === overtimeRule(item.card)) === index).map(item => readonlyBillingSettings(item.card)).join("");
    totals.rate = employees.every(item => item.report.rate === totals.rate) ? totals.rate : null;
    return `<h2 class="print-title">Time Card Calculator</h2>${sections}${hours}${billing}<table class="summary-table">${paySummary(card, totals, false, true, totals.pay === null ? null : employees.reduce((sum,item) => sum + regularWages(item.report)!,0), totals.pay === null ? null : employees.reduce((sum,item) => sum + Math.round(item.report.double * (item.report.rate ?? 0) * 2 / 60),0))}</table>`;
}

function timeCardDetails(card: Card, simple = false) {
  return getTableReport(card).employees.map(({ card: employee }, index) => {
    const report = reportForMode(employee, simple);
    const time = (field: typeof employee.entries[number]["start"]) => field.value === null
      ? escape(field.raw || "—")
      : `${displayTime(field.value, employee)}${employee.format === "12" && employee.showAmPm ? ` ${field.ampm}` : ""}`;
    const entries = employee.entries.filter(entry => entry.row >= dateString(report.range.start) && entry.row < dateString(report.range.end) && report.rows.some(row => row.date === entry.row && row.minutes > 0));
    const hasBreak = entries.some(entry => entry.breaks.length > 0 || (entry.dailyBreakMinutes ?? 0) > 0 || (employee.durationBreaks?.[entry.row]?.some(value => value > 0) ?? false)) || employee.settings.auto;
    const hasContent = entries.some(entry => employee.content?.[entry.row]?.trim());
    const rows = entries.map(source => {
        const entry = structuredClone(source);
        if (employee.durationBreaks?.[entry.row] !== undefined) entry.breaks = entry.breaks.filter(rest => !rest.automatic);
        for (const field of [entry.start, entry.end, ...entry.breaks.flatMap(rest => [rest.start, rest.end])]) commitField(employee, entry, field);
        const explicitMinutes = entry.breaks.reduce((sum, rest) => sum + (rest.start.value === null || rest.end.value === null ? 0 : (rest.end.value - rest.start.value + 1440) % 1440), 0);
        const automaticMinutes = employee.entries.find(e => e.row === entry.row)?.id === entry.id ? report.rows.filter(row => row.date === entry.row).reduce((sum, row) => sum + row.automaticDeduction, 0) : 0;
        const duration = employee.durationBreaks?.[entry.row];
        const durationMinutes = employee.entries.find(e => e.row === entry.row)?.id === entry.id ? (duration ?? []).reduce((sum, value) => sum + value, 0) : 0;
        const breakMinutes = explicitMinutes + (duration !== undefined ? durationMinutes : employee.settings.auto ? automaticMinutes : entry.breaks.length ? 0 : entry.dailyBreakMinutes ?? 0);
        const breaks = `${breakMinutes} min`;
        return `<tr><th scope="row">${new Date(`${entry.row}T12:00:00Z`).toLocaleDateString("en-US",{weekday:"short",timeZone:"UTC"})}${employee.hidePeriod ? "" : ` ${escape(entry.row)}`}</th><td>${time(entry.start)}</td><td>${time(entry.end)}</td>${hasBreak ? `<td>${breaks}</td>` : ""}${hasContent ? `<td class="report-content">${escape(employee.content?.[entry.row] ?? "")}</td>` : ""}</tr>`;
      }).join("");
    return `<section class="report-card readonly-time-card"><table class="summary-table"><caption>Time Card</caption><thead><tr><th scope="col">Day</th><th scope="col">In</th><th scope="col">Out</th>${hasBreak ? '<th scope="col">Break</th>' : ""}${hasContent ? '<th scope="col">Content</th>' : ""}</tr></thead><tbody>${rows}</tbody></table></section>`;
  }).join("");
}
