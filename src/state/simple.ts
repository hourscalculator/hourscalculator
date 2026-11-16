import { calculate, dateString, dayNumber, type Segment } from '../domain/core';
import { addEntry, displayTime, cardPeriod, commitField, getReport, type Card } from './card';
export type SimpleMeta = {
    step: number;
    customizeTimes?: boolean;
    dailyTimesSelected?: boolean;
    customBreakSelected?: boolean;
    defaultStart: {
        raw: string;
        ampm: string;
    };
    defaultEnd: {
        raw: string;
        ampm: string;
    };
    defaultBreak: number;
    customTimes: string[];
    customBreaks: string[];
};
export function simpleDates(card: Card) {
    const range = cardPeriod(card);
    return range.dates.filter(date => dayNumber(date) >= range.start && dayNumber(date) < range.end);
}
export function simpleCompatible(card: Card) {
    const entries = card.entries.filter(entry => simpleDates(card).includes(entry.row) && (entry.start.raw || entry.end.raw || entry.breaks.some(rest => rest.start.raw || rest.end.raw)));
    return !card.multi && (card.length === '1' || card.length === 'custom') && card.settings.dayStart === 0 && card.settings.weekStart === 1 && entries.every(e => e.breaks.every(rest => rest.automatic) && entries.filter(other => other.row === e.row).length === 1);
}
export function simpleBreakMinutes(card: Card, entry: Card['entries'][number]) {
    if (card.durationBreaks?.[entry.row] !== undefined) return card.durationBreaks[entry.row].reduce((sum, value) => sum + value, 0);
    return card.settings.auto ? card.settings.deduction : entry.dailyBreakMinutes ?? 0;
}
export function createSimpleMeta(card: Card, initializeDays = false): SimpleMeta {
    if (initializeDays && !card.entries.length)
        for (const date of simpleDates(card).slice(0, 5))
            addEntry(card, date, `simple-${date}`);
    const active = card.entries.filter(e => simpleDates(card).includes(e.row) && (e.start.raw || e.end.raw));
    const frequency = new Map<string, number>();
    const timeKey = (entry: Card['entries'][number]) => `${entry.start.value}/${entry.end.value}`;
    for (const entry of active) frequency.set(timeKey(entry), (frequency.get(timeKey(entry)) ?? 0) + 1);
    const first = [...active].sort((a,b) => frequency.get(timeKey(b))! - frequency.get(timeKey(a))!)[0];
    return {
        step: 1,
        dailyTimesSelected: active.every(e => e.start.value !== null && e.end.value !== null && !e.start.dirty && !e.end.dirty) && active.some(e => e.start.value !== first?.start.value || e.end.value !== first?.end.value),
        defaultStart: first ? { raw: first.start.value === null ? first.start.raw : displayTime(first.start.value, card), ampm: first.start.ampm } : { raw: '8:00', ampm: 'AM' },
        defaultEnd: first ? { raw: first.end.value === null ? first.end.raw : displayTime(first.end.value, card), ampm: first.end.ampm } : { raw: card.format === '24' || !card.showAmPm ? '16:30' : '4:30', ampm: 'PM' },
        defaultBreak: first ? simpleBreakMinutes(card, first) : 0,
        customTimes: active.filter(e => e.start.value !== first?.start.value || e.end.value !== first?.end.value).map(e => e.row),
        customBreaks: active.filter(e => simpleBreakMinutes(card,e) !== (first ? simpleBreakMinutes(card,first) : 0)).map(e => e.row),
    };
}
export function selectSimpleDay(card: Card, date: string, selected: boolean, meta?: SimpleMeta) {
    if (selected) {
        if (!card.entries.some(e => e.row === date)) {
            const entry = addEntry(card, date, `simple-${date}`);
            if (meta) {
                writeTime(card, date, 'start', meta.defaultStart.raw, meta.defaultStart.ampm);
                writeTime(card, date, 'end', meta.defaultEnd.raw, meta.defaultEnd.ampm);
                entry.dailyBreakMinutes = meta.defaultBreak;
            }
        }
    }
    else
        card.entries = card.entries.filter(e => e.row !== date);
}
function writeTime(card: Card, date: string, kind: 'start' | 'end', raw: string, ampm: string) {
    const entry = card.entries.find(e => e.row === date);
    if (!entry)
        return;
    Object.assign(entry[kind], { raw, ampm, dirty: true });
    commitField(card, entry, entry[kind]);
}
export function setSimpleDefault(card: Card, meta: SimpleMeta, kind: 'start' | 'end', raw: string, ampm: string) {
    meta[kind === 'start' ? 'defaultStart' : 'defaultEnd'] = { raw, ampm };
    for (const entry of card.entries.filter(entry => simpleDates(card).includes(entry.row)))
        if (!meta.customTimes.includes(entry.row))
            writeTime(card, entry.row, kind, raw, ampm);
}
export function setSimpleDayTime(card: Card, meta: SimpleMeta, date: string, kind: 'start' | 'end', raw: string, ampm: string) {
    if (!meta.customTimes.includes(date))
        meta.customTimes.push(date);
    writeTime(card, date, kind, raw, ampm);
}
export function setSimpleBreak(card: Card, meta: SimpleMeta, minutes: number, date?: string) {
    if (date) {
        if (!meta.customBreaks.includes(date))
            meta.customBreaks.push(date);
    }
    else
        meta.defaultBreak = minutes;
    for (const entry of card.entries.filter(entry => simpleDates(card).includes(entry.row)))
        if (date ? entry.row === date : !meta.customBreaks.includes(entry.row))
        {
            card.durationBreaks ??= {};
            card.durationBreaks[entry.row] = [minutes];
            delete entry.dailyBreakMinutes;
        }
}
export function simpleReport(card: Card) {
    card = {...card, entries: card.entries.filter(entry => simpleDates(card).includes(entry.row))};
    const validation = getReport(card);
    const segments: Segment[] = card.entries
        .filter(entry => entry.start.value !== null && entry.end.value !== null)
        .map(entry => ({
            id: entry.id,
            date: entry.actualDate ?? entry.row,
            start: entry.start.value!,
            end: entry.end.value!,
            suppressAutomatic: card.durationBreaks?.[entry.row] !== undefined,
            breaks: (!card.settings.auto || card.durationBreaks?.[entry.row] !== undefined) && simpleBreakMinutes(card, entry) ? [{
                start: entry.start.value!,
                end: (entry.start.value! + simpleBreakMinutes(card, entry)) % 1440,
                paid: false,
            }] : [],
        }));
    const result = calculate(segments, card.settings);
    const errors = [...validation.errors, ...result.errors];
    if (!card.entries.length)
        errors.push('Select at least one work day.');
    for (const entry of card.entries) {
        if (!entry.start.raw || !entry.end.raw)
            errors.push('Enter Clock In and Clock Out for every selected day.');
        const duration = ((entry.end.value ?? 0) - (entry.start.value ?? 0) + 1440) % 1440;
        if (!Number.isInteger(simpleBreakMinutes(card,entry)) || simpleBreakMinutes(card,entry) < 0 || simpleBreakMinutes(card,entry) > duration)
            errors.push('Unpaid break must fit within the shift.');
    }
    const dayTotals = segments.map(segment => ({
        date: card.entries.find(entry => entry.id === segment.id)!.row,
        minutes: calculate([segment], card.settings).total,
    }));
    const ordered = [...segments].sort((a, b) => a.date.localeCompare(b.date) || a.start - b.start);
    let previous = { regular: 0, overtime: 0, double: 0 };
    const rows = ordered.map((segment, index) => {
        const cumulative = calculate(ordered.slice(0, index + 1), card.settings);
        const date = card.entries.find(entry => entry.id === segment.id)!.row;
        const day = dayNumber(date);
        const weekday = ((day + 4) % 7 + 7) % 7;
        const row = {
            date,
            week: dateString(day - (weekday - card.settings.weekStart + 7) % 7),
            minutes: dayTotals.find(total => total.date === date)!.minutes,
            regular: cumulative.regular - previous.regular,
            overtime: cumulative.overtime - previous.overtime,
            double: cumulative.double - previous.double,
            automaticDeduction: 0,
        };
        previous = cumulative;
        return row;
    });
    return { ...result, rows, dayTotals, errors, status: errors.length ? 'Input incomplete' : 'Ready' };
}

export function reportForMode(card: Card, simple = false) {
    const detailed = getReport(card);
    return simple ? { ...detailed, ...simpleReport(card) } : detailed;
}
