import { selectInputContents } from "./input-selection";
import { setFieldError } from "./validation";
import { displayTime, cardPeriod } from "../state/card";
import { hhmm, decimal, parseTime, dateString, dayNumber } from '../domain/core';
import { createCard, type Card } from '../state/card';
import { simpleBreakMinutes, createSimpleMeta, simpleCompatible, simpleDates, simpleReport, selectSimpleDay, setSimpleDefault, setSimpleDayTime, setSimpleBreak, type SimpleMeta } from '../state/simple';
import { escape, tableReport } from './report';
type Options = { onDelivery:(action: 'print'|'csv'|'share')=>Promise<void>;
    choosePeriod: (apply: (start: string, end: string) => void) => void;
    getCard: () => Card;
    replaceCard: (card: Card) => void;
    persist: () => void;
    renderDetailed: () => void;
    storage: Storage;
    hasDraft: boolean;
    blocked: () => boolean;
};
export function mountSimple(options: Options) {
    const key = 'time-card-simple-ui-v1';
    const home = document.createElement('section');
    home.id = 'simple-home';
    const calculator = document.querySelector<HTMLElement>('#calculator')!;
    calculator.before(home);
    const dialog = document.createElement('dialog');
    dialog.id = 'simple-wizard';
    document.body.append(dialog);
    let meta: SimpleMeta;
    let mode = 'simple', result = false, visited = options.hasDraft, error = '';
    let saved: {
        mode?: string;
        visited?: boolean;
        result?: boolean;
        meta?: SimpleMeta;
    } | null = null;
    try {
        saved = JSON.parse(options.storage.getItem(key) || 'null');
    }
    catch {
        error = 'Browser storage is unavailable. Keep this page open to retain your work.';
    }
    if (saved && typeof saved === 'object') {
        visited ||= saved.visited === true;
        mode = saved.mode === 'detailed' ? 'detailed' : 'simple';
        result = saved.result === true;
    }
    const card = () => options.getCard();
    function fresh() {
        const now = new Date();
        options.replaceCard(createCard(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`));
        card().settings.overtime = false;
        meta = createSimpleMeta(card(), true);
        setSimpleDefault(card(),meta,'start',meta.defaultStart.raw,meta.defaultStart.ampm);
        setSimpleDefault(card(),meta,'end',meta.defaultEnd.raw,meta.defaultEnd.ampm);
        result = false;
    }
    if (!options.hasDraft && !options.blocked() && location.pathname === '/' && !/^#(?:card|readonly|report|receipt)=/.test(location.hash) && mode === 'simple')
        fresh();
    meta = createSimpleMeta(card());
    if (saved?.meta && [1, 2, 3, 4].includes(saved.meta.step) && typeof saved.meta.defaultStart?.raw === 'string' && typeof saved.meta.defaultEnd?.raw === 'string' && ['AM', 'PM'].includes(saved.meta.defaultStart.ampm) && ['AM', 'PM'].includes(saved.meta.defaultEnd.ampm) && Array.isArray(saved.meta.customTimes) && Array.isArray(saved.meta.customBreaks) && [...saved.meta.customTimes, ...saved.meta.customBreaks].every(value => typeof value === 'string') && Number.isFinite(saved.meta.defaultBreak))
        meta = saved.meta;
    meta.dailyTimesSelected ??= meta.customizeTimes === true || createSimpleMeta(card()).dailyTimesSelected;
    Reflect.deleteProperty(meta, 'customTimesUsed');
    meta.customBreakSelected ??= ![0,30,60].includes(meta.defaultBreak);
    if (location.pathname !== '/')
        mode = 'detailed';
    function store() {
        try {
            options.storage.setItem(key, JSON.stringify({ mode, visited, result, meta }));
        }
        catch {
            error = 'Browser storage is unavailable. Keep this page open to retain your work.';
        }
    }
    function protectSelectedDays() {
        card().emptyRows = simpleDates(card()).filter(date => !card().entries.some(entry => entry.row === date)).map(date => `${card().selectedEmployee}:${date}`);
    }
    function changed() { protectSelectedDays(); visited = true; result = false; options.persist(); store(); }
    function showMode() {
        const detailed = mode === 'detailed' || /^#(?:card|readonly|report|receipt)=/.test(location.hash);
        calculator.hidden = !detailed && result && !dialog.open;
        home.hidden = detailed || dialog.open || !result;
        back.hidden = dialog.open || (!detailed && result) || !!location.hash;
        if (detailed && dialog.open)
            dialog.close();
    }
    function detailed() {
        mode = 'detailed';
        visited = true;
        if (card().entries.some(entry => entry.row === simpleDates(card()).at(-1) && entry.start.value !== null && entry.end.value !== null && entry.end.value < entry.start.value))
            alert('Detailed reports allocate overnight hours by calendar date. The part after midnight belongs to the following week. Your full shift is preserved.');
        const dates = simpleDates(card());
        card().emptyRows = dates.filter(date => !card().entries.some(entry => entry.row === date)).map(date => `${card().selectedEmployee}:${date}`);
        options.renderDetailed();
        options.persist();
        store();
        showMode();
    }
    const back = document.createElement('a');
    back.href = '#simple-wizard';
    back.className = 'simple-mode-link';
    back.textContent = 'Want to fill in quickly? Click here to open the wizard';
    calculator.before(back);
    back.addEventListener('click', (event) => {
        event.preventDefault();
        if (location.pathname !== '/') {
            mode = 'simple';
            store();
            history.replaceState(null,'','/');
        }
        mode = 'simple';
        const latest = createSimpleMeta(card());
        meta = { ...latest, step: meta.step, customizeTimes: meta.customizeTimes, dailyTimesSelected: meta.dailyTimesSelected || latest.dailyTimesSelected };
        store();
        renderHome();
        showMode();
        open();
    });
    function confirmFresh() {
        if (!confirm('Start a new calculation? Your current time card will be replaced.'))
            return false;
        if (options.blocked()) {
            error = 'The damaged draft is protected. Open Detailed Calculator and use Clear to replace it.';
            renderHome();
            return false;
        }
        fresh();
        changed();
        return true;
    }
    function open() {
        if (options.blocked()) {
            error = 'The damaged draft is protected. Open Detailed Calculator and use Clear to replace it.';
            renderHome();
            return;
        }
        if (!simpleCompatible(card())) {
            if (!confirm('This time card contains advanced data. Cancel to keep it and continue in Detailed Calculator, or OK to start a new Simple calculation.')) {
                detailed();
                return;
            }
            if (options.blocked()) {
                error = 'The damaged draft is protected. Use Clear in Detailed Calculator to replace it.';
                renderHome();
                return;
            }
            fresh();
            changed();
        }
        renderDialog();
        dialog.showModal();
        showMode();
    }
    function renderHome() {
        const calculation = simpleReport(card());
        if (result && !calculation.errors.length) document.querySelector("#print-report")!.innerHTML = tableReport(card(), true, true);
        home.innerHTML = `${result && !calculation.errors.length ? `<section class="simple-result"><a href="#calculator" class="simple-mode-link" data-simple="detailed">Want to adjust the details? Click here to open Detailed Calculator</a>${tableReport(card(), true, true)}<div data-simple-actions></div><input aria-label="Share link" data-simple-share-url hidden></section>` : ''}<p role="status">${escape(error)}</p>`;
        const destination=home.querySelector('[data-simple-actions]');
        if(destination) {
          const actions=document.querySelector<HTMLElement>('#editor .actions')!.cloneNode(true) as HTMLElement;
          for(const button of actions.querySelectorAll<HTMLButtonElement>('button')) {
            if(!['print','csv','share'].includes(button.id)) {button.remove();continue;}
            button.dataset.simpleAction=button.id;
            button.removeAttribute('id');
          }
          destination.replaceWith(actions);
        }
    }
    home.addEventListener('click', async (event) => {
        const targetAction=(event.target as HTMLElement).closest<HTMLElement>('[data-simple], [data-simple-action]');
        const action=targetAction?.dataset.simple ?? targetAction?.dataset.simpleAction;
        if (action === 'open')
            open();
        if (action === 'detailed') { event.preventDefault(); detailed(); }
        if (action === 'new' && confirmFresh()) {
            renderHome();
            open();
        }
        if(action === 'print' || action === 'csv' || action === 'share') {
          await options.onDelivery(action);
          const status=document.querySelector('#save-status')!.textContent;
          home.querySelector('[role="status"]')!.textContent=status;
          const source=document.querySelector<HTMLInputElement>('#share-url')!;
          const target=home.querySelector<HTMLInputElement>('[data-simple-share-url]');
          if(target && !source.hidden) {target.value=source.value;target.hidden=false;target.select();}
        }
    });
    const dateLabel = (date: string) => new Date(`${date}T12:00:00`).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
    function timeInputs(kind: 'start' | 'end', date = '') {
        const entry = card().entries.find(entry => entry.row === date);
        const value = date ? entry![kind] : meta[kind === 'start' ? 'defaultStart' : 'defaultEnd'];
        const label = kind === 'start' ? 'Clock In' : 'Clock Out';
        return `<label class="time-field"><span class="time-field-heading"><span>${label}</span></span><span class="time-control"><input aria-label="${label}${date ? ' ' + date : ''}" data-time="${kind}" data-date="${date}" value="${escape(value.raw)}" inputmode="text" placeholder="8:00"><button type="button" class="meridiem ${value.ampm.toLowerCase()}" role="switch" aria-checked="${value.ampm === 'PM'}" aria-label="${label} PM${date ? ' ' + date : ''}" data-ampm="${kind}" data-date="${date}" value="${value.ampm}"><span>${value.ampm}</span></button></span></label>`;
    }
    function applyPeriod(start: string, end: string) {
        const previous = cardPeriod(card());
        const proposed = { ...card(), anchor: start, endDate: end, length: 'custom' };
        const range = cardPeriod(proposed);
        const offset = range.start - previous.start;
        card().entries = card().entries
            .map(entry => ({
                ...entry,
                row: dateString(dayNumber(entry.row) + offset),
                actualDate: entry.actualDate === null ? null : dateString(dayNumber(entry.actualDate) + offset),
            }))
            .filter(entry => dayNumber(entry.row) >= range.start && dayNumber(entry.row) < range.end);
        card().content = Object.fromEntries(Object.entries(card().content ?? {})
            .map(([date, content]) => [dateString(dayNumber(date) + offset), content]));
        card().anchor = proposed.anchor;
        card().endDate = proposed.endDate;
        card().length = 'custom';
        for (const key of ['customTimes', 'customBreaks'] as const) {
            meta[key] = meta[key]
                .map(date => dateString(dayNumber(date) + offset))
                .filter(date => dayNumber(date) >= range.start && dayNumber(date) < range.end);
        }
        changed();
        renderDialog();
    }
    function renderDialog() {
        const title = ['Which days do you work?', 'What time do you start and finish?', 'Do you take an unpaid break?', 'Add some optional information?'][meta.step - 1];
        dialog.setAttribute('aria-label', title);
        dialog.innerHTML = `<div class="simple-dialog-heading"><div><div class="simple-progress" aria-label="Step ${meta.step} of 4">${[1,2,3,4].map(step=>`<span class="${step <= meta.step ? 'active' : ''}"></span>`).join('')}</div><h2 tabindex="-1">${title}</h2></div><button type="button" data-action="close" aria-label="Close wizard">×</button></div><div class="simple-dialog-body">${meta.step === 1 ? `<div class="simple-work-days">${simpleDates(card()).map(date => `<label><input type="checkbox" aria-label="${dateLabel(date)}" data-day="${date}"${card().entries.some(entry => entry.row === date) ? ' checked' : ''}><span class="simple-day-letter" aria-hidden="true">${new Date(`${date}T12:00:00`).toLocaleDateString('en-US',{weekday:'short'})}</span><span class="simple-day-mark" aria-hidden="true"></span><small aria-hidden="true">${new Date(`${date}T12:00:00`).toLocaleDateString('en-US',{month:'short',day:'numeric'})}</small></label>`).join('')}</div>` : meta.step === 2 ? `<div class="simple-time-fields">${timeInputs('start')}${timeInputs('end')}</div><p class="simple-quick-entry">Quick entry: 800 means 8:00.</p><details data-custom-times${meta.customizeTimes ? ' open' : ''}><summary>Do your hours vary by day? Click here to expand and customize</summary>${card().entries.map(entry => `<fieldset><legend>${dateLabel(entry.row)}</legend><div class="simple-time-fields">${timeInputs('start', entry.row)}${timeInputs('end', entry.row)}</div></fieldset>`).join('')}</details>` : meta.step === 3 ? `<fieldset class="simple-break-options"><legend>How long is your unpaid lunch/break?</legend>${[0,30,60,-1].map(minutes=>`<label><input type="radio" name="simple-break" data-break-preset value="${minutes}"${(minutes===-1 ? meta.customBreakSelected : !meta.customBreakSelected && minutes===meta.defaultBreak)?' checked':''}>${minutes===0?'No break':minutes===30?'30 minutes':minutes===60?'1 hour':'Custom'}</label>`).join('')}</fieldset><label${!meta.customBreakSelected ? ' hidden' : ''} data-custom-break>Break minutes<input data-break="" type="number" min="0" max="1439" value="${meta.defaultBreak}"></label><details><summary>Does your break vary by day? Click here to expand and customize</summary>${card().entries.map(entry => `<label>${dateLabel(entry.row)}<input aria-label="Break minutes ${entry.row}" data-break="${entry.row}" type="number" min="0" max="1439" value="${simpleBreakMinutes(card(), entry)}"></label>`).join('')}</details>` : `<div class="simple-optional-fields"><label><span class="field-label">Name <span class="optional">optional</span></span><input data-simple-name maxlength="200" value="${escape(card().name)}"></label><div class="simple-period"><span class="field-label">Period <span class="optional">optional</span></span><button type="button" data-action="period" aria-label="Choose period dates" class="date-range-control"><span data-simple-period-label>${simpleDates(card())[0]} – ${simpleDates(card()).at(-1)}</span></button></div><div data-simple-rate-settings></div></div>`}<button type="button" class="simple-detailed-link" data-action="detailed">Work an irregular schedule? Click here to open Detailed Calculator</button><p id="simple-errors" role="alert"></p></div><footer><button type="button" data-action="back"${meta.step === 1 ? ' disabled' : ''}><span aria-hidden="true">← </span>Back</button><button type="button" class="primary" data-action="next">${meta.step === 4 ? 'Calculate Hours' : 'Continue <span aria-hidden="true"> →</span>'}</button></footer>`;
        if(meta.step===4) {
          const controls=document.querySelector<HTMLElement>('#calculator .rate-settings')!.cloneNode(true) as HTMLElement;
          const rate=controls.querySelector<HTMLInputElement>('[data-setting="rate"]')!;
          rate.removeAttribute('data-setting');rate.setAttribute('data-simple-rate','');rate.value=card().settings.rate===null?'':String(card().settings.rate!/100);
          const overtime=controls.querySelector<HTMLSelectElement>('.overtime-rule')!;
          overtime.setAttribute('data-simple-overtime','');overtime.disabled=false;
          controls.querySelector('.overtime-label')!.insertAdjacentHTML('beforeend','<span class="optional">optional</span>');overtime.value=card().settings.overtime===false?'none':card().settings.mode;
          dialog.querySelector('[data-simple-rate-settings]')!.append(controls);
        }
    }
    for (const type of ['focusin' ,'click','pointerdown']) dialog.addEventListener(type,selectInputContents);
    dialog.addEventListener('toggle', event => {
      const details=event.target as HTMLDetailsElement;
      if(details.hasAttribute('data-custom-times')) {
        meta.customizeTimes=details.open;
        meta.dailyTimesSelected ||= details.open;
        if (meta.dailyTimesSelected) dialog.querySelectorAll<HTMLInputElement>('input[data-time][data-date=""]').forEach(input => setFieldError(input, ''));
        store();
      }
    },true);
    dialog.addEventListener('change', event => {
        const target = event.target as HTMLInputElement;
        if(target.hasAttribute('data-simple-name')) card().name=target.value;
        if(target.hasAttribute('data-simple-overtime')) {card().settings.overtime=target.value!=='none';if(target.value!=='none') card().settings.mode=target.value as 'weekly'|'daily'|'ca';card().settings.multiplier=1.5;}
        if (target.hasAttribute('data-simple-rate') && target.checkValidity()) card().settings.rate = target.value === '' ? null : Math.round(Number(target.value) * 100);
        if (target.dataset.day)
            selectSimpleDay(card(), target.dataset.day, target.checked, meta);
        if (target.dataset.time || target.dataset.ampm) {
            const kind = (target.dataset.time || target.dataset.ampm) as 'start' | 'end', date = target.dataset.date || '';
            const input = dialog.querySelector<HTMLInputElement>(`[data-time="${kind}"][data-date="${date}"]`)!;
            const ampm = dialog.querySelector<HTMLSelectElement>(`[data-ampm="${kind}"][data-date="${date}"]`)!.value;
            setFieldError(input, parseTime(input.value,ampm) === null ? (input.value.trim() ? 'Enter a valid time.' : 'Enter a time.') : '');
            if (date)
                setSimpleDayTime(card(), meta, date, kind, input.value, ampm);
            else if (meta.dailyTimesSelected) {
                setFieldError(input, '');
            } else
                setSimpleDefault(card(), meta, kind, input.value, ampm);
            for (const entry of card().entries.filter(entry => !meta.customTimes.includes(entry.row))) {
                const field = dialog.querySelector<HTMLInputElement>(`[data-time="${kind}"][data-date="${entry.row}"]`);
                const select = dialog.querySelector<HTMLButtonElement>(`[data-ampm="${kind}"][data-date="${entry.row}"]`);
                if (field)
                    field.value = entry[kind].raw;
                if (select)
                    { select.value = entry[kind].ampm; select.innerHTML = `<span>${entry[kind].ampm}</span>`; select.classList.toggle('pm',entry[kind].ampm==='PM'); select.classList.toggle('am',entry[kind].ampm==='AM'); select.setAttribute('aria-checked',String(entry[kind].ampm==='PM')); }
            }
        }
        if (target.hasAttribute('data-break')) {
            setSimpleBreak(card(), meta, Number(target.value), target.dataset.break || undefined);

        }
        if (target.hasAttribute('data-break-preset')) {
            meta.customBreakSelected = target.value === '-1';
            if (Number(target.value) >= 0) setSimpleBreak(card(), meta, Number(target.value));
            const custom=dialog.querySelector<HTMLElement>('[data-custom-break]')!;
            custom.hidden=target.value!=='-1';
            const input=custom.querySelector<HTMLInputElement>('input')!;
            input.value=String(meta.defaultBreak);
        }
        if (target.hasAttribute('data-break-preset') || target.hasAttribute('data-break') && !target.dataset.break) {
            for (const entry of card().entries.filter(entry => !meta.customBreaks.includes(entry.row))) {
                const input = dialog.querySelector<HTMLInputElement>(`[data-break="${entry.row}"]`);
                if (input) input.value = String(simpleBreakMinutes(card(), entry));
            }
        }
        if(target.dataset.time || target.dataset.ampm) {
          const date=target.dataset.date||'';
          const start=dialog.querySelector<HTMLInputElement>(`[data-time="start"][data-date="${date}"]`)!;
          const end=dialog.querySelector<HTMLInputElement>(`[data-time="end"][data-date="${date}"]`)!;
          const startAm=dialog.querySelector<HTMLButtonElement>(`[data-ampm="start"][data-date="${date}"]`)!.value;
          const endAm=dialog.querySelector<HTMLButtonElement>(`[data-ampm="end"][data-date="${date}"]`)!.value;
          const startMinute=parseTime(start.value,startAm),endMinute=parseTime(end.value,endAm);
          if((date || !meta.dailyTimesSelected) && startMinute!==null && endMinute!==null) setFieldError(end,startMinute===endMinute?'Clock Out must differ from Clock In.':'');
        }
        changed();
    });
    dialog.addEventListener('input', event => {
        const target = event.target as HTMLInputElement;
        if (target.matches('input[data-time], input[data-break], input[data-simple-rate], input[data-simple-name]'))
            target.dispatchEvent(new Event('change', { bubbles: true }));
        else {
            visited = true;
            store();
        }
    });
    dialog.addEventListener('focusout', event => {
        const input=event.target as HTMLInputElement;
        if(!input.dataset.time) return;
        const kind=input.dataset.time as 'start'|'end';
        const date=input.dataset.date||'';
        const ampm=dialog.querySelector<HTMLButtonElement>(`[data-ampm="${kind}"][data-date="${date}"]`)!.value;
        const minute=parseTime(input.value,ampm);
        if(minute!==null) {
          input.value=displayTime(minute,{...card(),format:'12',showAmPm:true});
          if(!date && !meta.dailyTimesSelected) meta[kind==='start'?'defaultStart':'defaultEnd'].raw=input.value;
          store();
        }
    });
    dialog.addEventListener('click', event => {
        if((event.target as HTMLElement).closest('.overtime-help')) document.querySelector<HTMLDialogElement>('#overtime-dialog')!.showModal();
        const meridiem = (event.target as HTMLElement).closest<HTMLButtonElement>('[data-ampm]');
        if (meridiem) {
          meridiem.value = meridiem.value === 'AM' ? 'PM' : 'AM';
          meridiem.innerHTML = `<span>${meridiem.value}</span>`;
          meridiem.classList.toggle('pm',meridiem.value==='PM');
          meridiem.classList.toggle('am',meridiem.value==='AM');
          meridiem.setAttribute('aria-checked',String(meridiem.value==='PM'));
          meridiem.dispatchEvent(new Event('change',{bubbles:true}));
        }
        const action = (event.target as HTMLElement).closest<HTMLElement>('[data-action]')?.dataset.action;
        if (action === 'period') { options.choosePeriod(applyPeriod); return; }
        if (action === 'detailed') {dialog.close();detailed();return;}
        if (action === 'close')
            dialog.close();
        if (action === 'back') {
            meta.step--;
            store();
            renderDialog();
        }
        if (action === 'next') {
            if (meta.step === 2 && !meta.dailyTimesSelected) {
                meta.customTimes = [];
                for (const kind of ['start', 'end'] as const) {
                    const input = dialog.querySelector<HTMLInputElement>(`[data-time="${kind}"][data-date=""]`)!;
                    const ampm = dialog.querySelector<HTMLButtonElement>(`[data-ampm="${kind}"][data-date=""]`)!.value;
                    setSimpleDefault(card(), meta, kind, input.value, ampm);
                }
                changed();
            }
            const errors = meta.step === 1 && !card().entries.length ? ['Select at least one work day.'] : meta.step === 2 || meta.step === 3 ? simpleReport(card()).errors : [];
            if (meta.step === 4 && !dialog.querySelector<HTMLInputElement>('[data-simple-rate]')!.checkValidity()) errors.push('Enter a valid hourly rate.');
            if (meta.step === 4 && card().settings.rate !== null && (!Number.isFinite(card().settings.rate) || card().settings.rate! < 0 || card().settings.rate! > 100000000)) errors.push('Enter a valid hourly rate.');
            if (meta.step===2) {
              for(const input of dialog.querySelectorAll<HTMLInputElement>('input[data-time]')) {
                if(meta.dailyTimesSelected ? !input.dataset.date : Boolean(input.dataset.date)) { setFieldError(input, ''); continue; }
                const ampm=dialog.querySelector<HTMLButtonElement>(`[data-ampm="${input.dataset.time}"][data-date="${input.dataset.date}"]`)!.value;
                setFieldError(input,parseTime(input.value,ampm)===null?'Enter a valid time.':'');
              }
            }
            if (errors.length) {
                dialog.querySelector('#simple-errors')!.textContent = [...new Set(errors)].join(' ');
                return;
            }
            if (meta.step < 4) {
                meta.step++;
                store();
                renderDialog();
                dialog.querySelector<HTMLElement>('h2')!.focus();
            }
            else {
                result = true;
                visited = true;
                protectSelectedDays();
                options.persist();
                store();
                dialog.close();
                renderHome();
            }
        }
    });
    dialog.addEventListener('close', () => { if (!result) { protectSelectedDays(); options.renderDetailed(); } visited = true; store(); renderHome(); showMode(); });
    window.addEventListener('hashchange', () => showMode());
    renderHome();
    showMode();
    if (!visited && mode === 'simple' && !location.hash && !options.blocked())
        open();
}
