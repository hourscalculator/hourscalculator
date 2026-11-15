import { expect, test } from "vitest";
import {
  createCard,
  addEmployee,
  selectEmployee,
  addEntry,
  commitField,
  getReport,
  setMinute,
} from "../../src/state/card";
test("format change and drag share minutes", () => {
  const c = createCard("2026-11-09"),
    e = addEntry(c, c.anchor, "a");
  e.start.raw = "855";
  e.start.dirty = true;
  commitField(c, e, e.start);
  setMinute(c, e, e.end, 1020);
  const before = getReport(c).total;
  c.format = "24";
  expect(getReport(c).total).toBe(before);
  expect(e.start.value).toBe(535);
});
test("draft preserved and invalid report blocked", () => {
  const c = createCard("2026-11-09"),
    e = addEntry(c, c.anchor, "a");
  e.start.raw = "999";
  e.start.dirty = true;
  commitField(c, e, e.start);
  expect(e.start.raw).toBe("999");
  expect(getReport(c).status).toBe("Input incomplete");
});
test("changing workday preserves actual start date", () => {
  const c = createCard("2026-11-09");
  c.settings.dayStart = 240;
  const e = addEntry(c, c.anchor, "a");
  setMinute(c, e, e.start, 60);
  expect(e.actualDate).toBe("2026-11-10");
  c.settings.dayStart = 0;
  expect(e.actualDate).toBe("2026-11-10");
});
test("shortening period retains future draft without blocking current report", () => {
  const c = createCard("2026-11-09");
  const e = addEntry(c, "2026-12-15", "later");
  e.start.raw = "unfinished";
  expect(getReport(c).status).toBe("Estimate ready");
  expect(c.entries).toHaveLength(1);
});
test("hourly defaults and disabled overtime retain actual minutes", () => {
  const c = createCard("2026-11-09");
  expect(c.length).toBe("1");
  expect(c.settings.weekStart).toBe(1);
  Object.assign(c.settings, { overtime: false, mode: "daily", rate: 1000 });
  const e = addEntry(c, c.anchor, "long");
  setMinute(c, e, e.start, 480);
  setMinute(c, e, e.end, 1080);
  const r = getReport(c);
  expect(r.total).toBe(600);
  expect(r.regular).toBe(600);
  expect(r.overtime).toBe(0);
  expect(r.pay).toBe(10000);
});

test("daily content and new rates belong to each employee", () => {
  const card = createCard("2026-11-09");
  card.content = { "2026-11-09": "Setup" };
  card.settings.rate = 2000;
  addEmployee(card, "second");
  expect(card.content).toEqual({});
  expect(card.settings.rate).toBeNull();
  card.content = { "2026-11-10": "Delivery" };
  selectEmployee(card, "primary");
  expect(card.content).toEqual({ "2026-11-09": "Setup" });
  expect(card.settings.rate).toBe(2000);
  selectEmployee(card, "second");
  expect(card.content).toEqual({ "2026-11-10": "Delivery" });
});

test("field issues identify the invalid break endpoint", () => {
  const card = createCard("2026-11-09");
  const entry = addEntry(card, card.anchor, "shift");
  setMinute(card, entry, entry.start, 540);
  setMinute(card, entry, entry.end, 1020);
  const rest = { id: "rest", start: { raw: "12:00", value: 720, ampm: "PM", dirty: false }, end: { raw: "6:00", value: 1080, ampm: "PM", dirty: false }, paid: false };
  entry.breaks.push(rest);
  const report = getReport(card);
  expect(report.issues).toContainEqual({segmentId:"shift",breakId:"rest",field:"end",message:"Break end must fall within this work period."});
  expect(report.issues.some((issue) => issue.field === "start")).toBe(false);
});
test("invalid drafts outside a custom range do not block its report", () => {
  const card = createCard("2026-11-01");
  card.length = "custom";
  card.endDate = "2026-11-15";
  const outside = addEntry(card,"2026-10-30","outside");
  outside.start.raw = "999";
  outside.start.dirty = true;
  expect(getReport(card).errors).toEqual([]);
});
test('mixed historical rates aggregate regular pay independently of selected card', async () => {
 const {summaryReport}=await import('../../src/ui/report');
 const card=createCard('2026-11-09');
 card.settings.rate=2000;
 let e=addEntry(card,'2026-11-09','a'); setMinute(card,e,e.start,540); setMinute(card,e,e.end,1020);
 addEmployee(card,'b'); card.settings.rate=3000;
 e=addEntry(card,'2026-11-09','b'); setMinute(card,e,e.start,540); setMinute(card,e,e.end,1020);
 const total=()=>summaryReport(card,true).split('Gross pay').at(-1)!;
 expect(total()).toContain('$400.00</td><td class="operator">+</td><td>$0.00');
 selectEmployee(card,'primary');
 expect(total()).toContain('$400.00</td><td class="operator">+</td><td>$0.00');
});
test('explicit lunch replaces the same legacy minute deduction', () => {
 const card=createCard('2026-11-09'); const entry=addEntry(card,'2026-11-09','lunch');
 setMinute(card,entry,entry.start,540); setMinute(card,entry,entry.end,1020);
 entry.dailyBreakMinutes=30;
 entry.breaks.push({id:'rest',paid:false,start:{raw:'12:00',value:720,ampm:'PM',dirty:false},end:{raw:'12:30',value:750,ampm:'PM',dirty:false}});
 expect(getReport(card).total).toBe(450);
});

test("default work periods match the static first screen", () => {
  expect(createCard("2026-11-09").defaultSegments).toBe(2);
});
