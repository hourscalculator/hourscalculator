import { test, expect } from 'vitest';
import { createCard, getReport } from '../../src/state/card';
import { createSimpleMeta, setSimpleDefault, setSimpleBreak, setSimpleDayTime, simpleReport, simpleCompatible, selectSimpleDay } from '../../src/state/simple';
test('inherited weekdays, individualized Tuesday and defaults', () => {
    const card = createCard('2026-11-09');
    const meta = createSimpleMeta(card, true);
    setSimpleDefault(card, meta, 'start', '8:00', 'AM');
    setSimpleDefault(card, meta, 'end', '4:30', 'PM');
    setSimpleBreak(card, meta, 30);
    expect(simpleReport(card).total).toBe(2400);
    setSimpleDayTime(card, meta, '2026-11-10', 'start', '9:00', 'AM');
    setSimpleDayTime(card, meta, '2026-11-10', 'end', '5:30', 'PM');
    expect(simpleReport(card).total).toBe(2400);
    setSimpleDefault(card, meta, 'start', '7:00', 'AM');
    expect(card.entries.find(e => e.row === '2026-11-10')!.start.value).toBe(540);
});
test('Sunday overnight is a complete shift and invalid input is rejected', () => {
    const card = createCard('2026-11-09');
    const meta = createSimpleMeta(card);
    card.entries = [];
    selectSimpleDay(card, '2026-11-15', true);
    setSimpleDefault(card, meta, 'start', '10:00', 'PM');
    setSimpleDefault(card, meta, 'end', '6:00', 'AM');
    setSimpleBreak(card, meta, 30);
    expect(simpleReport(card).total).toBe(450);
    setSimpleBreak(card, meta, 500);
    expect(simpleReport(card).errors.length).toBeGreaterThan(0);
    card.multi = true;
    expect(simpleCompatible(card)).toBe(false);
});
test('newly selected days inherit defaults and outside entries require Detailed', () => {
    const card = createCard('2026-11-09');
    const meta = createSimpleMeta(card);
    expect(card.entries).toHaveLength(0);
    setSimpleDefault(card, meta, 'start', '8', 'AM');
    setSimpleDefault(card, meta, 'end', '4:30', 'PM');
    setSimpleBreak(card, meta, 30);
    selectSimpleDay(card, '2026-11-15', true, meta);
    expect(card.entries[0].start.value).toBe(480);
    expect(card.entries[0].dailyBreakMinutes).toBe(30);
    selectSimpleDay(card, '2026-11-16', true, meta);
    expect(simpleCompatible(card)).toBe(false);
});
test('overnight daily detail belongs to the selected shift date', () => {
    const card = createCard('2026-11-09');
    const meta = createSimpleMeta(card);
    selectSimpleDay(card, '2026-11-15', true, meta);
    setSimpleDefault(card, meta, 'start', '10', 'PM');
    setSimpleDefault(card, meta, 'end', '6', 'AM');
    setSimpleBreak(card, meta, 30);
    expect(simpleReport(card).dayTotals).toEqual([{ date: '2026-11-15', minutes: 450 }]);
});
test('Simple print preserves Sunday full shift and hourly gross', async () => {
    const { tableReport } = await import('../../src/ui/report');
    const card = createCard('2026-11-09');
    const meta = createSimpleMeta(card);
    card.settings.rate = 2000;
    selectSimpleDay(card, '2026-11-15', true, meta);
    setSimpleDefault(card, meta, 'start', '10', 'PM');
    setSimpleDefault(card, meta, 'end', '6', 'AM');
    setSimpleBreak(card, meta, 30);
    const output = tableReport(card, true, true);
    expect(output).toContain('>7:30</td>');
    expect(output).toContain('$150.00');
    expect(tableReport(card, true)).toContain('>1:30</td>');
});
test('result-only report shows named identity and time-card sections', async () => {
 const { tableReport } = await import('../../src/ui/report');
 const card=createCard('2026-11-09'); card.name='Alice';
 expect(tableReport(card,true)).toContain('<td>Alice</td>');
 expect(tableReport(card,true)).toContain('readonly-time-card');
});
test('historical result table keeps weekly title before formula headers', async () => {
 const {tableReport}=await import('../../src/ui/report');
 const output=tableReport(createCard('2026-11-09'),true);
 expect(output).toContain('<tbody class="pay-summary">\n      <tr><th colspan="6">Weekly totals</th></tr>');
 expect(output).toContain('<col class="formula-label"><col><col class="formula-symbol">');
});
test('shared report places identity and period together and explains overtime', async () => {
 const {tableReport}=await import('../../src/ui/report');
 const card=createCard('2026-11-09'); card.name='Alice';
 const output=tableReport(card,true);
 expect(output).toContain('report-identity');
 expect(output).toContain('Overtime rule');
 expect(output).toContain('40');
});
test.each([
 ['A overnight', '10', 'PM', '6', 'AM', 30, 450],
 ['B no break', '9', 'AM', '5', 'PM', 0, 480],
 ['C quarter hour', '8', 'AM', '4:15', 'PM', 30, 465],
 ['D decimal', '8', 'AM', '4:45', 'PM', 0, 525],
] as const)('%s uses independently expected minutes', (_name, start, startAm, end, endAm, rest, expected) => {
 const card=createCard('2026-11-09');
 const meta=createSimpleMeta(card);
 selectSimpleDay(card,'2026-11-09',true,meta);
 setSimpleDefault(card,meta,'start',start,startAm);
 setSimpleDefault(card,meta,'end',end,endAm);
 setSimpleBreak(card,meta,rest);
 expect(simpleReport(card).total).toBe(expected);
});

test('Detail automatic break replaces Simple minute break', () => {
 const card=createCard('2026-11-09'); const meta=createSimpleMeta(card,true);
 setSimpleDefault(card,meta,'start','8','AM'); setSimpleDefault(card,meta,'end','4:30','PM'); setSimpleBreak(card,meta,30);
 card.settings.rate=2000; card.settings.auto=true; card.settings.deduction=60;
 const result=getReport(card);
 expect(result.total).toBe(2250); expect(result.pay).toBe(75000);
});
test('Detail aggregate leaves daily rows to shared Report', async () => {
 const {summaryReport}=await import('../../src/ui/report');
 const output=summaryReport(createCard('2026-11-09'),true);
 expect(output).not.toContain('<time');
});

test('report wraps optional identity in a table and includes clock punches', async () => {
    const { tableReport } = await import('../../src/ui/report');
    const card = createCard('2026-11-09');
    card.name = 'Alex';
    const meta = createSimpleMeta(card, true);
    setSimpleDefault(card, meta, 'start', '8:00', 'AM');
    setSimpleDefault(card, meta, 'end', '4:30', 'PM');
    const output = tableReport(card, true, true);
    expect(output).toContain('class="summary-table report-identity"');
    expect(output).toContain('readonly-time-card');
    expect(output).toContain('scope="col">In</th>');
});

test('custom simple periods contain only chosen dates and remain editable', async () => {
    const { simpleDates } = await import('../../src/state/simple');
    const card = createCard('2026-11-10');
    card.length = 'custom';
    card.endDate = '2026-11-12';
    const meta = createSimpleMeta(card, true);
    setSimpleDefault(card, meta, 'start', '8', 'AM');
    setSimpleDefault(card, meta, 'end', '4', 'PM');
    expect(simpleDates(card)).toEqual(['2026-11-10', '2026-11-11', '2026-11-12']);
    expect(simpleCompatible(card)).toBe(true);
    expect(simpleReport(card).total).toBe(1440);
});
test('shared report uses one identity table, minute breaks and readonly billing settings', async () => {
 const {tableReport}=await import('../../src/ui/report');
 const card=createCard('2026-11-09'); const meta=createSimpleMeta(card,true);
 setSimpleDefault(card,meta,'start','8','AM'); setSimpleDefault(card,meta,'end','4:30','PM'); setSimpleBreak(card,meta,30);
 card.name='Alex'; card.settings.rate=2000;
 const output=tableReport(card,true,true);
 expect(output).toContain('<caption>Time Card</caption>');
 expect(output).not.toContain('report-card-heading');
 expect(output).toContain('report-billing-settings');
 expect(output).toContain('Hourly rate');
 expect(output).toContain('readonly');
 expect(output).toContain('30 min');
});
