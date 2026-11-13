import { tableReport, summaryReport, escape } from "./report";
import {
  cardPeriod,
  getTableReport,
  selectEmployee,
  addEmployee,
  employeeCards,
  removeEmployee,
} from "../state/card";
import {
  makeTemplate,
  applyTemplate,
  loadTemplates,
  saveTemplates,
  makeReceipt,
  decodeReceipt,
  receiptStatus,
  type Template,
} from "../io/workflows";
import { applyPreset, routePreset, type Preset } from "../state/presets";
import { hhmm, dateString } from "../domain/core";
import { dayNumber } from "../domain/report";
import {
  type Card,
  type Entry,
  type Field,
  addEntry,
  initialize,
  field,
  commitField,
  setMinute,
  displayTime,
  getReport,
  createCard,
} from "../state/card";
import {
  load,
  save,
  csv,
  encodeShare,
  decodeShare,
  encodeReceiptLink,
  decodeReceiptLink,
} from "../io/delivery";
const id = () => crypto.randomUUID();
const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
export async function start() {
  let storage: Storage;
  try {
    storage = localStorage;
  } catch {
    storage = {
      getItem: () => {
        throw Error("Storage denied");
      },
      setItem: () => {
        throw Error("Storage denied");
      },
    } as unknown as Storage;
  }
  const loaded = load(storage);
  let card = loaded.card ?? createCard(today()),
    blocked = loaded.blocked;
  if (!loaded.card) applyPreset(card, routePreset(location.pathname));
  let message = loaded.error || "",
    sharePreview: Card | null = null;
  const root = document.querySelector<HTMLElement>("#calculator")!;
  const workerCardsRoot = root.querySelector<HTMLElement>("#worker-cards")!;
  const workerTemplate = root.querySelector<HTMLTemplateElement>("#worker-card-template")!;
  const workerViews = new Map<string, HTMLElement>();
  let workerRoot!: HTMLElement;
  let days!: HTMLElement;
  let readonlyCard: Card | null = null;
  let copiedSnapshot = "";
  function workerView(employeeId: string) {
    let view = workerViews.get(employeeId);
    if (!view) {
      view = workerTemplate.content.firstElementChild!.cloneNode(true) as HTMLElement;
      view.dataset.workerId = employeeId;
      workerViews.set(employeeId, view);
    }
    return view;
  }
  function activateWorker(employeeId = card.selectedEmployee) {
    if (card.selectedEmployee !== employeeId) selectEmployee(card, employeeId);
    workerRoot = workerView(employeeId);
    days = workerRoot.querySelector<HTMLElement>("[data-days]")!;
  }
  function activateWorkerFromTarget(target: EventTarget | null) {
    if (!(target instanceof HTMLElement)) return;
    const view = target.closest<HTMLElement>(".worker-card[data-worker-id]");
    if (view?.dataset.workerId) activateWorker(view.dataset.workerId);
  }
  function showError(error: unknown) {
    document.querySelector("#save-status")!.textContent = String(error);
    document.querySelector("#readonly-status")!.textContent = String(error);
  }
  function downloadCsv(value: Card) {
    const url = URL.createObjectURL(
      new Blob([csv(value)], { type: "text/csv;charset=utf-8" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = "time-card.csv";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  async function shareLink(mode: "readonly") {
    const hash = await encodeShare(card, mode);
    const box = document.querySelector<HTMLInputElement>("#share-url")!;
    box.hidden = false;
    box.value = location.origin + location.pathname + "#" + hash;
    box.select();
  }
  function refreshTemplates() {
    try {
      document.querySelector("#templates")!.innerHTML = loadTemplates(storage)
        .map(
          (t) => `<option value="${escape(t.id)}">${escape(t.name)}</option>`,
        )
        .join("");
    } catch (error) {
      showError(error);
    }
  }
  function selectedTemplate(): Template | undefined {
    return loadTemplates(storage).find(
      (t) =>
        t.id === document.querySelector<HTMLSelectElement>("#templates")!.value,
    );
  }
  async function renderReceipts() {
    const rows = await Promise.all(
      card.receipts.map(
        async (r) =>
          `<p>${escape(r.decision)} · ${escape(r.name)} · ${escape(r.time)} · ${escape(r.note)} · ${await receiptStatus(card, r)}</p>`,
      ),
    );
    document.querySelector("#receipts")!.innerHTML = rows.join("");
  }
  function updateCopiedState() {
    const copied = copiedSnapshot !== "" && copiedSnapshot === JSON.stringify(card);
    const button = document.querySelector<HTMLButtonElement>("#share")!;
    button.classList.toggle("copied", copied);
    if (copied) button.setAttribute("aria-label", "Copy share link, copied");
    else button.removeAttribute("aria-label");
  }
  function persist() {
    updateCopiedState();
    message = blocked
      ? "Original damaged draft preserved. Clear to replace it."
      : save(storage, card);
    document.querySelector("#save-status")!.textContent = message === "Saved on this browser" ? "" : message;
  }
  function rowSnapshot(entries: Entry[]) {
    const value = (f: Field) => [f.value, f.ampm, f.dirty ? f.raw : f.value === null ? f.raw : ""];
    return JSON.stringify(entries.map((entry) => ({
      start: value(entry.start), end: value(entry.end),
      breaks: entry.breaks.map((rest) => ({ start: value(rest.start), end: value(rest.end), paid: rest.paid })),
    })));
  }
  function stopRowSync(date: string) {
    if (card.syncedRows) delete card.syncedRows[`${card.selectedEmployee}:${date}`];
  }
  function fillFollowingDays(source: Entry) {
    const day = dayNumber(source.row);
    const sources = card.entries.filter((entry) => entry.row === source.row);
    if (sources.some((entry) => entry.start.value === null || entry.end.value === null || entry.start.dirty || entry.end.dirty || entry.breaks.some((b) => b.start.value === null || b.end.value === null || b.start.dirty || b.end.dirty))) return false;
    let copied = false;
    for (let offset = 1; day + offset < cardPeriod(card).end; offset++) {
      if ([0, 6].includes(new Date((day + offset) * 86400000).getUTCDay())) continue;
      const date = dateString(day + offset);
      const targets = card.entries.filter((entry) => entry.row === date);
      if (!targets.length) continue;
      const syncKey = `${card.selectedEmployee}:${date}`;
      const previous = card.syncedRows?.[syncKey];
      const untouched = previous !== undefined && previous === rowSnapshot(targets);
      const blank = targets.every((entry) => !entry.start.raw && !entry.end.raw && entry.breaks.every((b) => b.automatic || (!b.start.raw && !b.end.raw)));
      if (untouched && rowSnapshot(targets) === rowSnapshot(sources)) continue;
      if (untouched) {
        card.entries = card.entries.filter((entry) => entry.row !== date);
        for (const entry of sources) {
          const clone = structuredClone(entry);
          clone.id = id();
          clone.row = date;
          clone.actualDate = null;
          clone.breaks.forEach((rest) => rest.id = id());
          card.entries.push(clone);
        }
        (card.syncedRows ??= {})[syncKey] = rowSnapshot(card.entries.filter((entry) => entry.row === date));
        copied = true;
        continue;
      }
      sources.forEach((entry, index) => {
        let target = targets[index];
        if (!target) {
          target = addEntry(card, date, id());
        }
        for (const key of ["start", "end"] as const) {
          if (!target[key].raw && target[key].value === null) {
            target[key] = structuredClone(entry[key]);
            copied = true;
          }
        }
        entry.breaks.forEach((sourceBreak, breakIndex) => {
          const targetBreak = target.breaks[breakIndex];
          if (!targetBreak) {
            target.breaks.push({ ...structuredClone(sourceBreak), id: id() });
            copied = true;
            return;
          }
          for (const key of ["start", "end"] as const) {
            if (!targetBreak[key].raw && targetBreak[key].value === null) {
              targetBreak[key] = structuredClone(sourceBreak[key]);
              copied = true;
            }
          }
        });
      });
      if (blank) (card.syncedRows ??= {})[syncKey] = rowSnapshot(card.entries.filter((entry) => entry.row === date));
    }
    return copied;
  }
  function input(entry: Entry, f: Field, key: string, label: string) {
    return `<label class="time-field"><span class="time-field-heading"><span>${label}</span></span><span class="time-control"><input aria-label="${label} ${escape(entry.row)}" data-entry="${entry.id}" data-field="${key}" value="${escape(f.dirty ? f.raw : f.value === null ? f.raw : displayTime(f.value, card))}" inputmode="text" autocomplete="off" placeholder="9:00 or 900" ${f.raw && f.value === null ? 'aria-invalid="true"' : ""}>${card.format === "12" && card.showAmPm ? `<button type="button" class="meridiem ${f.ampm.toLowerCase()}" role="switch" aria-checked="${f.ampm === "PM"}" aria-label="${label} PM" data-toggle-meridiem="${key}" data-entry="${entry.id}"><span>${f.ampm}</span></button>` : ""}</span>${f.value !== null && (!card.showAmPm || card.format === "24") ? `<small>${hhmm(f.value)}</small>` : ""}</label>`;
  }
  function timeline(entries: Entry[]) {
    const content = entries.map((source) => {
      const entry = structuredClone(source);
      for (const field of [entry.start, entry.end, ...entry.breaks.flatMap(rest => [rest.start, rest.end])]) {
        commitField(card, entry, field);
      }
      const hasWork = entry.start.value !== null && entry.end.value !== null;
      const start = entry.start.value ?? 0;
      const finish = entry.end.value ?? 0;
      const end = finish + (finish < start ? 1440 : 0);
      const shift = hasWork
        ? `<span class="shift-bar" style="left:${(start / 1440) * 100}%;width:${((Math.min(end, 1440) - start) / 1440) * 100}%"></span>${end > 1440 ? `<span class="shift-bar continuation" style="left:0;width:${(finish / 1440) * 100}%"></span>` : ""}`
        : "";
      const workEndpoints = (hasWork ? (["start", "end"] as const) : [])
        .map(
          (key) =>
            `<button type="button" class="handle" style="left:calc(${(entry[key].value! / 1440) * 100}% - 22px)" data-handle="${key}" data-entry="${entry.id}" aria-label="Adjust ${key} ${escape(entry.row)} with arrow keys" title="Use arrow keys to adjust ${key}"></button>`,
        )
        .join("");
      const breaks = entry.breaks
        .map((rest, index) => {
          if (rest.start.value === null || rest.end.value === null) return "";
          const start = rest.start.value;
          const finish = rest.end.value;
          const width = (((finish - start + 1440) % 1440) / 1440) * 100;
          return `<span class="break-bar ${rest.paid ? "paid" : ""}" style="left:${(start / 1440) * 100}%;width:${width}%"></span>${(["start", "end"] as const)
            .map(
              (key) =>
                `<button type="button" class="handle break-handle" style="left:calc(${(rest[key].value! / 1440) * 100}% - 22px)" data-handle="b${index}-${key}" data-entry="${entry.id}" aria-label="Adjust break ${key} ${escape(entry.row)} with arrow keys" title="Use arrow keys to adjust this break"></button>`,
            )
            .join("")}`;
        })
        .join("");
      return shift + workEndpoints + breaks;
    }).join("");
    return content ? `<div class="track-row">${content}</div>` : "";
  }
  function alignAnchor() {
    if (!["month", "custom"].includes(card.length))
      card.anchor = dateString(cardPeriod(card).start);

  }
  let calendarMonth = "";
  let choosingEnd = false;
  const dateDialog = document.querySelector<HTMLDialogElement>("#date-range-dialog")!;
  const rangeStart = document.querySelector<HTMLInputElement>("#range-start")!;
  const rangeEnd = document.querySelector<HTMLInputElement>("#range-end")!;
  dateDialog.addEventListener("close", () => {
    rangeStart.disabled = true;
    rangeEnd.disabled = true;
  });
  function renderCalendar() {
    const first = dayNumber(calendarMonth + "-01");
    const month = new Date(first * 86400000);
    const next = Math.floor(Date.UTC(month.getUTCFullYear(), month.getUTCMonth() + 1, 1) / 86400000);
    const offset = (month.getUTCDay() - card.settings.weekStart + 7) % 7;
    document.querySelector("#calendar-month")!.textContent = new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric", timeZone: "UTC" }).format(month);
    document.querySelector("#calendar-weekdays")!.innerHTML = Array.from({ length: 7 }, (_, index) => `<span>${new Intl.DateTimeFormat("en-US", { weekday: "short", timeZone: "UTC" }).format(new Date(Date.UTC(2026, 0, 4 + (card.settings.weekStart + index) % 7)))}</span>`).join("");
    document.querySelector("#calendar-days")!.innerHTML = '<span aria-hidden="true"></span>'.repeat(offset) + Array.from({ length: next - first }, (_, index) => {
      const date = dateString(first + index);
      const selected = date === rangeStart.value || date === rangeEnd.value;
      const inside = date >= rangeStart.value && date <= rangeEnd.value;
      return `<button type="button" data-range-day="${date}" class="${selected ? "range-edge" : inside ? "in-range" : ""}" aria-pressed="${selected}" aria-label="${date}">${index + 1}</button>`;
    }).join("");
    rangeEnd.min = rangeStart.value;
    setFieldError(rangeStart, rangeStart.validity.valid ? "" : rangeStart.validationMessage);
    setFieldError(rangeEnd, rangeEnd.validity.valid ? "" : rangeEnd.validationMessage);
    document.querySelector("#range-instruction")!.textContent = choosingEnd ? "Select an end date." : "Select a start date, then an end date.";
  }
  function openDateRange() {
    rangeStart.disabled = false;
    rangeEnd.disabled = false;
    const range = cardPeriod(card);
    rangeStart.value = dateString(range.start);
    rangeEnd.value = dateString(range.end - 1);
    calendarMonth = rangeStart.value.slice(0, 7);
    choosingEnd = false;
    renderCalendar();
    dateDialog.showModal();
  }
  for (const input of [rangeStart, rangeEnd]) {
    input.addEventListener("change", () => {
      if (!input.value) {
        setFieldError(input, input.validationMessage);
        return;
      }
      if (input === rangeStart && rangeEnd.value < rangeStart.value) rangeEnd.value = rangeStart.value;
      calendarMonth = input.value.slice(0, 7);
      choosingEnd = false;
      renderCalendar();
    });
  }
  function renderDays() {
    alignAnchor();
    const range = cardPeriod(card);
    initialize(card, id);
    for (const date of range.dates) {
      const entries = card.entries.filter((entry) => entry.row === date);
      for (const entry of entries) {
        const legacy = entry.dailyBreakMinutes;
        if (legacy === undefined && !(card.settings.auto && entry === entries[0])) continue;
        let rest = entry.breaks.find((b) => b.automatic);
        if (!rest) {
          rest = { id: id(), start: field(), end: field(), paid: false, automatic: true };
          entry.breaks.push(rest);
        }
        setMinute(card, entry, rest.start, 720);
        setMinute(card, entry, rest.end, (720 + (legacy ?? card.settings.deduction)) % 1440);
        delete entry.dailyBreakMinutes;
      }
      const syncKey = `${card.selectedEmployee}:${date}`;
      if (card.settings.auto && card.syncedRows?.[syncKey]) card.syncedRows[syncKey] = rowSnapshot(entries);
    }
    const result = getReport(card);
    const multipleWeeks = range.contextEnd - range.contextStart > 7;
    for (const control of workerRoot.querySelectorAll("[data-choose-dates]"))
      control.textContent = `${dateString(range.start)} – ${dateString(range.end - 1)}`;
    let html = "";
    for (let week = range.contextStart; week < range.contextEnd; week += 7) {
      html += `<section class="week-block" aria-label="Week ${Math.floor((week - range.contextStart) / 7) + 1}"><table class="entry-table">${multipleWeeks ? `<thead><tr><th colspan="2" class="week-heading"><div><span>Week ${Math.floor((week - range.contextStart) / 7) + 1}</span><span>${dateString(Math.max(week, range.start))} – ${dateString(Math.min(week + 6, range.end - 1))}</span></div></th></tr></thead>` : ""}<tbody class="week" data-week="${dateString(week)}">`;
      for (let day = Math.max(week, range.start); day < Math.min(week + 7, range.end); day++) {
        const date = dateString(day),
          context = day < range.start || day >= range.end,
          entries = card.entries.filter((e) => e.row === date),
          row = result.rows.find((r) => r.date === date);
        html += `<tr class="day ${context ? "context" : ""}" data-date="${date}"><td colspan="2"><div class="day-content"><div class="day-heading"><span>${new Intl.DateTimeFormat("en-US", { weekday: "short", timeZone: "UTC" }).format(new Date(day * 86400000))}</span><time class="day-date" datetime="${date}">${new Intl.DateTimeFormat("en-US", { month: "2-digit", day: "2-digit", timeZone: "UTC" }).format(new Date(day * 86400000))}</time><span class="day-hours">${context ? "Context day" : row ? hhmm(row.minutes) : "—"}</span></div><div class="timeline" ${entries.length ? "" : "hidden"} data-timeline="${date}" aria-label="Timeline ${date}"><div class="ticks"><span>00</span><span>06</span><span>12</span><span>18</span><span>24</span></div>${timeline(entries) || '<div class="empty-track">Enter In and Out to show the timeline</div>'}</div>`;
        for (const e of entries) {
          html += `<div class="period" data-period="${e.id}"><div class="work-fields">${input(e, e.start, "start", "In")}${input(e, e.end, "end", "Out")}<button class="icon-button" data-remove="${e.id}" aria-label="Delete work period ${date}">×</button></div>${e.actualDate && e.actualDate !== e.row ? `<small>Actual start date ${e.actualDate}</small>` : ""}${e.start.value !== null && e.end.value !== null && e.end.value < e.start.value ? "<small>Out is on the next day (+1 day)</small>" : ""}<div class="break-details">${e.breaks.map((b, i) => `<div class="break-fields">${input(e, b.start, `b${i}-start`, "Break in")}${input(e, b.end, `b${i}-end`, "Break out")}${b.paid ? '<span class="legacy-paid">Paid break</span>' : ""}<button data-remove-break="${e.id}:${i}" aria-label="Delete break">×</button></div>`).join("")}</div></div>`;
        }
        html += `<button class="text-button" data-add="${date}">+ Add work period</button><button class="text-button" data-break-date="${date}" data-add-break="${entries.slice().reverse().find((e) => e.start.value !== null && e.end.value !== null)?.id ?? entries[0]?.id ?? ""}">+ Add break</button><button class="text-button" data-add-content="${date}">+ Add content</button>${card.content && Object.hasOwn(card.content, date) ? `<label class="content-field">Work content<input type="text" data-content="${date}" maxlength="2000" value="${escape(card.content[date])}"></label>` : ""}<ul class="day-errors" role="alert" data-errors="${date}"></ul></div></td></tr>`;
      }
      html += "</tbody></table></section>";
    }
    days.innerHTML = html;
    for (const content of days.querySelectorAll(".day-content")) {
      const timeline = content.querySelector(".timeline");
      const add = content.querySelector("[data-add]");
      if (timeline && add) {
        const actions = document.createElement("div");
        actions.className = "day-actions";
        add.before(actions);
        actions.append(add);
        const breaks = content.querySelectorAll("[data-add-break], [data-add-content]");
        breaks.forEach((button) => actions.append(button));

      }
    }
    updateResults();
  }
  function setFieldError(control: HTMLInputElement | HTMLSelectElement, message: string) {
    const errorId = control.dataset.errorId ?? `field-error-${id()}`;
    const existing = document.getElementById(errorId);
    if (!message) {
      existing?.remove();
      control.removeAttribute("aria-invalid");
      control.removeAttribute("aria-describedby");
      return;
    }
    control.dataset.errorId = errorId;
    control.setAttribute("aria-invalid", "true");
    control.setAttribute("aria-describedby", errorId);
    const text = existing ?? document.createElement("span");
    text.id = errorId;
    text.className = "field-message";
    text.textContent = message;
    if (!existing) {
      const timeHeading = control.closest(".time-field")?.querySelector(".time-field-heading");
      (timeHeading ?? control.closest("label") ?? control.parentElement)!.append(text);
    }
  }
  function renderValidation(report: ReturnType<typeof getReport>) {
    const controls = [
      ...workerRoot.querySelectorAll<HTMLInputElement | HTMLSelectElement>("[data-field], [data-setting], [data-card], .overtime-rule"),
      ...root.querySelectorAll<HTMLInputElement | HTMLSelectElement>("#settings [data-setting], #settings [data-card], .rate-settings [data-setting], .overtime-rule"),
    ];
    const messages = new Map<HTMLInputElement | HTMLSelectElement, string>();
    for (const control of controls) {
      if (!control.disabled && !control.validity.valid) messages.set(control, control.validationMessage);
    }
    for (const issue of report.issues) {
      const entry = card.entries.find((item) => item.id === issue.segmentId);
      if (!entry) continue;
      const field = issue.breakId === undefined ? issue.field : `b${entry.breaks.findIndex((rest) => rest.id === issue.breakId)}-${issue.field}`;
      const control = days.querySelector<HTMLInputElement>(`[data-entry="${entry.id}"][data-field="${field}"]`);
      if (control) messages.set(control, issue.message);
    }
    if (report.errors.some((error) => error.includes("automatic break exceeds hours"))) messages.set(workerRoot.querySelector<HTMLInputElement>('[data-setting="deduction"]')!, "Daily break is longer than the working time.");
    for (const control of controls) setFieldError(control, messages.get(control) ?? "");
  }
  function updateResults() {
    const r = getReport(card);
    for (const day of days.querySelectorAll<HTMLElement>(".day:not(.context)")) {
      const label = day.querySelector(".day-hours");
      const row = r.rows.find((row) => row.date === day.dataset.date);
      if (label) label.textContent = row ? hhmm(row.minutes) : "—";
      const track = day.querySelector<HTMLElement>(".timeline");
      if (track) track.innerHTML = `<div class="ticks"><span>00</span><span>06</span><span>12</span><span>18</span><span>24</span></div>${timeline(card.entries.filter(entry => entry.row === day.dataset.date)) || '<div class="empty-track">Enter In and Out to show the timeline</div>'}`;
    }
    workerRoot.querySelector<HTMLInputElement>('[data-setting="deduction"]')!.disabled = !card.settings.auto;
    root.querySelector(".rate-currency")!.textContent = new Intl.NumberFormat("en-US", { style: "currency", currency: card.currency }).formatToParts(0).find((part) => part.type === "currency")!.value;
    workerRoot.setAttribute("aria-label", card.name ? `${card.name} time card` : "Employee time card");
    workerRoot.querySelector<HTMLButtonElement>("[data-remove-worker]")?.setAttribute("aria-label", `Remove ${card.name || "time card"}`);
    for (const entryErrors of days.querySelectorAll<HTMLElement>("[data-errors]")) {
      const entries = card.entries.filter((entry) => entry.row === entryErrors.dataset.errors);
      entryErrors.innerHTML = r.errors.filter((error) => (entries.some((entry) => error.startsWith(entry.id + ":")) || error.startsWith(entryErrors.dataset.errors + ":")) && !r.issues.some((issue) => error.startsWith(issue.segmentId + ":")))
        .map((error) => `<li>${escape(error.slice(error.indexOf(":") + 1).trim())}</li>`).join("");
    }
    renderValidation(r);
    const markup = summaryReport(card, true);
    root.querySelector("#daily-report")!.innerHTML = markup;
    document.querySelector("#print-report")!.innerHTML = tableReport(card, true);
    root.querySelector<HTMLSelectElement>(".overtime-rule")!.disabled = card.billing !== "hourly";
    void renderReceipts();
  }
  function syncControls() {
    root.querySelector<HTMLSelectElement>(".overtime-rule")!.value = card.settings.overtime === false ? "none" : card.settings.mode;
    for (const el of [
      ...workerRoot.querySelectorAll<
      HTMLInputElement | HTMLSelectElement
      >( "[data-card]"),
      ...root.querySelectorAll<HTMLInputElement | HTMLSelectElement>("#settings [data-card]"),
    ]) {
      const key = el.dataset.card! as keyof Card;
      el.setCustomValidity("");
      if (el instanceof HTMLInputElement && el.type === "checkbox")
        el.checked = Boolean(card[key]);
      else el.value = String(card[key]);
    }
    for (const el of [
      ...workerRoot.querySelectorAll<
      HTMLInputElement | HTMLSelectElement
      >( "[data-setting]"),
      ...root.querySelectorAll<HTMLInputElement | HTMLSelectElement>("#settings [data-setting], .rate-settings [data-setting]"),
    ]) {
      const key = el.dataset.setting! as keyof Card["settings"];
      el.setCustomValidity("");
      if (el instanceof HTMLInputElement && el.type === "checkbox")
        el.checked =
          key === "overtime"
            ? card.settings.overtime !== false
            : Boolean(card.settings[key]);
      else
        el.value =
          key === "rate"
            ? card.settings.rate === null
              ? ""
              : String(card.settings.rate / 100)
            : key === "dayStart"
              ? hhmm(card.settings.dayStart).padStart(5, "0")
              : String(card.settings[key]);
    }
  }
  function renderWorkerCards() {
    const employees = employeeCards(card);
    const ids = employees.map((employee) => employee.selectedEmployee);
    const selected = card.selectedEmployee;
    for (const [employeeId, view] of workerViews) {
      if (ids.includes(employeeId)) continue;
      view.remove();
      workerViews.delete(employeeId);
    }
    const protectedId = card.employeeOrder?.find((employeeId) => ids.includes(employeeId)) ?? ids[0];
    for (const employee of employees) {
      const view = workerView(employee.selectedEmployee);
      workerCardsRoot.append(view);
      const remove = view.querySelector<HTMLButtonElement>("[data-remove-worker]")!;
      remove.hidden = employee.selectedEmployee === protectedId;
      remove.dataset.removeWorker = employee.selectedEmployee;
      remove.setAttribute("aria-label", `Remove ${employee.name || "time card"}`);
    }
    for (const employee of employees) {
      activateWorker(employee.selectedEmployee);
      syncControls();
      renderDays();
    }
    activateWorker(ids.includes(selected) ? selected : ids[0]);
    syncControls();
    root.querySelector<HTMLButtonElement>("#add-time-card")!.disabled = card.employees.length + 2 > 100;
    updateResults();
  }
  function renderAllWorkerDays() {
    const selected = card.selectedEmployee;
    for (const employee of employeeCards(card)) {
      activateWorker(employee.selectedEmployee);
      syncControls();
      renderDays();
    }
    activateWorker(selected);
    syncControls();
    updateResults();
  }
  function locate(target: HTMLElement) {
    const entry = card.entries.find((e) => e.id === target.dataset.entry)!;
    const key =
      target.dataset.field ?? target.dataset.meridiem ?? target.dataset.handle!;
    const f = key.startsWith("b")
      ? entry.breaks[Number(key.split("-")[0].slice(1))][
          key.split("-")[1] as "start" | "end"
        ]
      : entry[key as "start" | "end"];
    return { entry, f };
  }
  function selectExistingInput(event: Event) {
    activateWorkerFromTarget(event.target);
    if (event.type === "focusin") {
      syncControls();
      renderValidation(getReport(card));
    }
    const input = event.target;
    if (input instanceof HTMLInputElement && !input.readOnly && ["text", "number"].includes(input.type)) {
      input.focus();
      input.select();
    }
  }
  root.addEventListener("focusin", selectExistingInput);
  root.addEventListener("click", selectExistingInput);
  root.addEventListener("pointerdown", (event) => {
    const input = event.target;
    if (input instanceof HTMLInputElement && !input.readOnly && input.value && ["text", "number"].includes(input.type)) {
      event.preventDefault();
      input.focus();
      input.select();
    }
  });
  root.addEventListener("input", (event) => {
    const target = event.target as HTMLInputElement;
    activateWorkerFromTarget(target);
    if (target.dataset.setting || target.dataset.card) target.setCustomValidity("");
    if (target.dataset.field || target.dataset.setting || target.dataset.card || target.dataset.content) {
      copiedSnapshot = "";
      updateCopiedState();
    }
    if (target.dataset.content) {
      (card.content ??= {})[target.dataset.content] = target.value;
      updateResults();
      persist();
    } else if (target.dataset.field) {
      if (target.dataset.field.startsWith("b")) {
        card.settings.auto = false;
        syncControls();
      }
      const { entry, f } = locate(target);
      stopRowSync(entry.row);
      f.raw = target.value;
      f.dirty = true;
      updateResults();
      persist();
    } else if (target.dataset.card === "name") {
      card.name = target.value;
      updateResults();
      persist();
    } else if (target.dataset.setting || target.dataset.card) renderValidation(getReport(card));
  });
  root.addEventListener("focusout", (event) => {
    const target = event.target as HTMLInputElement;
    activateWorkerFromTarget(target);
    if (target.dataset.field) {
      const { entry, f } = locate(target);
      commitField(card, entry, f);
      target.value = f.raw;
      const meridiem =
        target.parentElement?.querySelector<HTMLSelectElement>("select");
      if (meridiem) meridiem.value = f.ampm;
      target.setAttribute(
        "aria-invalid",
        String(Boolean(f.raw && f.value === null)),
      );
      let movedBreak = false;
      if (target.dataset.field?.startsWith("b")) {
        const index = Number(target.dataset.field.split("-")[0].slice(1));
        const rest = entry.breaks[index];
        if (rest.start.value !== null && rest.end.value !== null) {
          const owner = card.entries.find((candidate) => {
            if (candidate.row !== entry.row || candidate.start.value === null || candidate.end.value === null) return false;
            const start = candidate.start.value;
            const end = candidate.end.value + (candidate.end.value < start ? 1440 : 0);
            const breakStart = rest.start.value! + (rest.start.value! < start ? 1440 : 0);
            const breakEnd = breakStart + (rest.end.value! - rest.start.value! + 1440) % 1440;
            return breakStart >= start && breakEnd <= end;
          });
          if (owner && owner !== entry) {
            entry.breaks.splice(index, 1);
            owner.breaks.push(rest);
            movedBreak = true;
          }
        }
      }
      const copied = fillFollowingDays(entry);
      if (copied || movedBreak) renderDays();
      updateResults();
      persist();
      const track = target.closest(".day")?.querySelector(".timeline");
      if (track)
        track.innerHTML =
          `<div class="ticks"><span>00</span><span>06</span><span>12</span><span>18</span><span>24</span></div>` +
          timeline(card.entries.filter((e) => e.row === entry.row));
    }
  });
  root.addEventListener("change", (event) => {
    const el = event.target as HTMLInputElement;
    activateWorkerFromTarget(el);
    if (el === rangeStart || el === rangeEnd) return;
    if (!el.checkValidity()) {
      setFieldError(el, el.validationMessage);
      return;
    }
    if (
      el.dataset.card === "endDate" ||
      el.dataset.card === "anchor" ||
      el.dataset.card === "length"
    ) {
      const proposed = { ...card, [el.dataset.card]: el.value };
      if (el.dataset.card === "length" && el.value === "custom" && card.length !== "custom") proposed.endDate = dateString(cardPeriod(card).end - 1);
      if (
        el.dataset.card === "length" &&
        el.value === "custom" &&
        proposed.endDate < proposed.anchor
      )
        proposed.endDate = proposed.anchor;
      try {
        cardPeriod(proposed);
        card.endDate = proposed.endDate;
      } catch (error) {
        el.setCustomValidity(String(error));
        setFieldError(el, String(error));
        return;
      }
    }
    if (el.matches(".overtime-rule")) {
      card.settings.overtime = el.value !== "none";
      if (el.value !== "none") card.settings.mode = el.value as "weekly" | "daily" | "ca";
      card.settings.multiplier = 1.5;
      renderDays();
    } else if (el.dataset.meridiem) {
      const { entry, f } = locate(el);
      f.ampm = el.value;
      if (f.value !== null) {
        setMinute(
          card,
          entry,
          f,
          (f.value % 720) + (el.value === "PM" ? 720 : 0),
        );
      } else {
        f.dirty = true;
        commitField(card, entry, f);
      }
      renderDays();
    } else if (el.dataset.card === "name") {
      return;
    } else if (el.dataset.card) {
      const key = el.dataset.card as keyof Card;
      const value =
        el.type === "checkbox"
          ? el.checked
          : ["defaultSegments", "defaultBreaks"].includes(key)
            ? Number(el.value)
            : el.value;
      if (key === "anchor" && !/^\d{4}-\d{2}-\d{2}$/.test(String(value)))
        return;
      (card as unknown as Record<string, unknown>)[key] = value;
      syncControls();
      renderAllWorkerDays();
    } else if (el.dataset.setting) {
      const key = el.dataset.setting!;
      let value: unknown =
        el.type === "checkbox"
          ? el.checked
          : ["mode", "round"].includes(key)
            ? el.value
            : el.value === "" && key === "rate"
              ? null
              : Number(el.value);
      if (key === "rate" && el.value !== "") {
        if (!/^\d+(\.\d{1,2})?$/.test(el.value)) {
          el.setCustomValidity(
            "Use a nonnegative dollar amount with at most two decimals",
          );
          setFieldError(el, el.validationMessage);
          return;
        }
        value = Math.round(Number(el.value) * 100);
      }
      if (key === "dayStart")
        value = Number(el.value.slice(0, 2)) * 60 + Number(el.value.slice(3));
      el.setCustomValidity("");
      (card.settings as unknown as Record<string, unknown>)[key] = value;
      renderDays();
    }
    if (!el.closest(".worker-card")) {
      for (const employee of card.employees) {
        employee.settings = {
          ...card.settings,
          auto: employee.settings.auto,
          deduction: employee.settings.deduction,
        };
      }
    }
    renderAllWorkerDays();
    persist();
  });
  function valid() {
    renderAllWorkerDays();
    const report = getTableReport(card);
    const invalid = Array.from(root.querySelectorAll<HTMLInputElement | HTMLSelectElement>('input[aria-invalid="true"], select[aria-invalid="true"]')).find((control) => !control.disabled && !control.closest('dialog:not([open])'));
    if (invalid) {
      for (let parent = invalid.parentElement; parent; parent = parent.parentElement) {
        if (parent instanceof HTMLDetailsElement) parent.open = true;
      }
      invalid.scrollIntoView({ block: "center" });
      invalid.focus();
      document.querySelector("#save-status")!.textContent = "";
      return false;
    }
    return report.errors.length === 0;
  }
  document.querySelector('.site-header a[href="#how-to-use"]')!.addEventListener("click", () => {
    document.querySelector<HTMLDetailsElement>("#help-details")!.open = true;
  });
  const overtimeDialog = document.querySelector<HTMLDialogElement>("#overtime-dialog")!;
  overtimeDialog.addEventListener("click", (event) => {
    if (event.target !== overtimeDialog) return;
    const bounds = overtimeDialog.getBoundingClientRect();
    if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) overtimeDialog.close();
  });
  root.addEventListener("click", async (event) => {
    const target = (event.target as HTMLElement).closest<HTMLElement>("button");
    if (!target) return;
    activateWorkerFromTarget(target);
    if (target.id === "add-time-card") {
      if (card.employees.length + 2 > 100) return;
      const previous = employeeCards(card).at(-1)!;
      activateWorker(previous.selectedEmployee);
      const source = structuredClone(card);
      addEmployee(card, id());
      card.settings = { ...source.settings };
      card.name = source.name;
      card.content = { ...source.content };
      card.entries = source.entries.map(entry => ({
        ...entry,
        id: id(),
        breaks: entry.breaks.map(rest => ({ ...rest, id: id() })),
      }));
      renderWorkerCards();
      persist();
      return;
    }
    if (target.dataset.removeWorker) {
      if (removeEmployee(card, target.dataset.removeWorker)) {
        renderWorkerCards();
        persist();
      }
      return;
    }
    if (target.hasAttribute("data-choose-dates")) {
      openDateRange();
      return;
    }
    if (target.classList.contains("overtime-help")) {
      overtimeDialog.showModal();
      return;
    }
    if (target.dataset.rangeDay) {
      const date = target.dataset.rangeDay;
      if (!choosingEnd || date < rangeStart.value) {
        rangeStart.value = date;
        rangeEnd.value = date;
        choosingEnd = true;
      } else {
        rangeEnd.value = date;
        choosingEnd = false;
      }
      renderCalendar();
      return;
    }
    if (target.dataset.toggleMeridiem) {
      target.dataset.meridiem = target.dataset.toggleMeridiem;
      if (target.dataset.toggleMeridiem.startsWith("b")) {
        card.settings.auto = false;
        syncControls();
      }
      const { entry, f } = locate(target);
      stopRowSync(entry.row);
      f.ampm = f.ampm === "AM" ? "PM" : "AM";
      if (f.value !== null) setMinute(card, entry, f, f.value % 720 + (f.ampm === "PM" ? 720 : 0));
      target.classList.toggle("pm", f.ampm === "PM");
      target.classList.toggle("am", f.ampm === "AM");
      target.setAttribute("aria-checked", String(f.ampm === "PM"));
      target.querySelector("span")!.textContent = f.ampm;
      const track = target.closest(".day")?.querySelector(".timeline");
      if (track) track.innerHTML = `<div class="ticks"><span>00</span><span>06</span><span>12</span><span>18</span><span>24</span></div>` + timeline(card.entries.filter((e) => e.row === entry.row));
      if (fillFollowingDays(entry)) renderDays();
      updateResults();
      persist();
      return;
    }
    let changed = true;
    if (target.dataset.addContent) {
      (card.content ??= {})[target.dataset.addContent] ??= "";
      renderDays();
      days.querySelector<HTMLInputElement>(`[data-content="${target.dataset.addContent}"]`)!.focus();
      persist();
      return;
    }
    if (target.dataset.add) {
      stopRowSync(target.dataset.add);
      card.emptyRows = card.emptyRows?.filter((key) => key !== `${card.selectedEmployee}:${target.dataset.add}`);
      addEntry(card, target.dataset.add, id());
    }
    else if (target.dataset.remove) {
      const removed = card.entries.find((e) => e.id === target.dataset.remove)!;
      stopRowSync(removed.row);
      card.entries = card.entries.filter((e) => e.id !== target.dataset.remove);
      const next = card.entries.find((e) => e.row === removed.row);
      if (!next) card.emptyRows = [...(card.emptyRows ?? []), `${card.selectedEmployee}:${removed.row}`];
      if (next && removed.dailyBreakMinutes !== undefined) next.dailyBreakMinutes = removed.dailyBreakMinutes;
      if (next) fillFollowingDays(next);
    }
    else if (target.dataset.breakDate) {
      card.settings.auto = false;
      syncControls();
      const date = target.dataset.breakDate;
      stopRowSync(date);
      card.emptyRows = card.emptyRows?.filter((key) => key !== `${card.selectedEmployee}:${date}`);
      const entry = card.entries.find((e) => e.id === target.dataset.addBreak) ?? addEntry(card, date, id());
      const rest = { id: id(), start: field(), end: field(), paid: false };
      setMinute(card, entry, rest.start, 720);
      setMinute(card, entry, rest.end, 750);
      entry.breaks.push(rest);
      fillFollowingDays(entry);
    } else if (target.dataset.removeBreak) {
      card.settings.auto = false;
      syncControls();
      const [entry, index] = target.dataset.removeBreak.split(":");
      const owner = card.entries.find((e) => e.id === entry)!;
      stopRowSync(owner.row);
      owner.breaks.splice(Number(index), 1);
      fillFollowingDays(owner);
    } else {
      changed = false;
      switch (target.id) {
        case "close-date-range":
          dateDialog.close();
          break;
        case "previous-month":
        case "next-month": {
          const current = new Date(calendarMonth + "-01T00:00:00Z");
          current.setUTCMonth(current.getUTCMonth() + (target.id === "next-month" ? 1 : -1));
          calendarMonth = current.toISOString().slice(0, 7);
          renderCalendar();
          break;
        }
        case "apply-dates": {
          if (!rangeStart.validity.valid || !rangeEnd.validity.valid) {
            setFieldError(rangeStart, rangeStart.validationMessage);
            setFieldError(rangeEnd, rangeEnd.validationMessage);
            (rangeStart.validity.valid ? rangeEnd : rangeStart).focus();
            break;
          }
          const proposed = { ...card, anchor: rangeStart.value, endDate: rangeEnd.value, length: "custom" };
          const range = cardPeriod(proposed);
          const weeks = (range.end - range.start) / 7;
          if ([1, 2, 3, 4].includes(weeks) && cardPeriod({ ...proposed, length: "1" }).start === range.start) proposed.length = String(weeks);
          if (card.length === "month") {
            const month = cardPeriod({ ...proposed, length: "month" });
            if (month.start === range.start && month.end === range.end) proposed.length = "month";
          }
          card.anchor = proposed.anchor;
          card.endDate = proposed.endDate;
          card.length = proposed.length;
          renderAllWorkerDays();
          persist();
          dateDialog.close();
          break;
        }
        case "close-overtime-help":
          document.querySelector<HTMLDialogElement>("#overtime-dialog")!.close();
          break;
        case "save-template":
          try {
            const name = document
              .querySelector<HTMLInputElement>("#template-name")!
              .value.trim();
            if (!name || name.length > 100)
              throw Error("Enter a template name up to 100 characters");
            const templates = loadTemplates(storage);
            templates.push(makeTemplate(card, name, id()));
            saveTemplates(storage, templates);
            refreshTemplates();
          } catch (error) {
            showError(error);
          }
          break;
        case "apply-template":
          try {
            const template = selectedTemplate();
            if (
              template &&
              confirm(
                `Apply these settings? ${JSON.stringify(template.values)} ${JSON.stringify(template.settings)}`,
              )
            ) {
              applyTemplate(card, template);
              renderAllWorkerDays();
              persist();
            }
          } catch (error) {
            showError(error);
          }
          break;
        case "delete-template":
          try {
            const template = selectedTemplate();
            if (template && confirm("Delete this template?")) {
              saveTemplates(
                storage,
                loadTemplates(storage).filter((t) => t.id !== template.id),
              );
              refreshTemplates();
            }
          } catch (error) {
            showError(error);
          }
          break;
        case "readonly-share":
          if (valid())
            try {
              await shareLink("readonly");
            } catch (error) {
              showError(error);
            }
          break;
        case "make-receipt":
          try {
            if (!readonlyCard) throw Error("Open a read-only snapshot first");
            const receipt = await makeReceipt(
              readonlyCard,
              document.querySelector<HTMLInputElement>("#reviewer")!.value,
              document.querySelector<HTMLSelectElement>("#decision")!.value as
                "Approved" | "Changes requested",
              document.querySelector<HTMLInputElement>("#review-note")!.value,
            );
            const box =
              document.querySelector<HTMLInputElement>("#receipt-output")!;
            box.value =
              location.origin +
              location.pathname +
              "#" +
              (await encodeReceiptLink(receipt));
            box.hidden = false;
          } catch (error) {
            showError(error);
          }
          break;
        case "import-receipt":
          try {
            const raw =
              document.querySelector<HTMLInputElement>("#receipt-input")!.value;
            const receipt = raw.includes("#receipt=")
              ? await decodeReceiptLink("#receipt=" + raw.split("#receipt=")[1])
              : decodeReceipt(raw);
            if (card.receipts.length >= 100)
              throw Error("Receipt limit reached");
            card.receipts.push(receipt);
            persist();
            await renderReceipts();
          } catch (error) {
            showError(error);
          }
          break;
        case "readonly-print":
          if (readonlyCard && !getTableReport(readonlyCard).errors.length)
            window.print();
          break;
        case "readonly-csv":
          if (readonlyCard)
            try {
              downloadCsv(readonlyCard);
            } catch (error) {
              showError(error);
            }
          break;
        case "apply-preset": {
          const preset = document.querySelector<HTMLSelectElement>("#preset")!
            .value as Preset;
          const proposed = structuredClone(card);
          applyPreset(proposed, preset);
          const keys = [
            "length",
            "format",
            "showAmPm",
            "defaultSegments",
            "defaultBreaks",
            "decimalFirst",
          ] as const;
          const changes = keys
            .filter((key) => card[key] !== proposed[key])
            .map((key) => `${key} ${card[key]} → ${proposed[key]}`);
          for (const key of Object.keys(
            proposed.settings,
          ) as (keyof Card["settings"])[])
            if (card.settings[key] !== proposed.settings[key])
              changes.push(
                `${key} ${card.settings[key]} → ${proposed.settings[key]}`,
              );
          if (
            confirm(
              `Apply preset?\n${changes.join("\n") || "Settings already match"}`,
            )
          ) {
            applyPreset(card, preset);
            renderAllWorkerDays();
            persist();
          }
          break;
        }
        case "clear":
          if (
            confirm(
              "Clear this time card's entries, name, and date range? Settings will be kept.",
            )
          ) {
            const fresh = createCard(today());
            card = {
              ...card,
              name: "",
              anchor: fresh.anchor,
              endDate: fresh.endDate,
              entries: [],
              content: {},
              confirmed: [],
            };
            blocked = false;

            renderWorkerCards();
            persist();
          }
          break;
        case "print":
          if (valid()) window.print();
          break;
        case "csv":
          if (valid()) downloadCsv(card);
          break;
        case "share":
          if (valid()) {
            const snapshot = structuredClone(card);
            const link = encodeShare(snapshot, "report").then((hash) => location.origin + location.pathname + "#" + hash);
            try {
              if (typeof ClipboardItem !== "undefined" && navigator.clipboard?.write) {
                await navigator.clipboard.write([new ClipboardItem({
                  "text/plain": link.then((url) => new Blob([url], { type: "text/plain" })),
                })]);
              } else {
                await navigator.clipboard.writeText(await link);
              }
              copiedSnapshot = JSON.stringify(snapshot);
              updateCopiedState();
              document.querySelector("#save-status")!.textContent = "Share link copied";
              document.querySelector<HTMLInputElement>("#share-url")!.hidden = true;
            } catch (error) {
              try {
                const box = document.querySelector<HTMLInputElement>("#share-url")!;
                box.value = await link;
                box.hidden = false;
                box.select();
                document.querySelector("#save-status")!.textContent = "Copy unavailable. Copy the link below.";
              } catch (shareError) {
                showError(shareError);
              }
            }
          }
          break;
        case "adopt":
          if (sharePreview) {
            card = sharePreview;
            blocked = false;
            sharePreview = null;
            history.replaceState(null, "", location.pathname);
            document
              .querySelector("#share-preview")!
              .setAttribute("hidden", "");
            renderWorkerCards();
            persist();
          }
          break;
        case "dismiss":
          sharePreview = null;
          document.querySelector("#share-preview")!.setAttribute("hidden", "");
          history.replaceState(null, "", location.pathname);
          break;
      }
    }
    if (changed) {
      renderDays();
      persist();
    }
  });
  root.addEventListener("keydown", (event) => {
    const e = event as KeyboardEvent;
    const target = e.target as HTMLElement;
    activateWorkerFromTarget(target);
    if (target.dataset.handle && ["ArrowLeft", "ArrowRight"].includes(e.key)) {
      e.preventDefault();
      const { entry, f } = locate(target);
      stopRowSync(entry.row);
      if (target.dataset.handle?.startsWith("b")) {
        card.settings.auto = false;
        syncControls();
      }
      setMinute(
        card,
        entry,
        f,
        (f.value! + (e.key === "ArrowRight" ? 5 : 1435)) % 1440,
      );
      fillFollowingDays(entry);
      renderDays();
      persist();
      days
        .querySelector<HTMLElement>(
          `[data-entry="${entry.id}"][data-handle="${target.dataset.handle}"]`,
        )
        ?.focus();
    }
  });
  document.querySelector<HTMLSelectElement>("#preset")!.value = routePreset(
    location.pathname,
  );
  renderWorkerCards();
  document.querySelector("#save-status")!.textContent = message === "Saved on this browser" ? "" : message;
  async function previewShare() {
    readonlyCard = null;
    const reportOnly = location.hash.startsWith("#report=");
    document.body.classList.toggle("report-mode", reportOnly);
    document.querySelector<HTMLElement>("#approval-receipt")!.hidden = reportOnly;
    document.querySelector<HTMLElement>("#editor")!.hidden = false;
    document.querySelector<HTMLElement>("#readonly-view")!.hidden = true;
    document.querySelector("#print-report")!.innerHTML = tableReport(card, true);
    if (
      location.hash.startsWith("#card=") ||
      location.hash.startsWith("#readonly=") || location.hash.startsWith("#report=")
    ) {
      try {
        sharePreview = await decodeShare(location.hash);
        if (location.hash.startsWith("#readonly=") || reportOnly) {
          readonlyCard = sharePreview;
          document.querySelector<HTMLElement>("#editor")!.hidden = true;
          document.querySelector<HTMLElement>("#readonly-view")!.hidden = false;
          const markup = tableReport(readonlyCard, reportOnly);
          document.querySelector("#readonly-report")!.innerHTML = markup;
          document.querySelector("#print-report")!.innerHTML = markup;
          return;
        }
        document.querySelector<HTMLButtonElement>("#adopt")!.disabled = false;
        const preview = document.querySelector<HTMLElement>("#share-preview")!;
        preview.hidden = false;
        document.querySelector("#preview-description")!.textContent =
          `Shared card for ${sharePreview.name || "unnamed worker"}: ${hhmm(getReport(sharePreview).total)} hours. Your local draft stays in place until you adopt it.`;
      } catch (error) {
        document.querySelector("#share-preview")!.removeAttribute("hidden");
        document.querySelector("#preview-description")!.textContent =
          String(error);
        document.querySelector<HTMLButtonElement>("#adopt")!.disabled = true;
      }
    }
  }
  window.addEventListener("hashchange", () => {
    void previewShare();
  });
  refreshTemplates();
  if (location.hash.startsWith("#receipt="))
    document.querySelector<HTMLInputElement>("#receipt-input")!.value =
      location.href;
  await previewShare();
}
