import { expect, test } from '@playwright/test';
test('simple first visit opens work day wizard', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('dialog', { name: 'Which days do you work?' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Continue', exact: true })).toBeVisible();
});

test('simple defaults, personalized Tuesday and breaks total forty hours', async ({ page, browserName }) => {
  await page.goto('/');
  await page.getByRole('button', {name:'Continue',exact:true}).click();
  await page.getByRole('textbox',{name:'Clock In',exact:true}).fill('8:00');
  await page.getByRole('textbox',{name:'Clock Out',exact:true}).fill('4:30');
  await page.getByRole('button', {name:'Continue',exact:true}).click();
  await page.locator('[data-break-preset][value="30"]').check();
  await page.getByRole('button',{name:'Continue',exact:true}).click();
  await page.getByRole('button',{name:'Calculate Hours',exact:true}).last().click();
  await expect(page.locator('.simple-result .employee-report .summary-table > tbody:not(.pay-summary) > .report-total td:first-of-type')).toHaveText('40:00');
  await page.screenshot({path:`test-results/simple-results-${browserName}.png`});
  await page.evaluate(() => Object.defineProperty(navigator, 'clipboard', {configurable:true,value:{writeText:async (text:string)=>{(window as unknown as {copiedResults:string}).copiedResults=text;}}}));
  await page.locator('.simple-result').getByRole('button',{name:'Copy share link',exact:true}).click();
  await expect.poll(()=>page.evaluate(()=>(window as unknown as {copiedResults:string}).copiedResults)).toContain('#report=');
  const copied = await page.evaluate(() => (window as unknown as {copiedResults:string}).copiedResults);
  expect(copied).toContain('reportMode=simple');
  const {decodeShare}=await import('../../src/io/delivery');
  const snapshot=await decodeShare(new URL(copied).hash);
  expect(snapshot.entries).toHaveLength(5);

  await page.getByRole('link',{name:'Want to adjust the details? Click here to open Detailed Calculator',exact:true}).click();
  await page.getByRole('link',{name:'Want to fill in quickly? Click here to open the wizard',exact:true}).click();
  await page.getByRole('button',{name:'Back',exact:true}).click();
  await page.getByRole('button',{name:'Back',exact:true}).click();
  await page.getByText('Do your hours vary by day? Click here to expand and customize',{exact:true}).click();
  const inFields=page.locator('input[data-time="start"][data-date]:not([data-date=""])');
  const outFields=page.locator('input[data-time="end"][data-date]:not([data-date=""])');
  await inFields.nth(1).fill('9:00');
  await outFields.nth(1).fill('5:30');
  await page.getByRole('button', {name:'Continue',exact:true}).click();
  await page.getByRole('button',{name:'Continue',exact:true}).click();
  await page.getByRole('button',{name:'Calculate Hours',exact:true}).last().click();
  await expect(page.locator('.simple-result .employee-report .summary-table > tbody:not(.pay-summary) > .report-total td:first-of-type')).toHaveText('40:00');
  await page.reload();
  await expect(page.locator('.simple-result .employee-report .summary-table > tbody:not(.pay-summary) > .report-total td:first-of-type')).toHaveText('40:00');
});

test('daily time source ignores default edits after expansion', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button',{name:'Continue',exact:true}).click();
  await page.getByRole('textbox',{name:'Clock In',exact:true}).fill('8:00');
  await page.getByRole('textbox',{name:'Clock Out',exact:true}).fill('4:30');
  await page.getByText('Do your hours vary by day? Click here to expand and customize',{exact:true}).click();
  const starts=page.locator('input[data-time="start"]:not([data-date=""])');
  const ends=page.locator('input[data-time="end"]:not([data-date=""])');
  await starts.nth(1).fill('9:00');
  await ends.nth(1).fill('5:30');
  await page.getByRole('textbox',{name:'Clock In',exact:true}).fill('7:00');
  await expect(starts.nth(0)).toHaveValue('8:00');
  await expect(starts.nth(1)).toHaveValue('9:00');
  await expect(ends.nth(1)).toHaveValue('5:30');
  await page.getByRole('button',{name:'Continue',exact:true}).click();
  await page.getByText('Does your break vary by day? Click here to expand and customize',{exact:true}).click();
  const breaks=page.locator('input[data-break]:not([data-break=""])');
  await breaks.nth(1).fill('60');
  await page.locator('[data-break-preset][value="30"]').check();
  await page.getByText('Does your break vary by day? Click here to expand and customize',{exact:true}).click();
  await expect(breaks.nth(0)).toHaveValue('30');
  await expect(breaks.nth(1)).toHaveValue('60');
  await page.getByRole('button',{name:'Continue',exact:true}).click();
  await page.getByRole('button',{name:'Calculate Hours',exact:true}).last().click();
  await expect(page.locator('.simple-result .employee-report .summary-table > tbody:not(.pay-summary) > .report-total td:first-of-type')).toHaveText('39:30');
});

test('Sunday overnight is a complete seven and a half hour shift', async ({ page }) => {
  await page.goto('/');
  const days=page.locator('[data-day]');
  for(let i=0;i<5;i++) await days.nth(i).locator('..').click();
  await days.nth(6).locator('..').click();
  await page.getByRole('button',{name:'Continue',exact:true}).click();
  await page.getByRole('textbox',{name:'Clock In',exact:true}).fill('10:00');
  await page.locator('[data-ampm="start"][data-date=""]').click();
  await page.getByRole('textbox',{name:'Clock Out',exact:true}).fill('6:00');
  await page.locator('[data-ampm="end"][data-date=""]').click();
  await page.getByRole('button',{name:'Continue',exact:true}).click();
  await page.locator('[data-break-preset][value="30"]').check();
  await page.getByRole('button',{name:'Continue',exact:true}).click();
  await page.getByRole('button',{name:'Calculate Hours',exact:true}).last().click();
  await expect(page.locator('.simple-result .employee-report .summary-table > tbody:not(.pay-summary) > .report-total td:first-of-type')).toHaveText('7:30');
  await expect(page.locator('.simple-result .employee-report tbody:not(.pay-summary) tr').filter({hasText:'Sun'})).toHaveCount(1);
  await expect(page.locator('.simple-result .employee-report')).toContainText('7.50');
  const before=await page.evaluate(()=>JSON.parse(localStorage.getItem('time-card-v1')!).entries);
  page.on('dialog',dialog=>dialog.accept());
  await page.getByRole('link',{name:'Want to adjust the details? Click here to open Detailed Calculator',exact:true}).click();
  await page.getByRole('link',{name:'Want to fill in quickly? Click here to open the wizard',exact:true}).click();
  const after=await page.evaluate(()=>JSON.parse(localStorage.getItem('time-card-v1')!).entries);
  expect(after).toEqual(before);
});

test('invalid inputs and no days block progress while close and refresh retain edits', async ({ page }) => {
  await page.goto('/');
  const days=page.locator('[data-day]');
  for(let i=0;i<5;i++) await days.nth(i).locator('..').click();
  await page.getByRole('button',{name:'Continue',exact:true}).click();
  await expect(page.locator('#simple-errors')).toContainText('Select at least one');
  await days.first().locator('..').click();
  await page.getByRole('button',{name:'Continue',exact:true}).click();
  await page.getByRole('textbox',{name:'Clock In',exact:true}).fill('');
  await page.getByRole('textbox',{name:'Clock Out',exact:true}).fill('');
  await page.getByRole('button',{name:'Continue',exact:true}).click();
  await expect(page.locator('#simple-errors')).not.toBeEmpty();
  await page.getByRole('textbox',{name:'Clock In',exact:true}).fill('999');
  await page.getByRole('textbox',{name:'Clock Out',exact:true}).fill('4:30');
  await page.getByRole('button',{name:'Continue',exact:true}).click();
  await expect(page.locator('#simple-errors')).not.toBeEmpty();
  await page.getByRole('button',{name:'Close wizard'}).click();
  await page.reload();
  await expect(page.getByRole('dialog')).not.toBeVisible();
  await page.getByRole('link',{name:'Want to fill in quickly? Click here to open the wizard',exact:true}).click();
  await expect(page.getByRole('textbox',{name:'Clock In',exact:true})).toHaveValue('999');
  await page.getByRole('textbox',{name:'Clock In',exact:true}).fill('8');
  await page.getByRole('button',{name:'Continue',exact:true}).click();
  await page.getByRole('radio',{name:'Custom',exact:true}).check();
  await page.locator('input[data-break=""]').fill('999');
  await page.getByRole('button',{name:'Continue',exact:true}).click();
  await expect(page.locator('#simple-errors')).toContainText('break');
});

test('advanced draft cancellation preserves full data and remains available in Detailed', async ({ page }) => {
  const {createCard,addEntry,setMinute}=await import('../../src/state/card');
  const card=createCard('2026-11-09');
  card.length='2';
  const entry=addEntry(card,'2026-11-09','advanced');
  setMinute(card,entry,entry.start,480);setMinute(card,entry,entry.end,1020);
  await page.addInitScript(value=>localStorage.setItem('time-card-v1',JSON.stringify(value)),card);
  await page.goto('/');
  page.on('dialog',dialog=>dialog.dismiss());
  await page.getByRole('link',{name:'Want to fill in quickly? Click here to open the wizard',exact:true}).click();
  await expect(page.locator('#calculator')).toBeVisible();
  expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('time-card-v1')!).length)).toBe('2');
  expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('time-card-v1')!).entries.find((entry:{id:string})=>entry.id==='advanced').end.value)).toBe(1020);
});

test('storage denial and damaged drafts keep recoverable feedback', async ({ page }) => {
  await page.addInitScript(()=>Object.defineProperty(Storage.prototype,'setItem',{value(){throw Error('denied');}}));
  await page.goto('/');
  await page.getByRole('button',{name:'Close wizard'}).click();
  await expect(page.locator('#simple-home [role="status"]')).toContainText('storage');
});

test('damaged draft is preserved and receipt links bypass the wizard', async ({ page }) => {
  await page.addInitScript(()=>localStorage.setItem('time-card-v1','damaged-original'));
  await page.goto('/');
  await expect(page.getByRole('dialog')).not.toBeVisible();
  expect(await page.evaluate(()=>localStorage.getItem('time-card-v1'))).toBe('damaged-original');
  await page.goto('/#receipt=invalid');
  await expect(page.locator('#calculator')).toBeVisible();
  await expect(page.locator('#simple-home')).not.toBeVisible();
  await expect(page.locator('#receipt-input')).toHaveValue(/#receipt=invalid/);
  await page.goto('/#readonly=invalid');
  await expect(page.locator('#calculator')).toBeVisible();
  await expect(page.getByRole('dialog')).not.toBeVisible();
  expect(await page.evaluate(()=>localStorage.getItem('time-card-v1'))).toBe('damaged-original');
});

test('fresh specialty pages retain their Detailed presets', async ({ page }) => {
  await page.goto('/with-lunch/');
  await expect(page.locator('[data-setting="auto"]')).toBeChecked();
  await page.locator('#settings').evaluate((node: HTMLDetailsElement) => node.open = true);
  await page.getByLabel('Show Client', {exact:true}).check();
  await page.getByLabel('Show Project', {exact:true}).check();
  await page.locator('[data-card="client"]').fill('preset');
  expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('time-card-v1')!).settings.auto)).toBe(true);
  await page.evaluate(()=>localStorage.clear());
  await page.goto('/biweekly/');
  await expect(page.locator('[data-card="length"]')).toHaveValue('2');
  await page.locator('#settings').evaluate((node: HTMLDetailsElement) => node.open = true);
  await page.getByLabel('Show Client', {exact:true}).check();
  await page.getByLabel('Show Project', {exact:true}).check();
  await page.locator('[data-card="client"]').fill('preset');
  expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('time-card-v1')!).length)).toBe('2');
  await page.evaluate(()=>localStorage.clear());
  await page.goto('/decimal/');
  await expect(page.locator('[data-card="decimalFirst"]')).toBeChecked();
  await page.locator('#settings').evaluate((node: HTMLDetailsElement) => node.open = true);
  await page.getByLabel('Show Client', {exact:true}).check();
  await page.getByLabel('Show Project', {exact:true}).check();
  await page.locator('[data-card="client"]').fill('preset');
  expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('time-card-v1')!).decimalFirst)).toBe(true);
});

test('Monday personalization keeps inherited defaults across modes', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button',{name:'Continue',exact:true}).click();
  await page.getByRole('textbox',{name:'Clock In',exact:true}).fill('8:00');
  await page.getByRole('textbox',{name:'Clock Out',exact:true}).fill('4:30');
  await page.getByText('Do your hours vary by day? Click here to expand and customize',{exact:true}).click();
  const starts=page.locator('input[data-time="start"]:not([data-date=""])');
  await starts.first().fill('9:00');
  await page.getByRole('button',{name:'Close wizard'}).click();
  await page.getByRole('link',{name:'Want to fill in quickly? Click here to open the wizard',exact:true}).click();
  if(await page.getByRole('dialog',{name:'Which days do you work?'}).isVisible()) await page.getByRole('button',{name:'Continue',exact:true}).click();
  await expect(page.getByRole('textbox',{name:'Clock In',exact:true})).toHaveValue('8:00');
  await page.getByRole('textbox',{name:'Clock In',exact:true}).fill('7:00');
  await page.getByText('Do your hours vary by day? Click here to expand and customize',{exact:true}).click();
  await expect(starts.first()).toHaveValue('9:00');
  await expect(starts.nth(1)).toHaveValue('8:00');
});

test('wizard shows step tiles, background editor, meridiem switches and pay options', async ({ page, browserName }) => {
  await page.setViewportSize(browserName === 'webkit' ? {width:390,height:844} : {width:1440,height:1000});
  await page.goto('/');
  const wizard = page.getByRole('dialog', { name: 'Which days do you work?' });
  await expect(wizard.locator('.simple-progress span')).toHaveCount(4);
  await expect(page.locator('#calculator')).toBeVisible();
  await page.screenshot({path:`test-results/simple-days-${browserName}.png`});
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await expect(page.locator('[data-ampm="start"][data-date=""]')).toHaveRole('switch');
  await page.screenshot({path:`test-results/simple-hours-${browserName}.png`});
  await page.getByRole('textbox', { name: 'Clock In', exact: true }).fill('8');
  await page.getByRole('textbox', { name: 'Clock Out', exact: true }).fill('4:30');
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await expect(page.getByRole('radio', { name: '30 minutes', exact: true })).toBeVisible();
  await page.getByRole('radio', {name:'30 minutes',exact:true}).check();
  await page.screenshot({path:`test-results/simple-breaks-${browserName}.png`});
  await page.getByRole('button',{name:'Continue',exact:true}).click();
  await page.locator('[data-simple-rate]').fill('20');
  await page.screenshot({path:`test-results/simple-pay-${browserName}.png`});
  await page.getByRole('button',{name:'Calculate Hours',exact:true}).click();
  await expect(page.locator('.simple-result')).toContainText('$800.00');
  expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('time-card-v1')!).settings.rate)).toBe(2000);
  await expect(page.locator('#calculator')).toBeHidden();
  expect(await page.locator('.simple-result .employee-report').innerHTML()).toBe(await page.locator('#print-report .employee-report').innerHTML());
});

test('invalid hourly rate preserves the recoverable business draft', async ({page}) => {
  await page.goto('/');
  await page.getByRole('button',{name:'Continue',exact:true}).click();
  await page.getByRole('textbox',{name:'Clock In',exact:true}).fill('8');
  await page.getByRole('textbox',{name:'Clock Out',exact:true}).fill('4:30');
  await page.getByRole('button',{name:'Continue',exact:true}).click();
  await page.getByRole('button',{name:'Continue',exact:true}).click();
  await page.locator('[data-simple-rate]').fill('-1');
  await page.getByRole('button',{name:'Calculate Hours',exact:true}).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('time-card-v1')!).settings.rate)).toBeNull();
  await page.getByRole('button',{name:'Close wizard'}).click();
  await page.reload();
  expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('time-card-v1')!).settings.rate)).toBeNull();
  await expect(page.locator('#save-status')).not.toContainText('damaged');
});

test('step two defaults normalize on blur and validate visible editing scope', async ({page}) => {
  await page.goto('/');
  await page.getByRole('button',{name:'Continue',exact:true}).click();
  const start=page.getByRole('textbox',{name:'Clock In',exact:true});
  const end=page.getByRole('textbox',{name:'Clock Out',exact:true});
  await expect(start).toHaveValue('8:00');
  await expect(end).toHaveValue('4:30');
  await page.getByRole('button',{name:'Continue',exact:true}).click();
  await expect(page.getByRole('dialog')).toHaveAccessibleName('Do you take an unpaid break?');
  await page.getByRole('button',{name:'Back',exact:true}).click();
  await start.fill('800');
  await start.blur();
  await expect(start).toHaveValue('8:00');
  await start.fill('999');
  await expect(start).toHaveAttribute('aria-invalid','true');
  await start.fill('2400');
  await expect(start).toHaveAttribute('aria-invalid','true');
  await start.fill('8:00');
  await end.fill('8:00');
  const endSwitch=page.locator('[data-ampm="end"][data-date=""]');
  if(await endSwitch.getAttribute('aria-checked')==='true') await endSwitch.click();
  await expect(end).toHaveAttribute('aria-invalid','true');
  await end.fill('4:30');
  await endSwitch.click();
  const summary=page.locator('#simple-wizard summary').first();
  await expect(summary).toHaveCSS('text-align','left');
  await expect(summary).toHaveCSS('justify-content','flex-start');
  await summary.click();
  const custom=page.locator('input[data-time="start"][data-date]:not([data-date=""])').first();
  await custom.fill('999');
  await expect(custom).toHaveAttribute('aria-invalid','true');
  await page.getByRole('button',{name:'Continue',exact:true}).click();
  await expect(page.getByRole('dialog')).toHaveAccessibleName('What time do you start and finish?');
  await summary.click();
  await page.getByRole('button',{name:'Continue',exact:true}).click();
  await expect(page.getByRole('dialog')).toHaveAccessibleName('What time do you start and finish?');
  await summary.click();
  await expect(custom).toHaveValue('999');
  await custom.fill('8:00');
  await page.getByRole('button',{name:'Continue',exact:true}).click();
  await expect(page.getByRole('dialog')).toHaveAccessibleName('Do you take an unpaid break?');
  await expect(page.getByRole('button',{name:'Work an irregular schedule? Click here to open Detailed Calculator',exact:true})).toBeVisible();
});

test('four step wizard uses weekday names and separate pay settings', async ({page}) => {
  await page.goto('/');
  await expect(page.locator('.simple-progress span')).toHaveCount(4);
  await expect(page.locator('.simple-work-days label').first()).toContainText('Mon');
  await page.getByRole('button',{name:'Continue',exact:true}).click();
  await page.getByRole('button',{name:'Continue',exact:true}).click();
  await expect(page.locator('input[data-break=""]')).toBeHidden();
  const noBreak=page.getByRole('radio',{name:'No break',exact:true});
  await expect(noBreak).toHaveCSS('order','2');
  await expect(noBreak.locator('..')).toHaveCSS('background-color','rgb(218, 233, 205)');
  await page.getByRole('radio',{name:'Custom',exact:true}).check();
  await expect(page.locator('input[data-break=""]')).toBeVisible();
  await page.locator('input[data-break=""]').fill('30');
  await page.getByRole('button',{name:'Continue',exact:true}).click();
  await expect(page.locator('[data-simple-rate]')).toBeVisible();
  await expect(page.locator('[data-simple-overtime] option')).toHaveCount(4);
});

test('fourth step preserves formal overtime choices and field selection', async ({page}) => {
  await page.goto('/');
  for(let index=1;index<5;index++) await page.locator('[data-day]').nth(index).locator('..').click();
  await page.getByRole('button',{name:'Continue',exact:true}).click();
  const start=page.getByRole('textbox',{name:'Clock In',exact:true});
  await start.click();
  expect(await start.evaluate((input:HTMLInputElement)=>[input.selectionStart,input.selectionEnd])).toEqual([0,4]);
  await start.blur();
  await expect(start).toHaveValue('8:00');
  await start.click();
  await page.keyboard.type('500');
  await start.blur();
  await expect(start).toHaveValue('5:00');
  await page.getByRole('textbox',{name:'Clock Out',exact:true}).fill('8:00');
  await expect(page.locator('.simple-quick-entry')).toHaveText('Quick entry: 800 means 8:00.');
  await start.fill('999');
  await expect(start.locator('xpath=ancestor::label').locator('.time-field-heading .field-message')).toBeVisible();
  await start.fill('5:00');
  await page.getByRole('button',{name:'Continue',exact:true}).click();
  await page.getByRole('button',{name:'Continue',exact:true}).click();
  for(const [mode,regular,overtime,double] of [['none',900,0,0],['weekly',900,0,0],['daily',480,420,0],['ca',480,240,180]] as const) {
    await page.locator('[data-simple-overtime]').selectOption(mode);
    await page.locator('[data-simple-rate]').fill('20');
    await page.getByRole('button',{name:'Calculate Hours',exact:true}).click();
    await expect(page.locator('.simple-result .employee-report')).toContainText('15:00');
    const current=await page.evaluate(()=>JSON.parse(localStorage.getItem('time-card-v1')!));
    const {getReport}=await import('../../src/state/card');
    const report=getReport(current);
    expect([report.regular,report.overtime,report.double]).toEqual([regular,overtime,double]);
    await page.getByRole('link',{name:'Want to adjust the details? Click here to open Detailed Calculator',exact:true}).click();
    await page.getByRole('link',{name:'Want to fill in quickly? Click here to open the wizard',exact:true}).click();
  }
});

test('named Sunday night report shares and exports its complete shift', async ({page,context,browserName}) => {
  const {createCard,addEntry,setMinute}=await import('../../src/state/card');
  const card=createCard('2026-11-09');
  card.name='Night worker';card.settings.rate=2000;
  const entry=addEntry(card,'2026-11-15','sunday-night');
  setMinute(card,entry,entry.start,1320);setMinute(card,entry,entry.end,360);entry.dailyBreakMinutes=30;
  await page.addInitScript(value=>{
    localStorage.setItem('time-card-v1',JSON.stringify(value));
    Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async(value:string)=>{(window as unknown as {copied:string}).copied=value;}}});
  },card);
  await page.goto('/');
  await page.getByRole('link',{name:'Want to fill in quickly? Click here to open the wizard',exact:true}).click();
  for(let i=0;i<6;i++) {
    const day=page.locator('[data-day]').nth(i);
    if(await day.isChecked()) await day.locator('..').click();
  }
  for(let i=0;i<3;i++) await page.getByRole('button',{name:'Continue',exact:true}).click();
  await page.getByRole('button',{name:'Calculate Hours',exact:true}).click();
  await expect(page.locator('.simple-result .employee-report')).toContainText('Night worker');
  await expect(page.locator('.simple-result .employee-report')).toContainText('7:30');
  await expect(page.locator('.simple-result .employee-report')).toContainText('$150.00');
  await page.locator('.simple-result').getByRole('button',{name:'Copy share link',exact:true}).click();
  await expect.poll(()=>page.evaluate(()=>(window as unknown as {copied:string}).copied)).toContain('#report=');
  const url=await page.evaluate(()=>(window as unknown as {copied:string}).copied);
  expect(url).toContain('reportMode=simple');expect(url).toContain('#report=');
  const fresh=await context.newPage();await fresh.goto(url);
  await expect(fresh.locator('#readonly-report .employee-report')).toContainText('Night worker');
  await expect(fresh.locator('#readonly-report .employee-report')).toContainText('7:30');
  await expect(fresh.locator('#readonly-report .employee-report')).toContainText('$150.00');
  expect(await page.locator('.simple-result .employee-report').evaluateAll(elements=>elements.map(element=>element.outerHTML))).toEqual(await fresh.locator('#readonly-report .employee-report').evaluateAll(elements=>elements.map(element=>element.outerHTML))); 
  const reportStyles=(cells:Element[])=>cells.map(cell=>{const style=getComputedStyle(cell);return [style.backgroundColor,style.fontWeight,style.borderTopWidth];});
  const localStyles=await page.locator('.simple-result .pay-summary td').evaluateAll(reportStyles);
  const sharedStyles=await fresh.locator('#readonly-report .pay-summary td').evaluateAll(reportStyles);
  expect(localStyles).toEqual(sharedStyles);
  const sharedDownload=fresh.waitForEvent('download');
  await fresh.locator('#readonly-csv').click();
  const sharedFile=await sharedDownload;
  const sharedCsv=await (await import('node:fs/promises')).readFile((await sharedFile.path())!,'utf8');
  expect(sharedCsv).toContain('"450","7:30","7.50"');
  expect(sharedCsv).toContain('15000');
  await fresh.screenshot({path:`test-results/simple-named-share-${browserName}.png`,fullPage:true});
  await page.screenshot({path:`test-results/simple-named-result-${browserName}.png`,fullPage:true});
  await fresh.close();
  const download=page.waitForEvent('download');
  await page.locator('.simple-result').getByRole('button',{name:'Export CSV',exact:true}).click();
  const file=await download;const {readFile}=await import('node:fs/promises');
  const csv=await readFile((await file.path())!,'utf8');
  expect(csv).toContain('Night worker');expect(csv).toContain('"450","7:30","7.50"');expect(csv).toContain('15000');
});

test('result reuses historical report and original delivery button styling', async ({page}) => {
  await page.goto('/');
  for(let step=0;step<3;step++) await page.getByRole('button',{name:'Continue',exact:true}).click();
  await page.getByRole('button',{name:'Calculate Hours',exact:true}).click();
  await expect(page.locator('.simple-result .actions button')).toHaveCount(3);
  await expect(page.locator('.simple-result .actions button').first()).toHaveClass('primary');
  await expect(page.locator('.simple-result')).toContainText('Weekly totals');
  await expect(page.locator('.simple-result').getByRole('link',{name:/click here/i})).toBeVisible();
  await expect(page.locator('.simple-result').getByRole('link',{name:/click here/i})).toHaveCSS('font-style','italic');
  const styles=(element:Element)=>{
    const style=getComputedStyle(element);
    return ['color','background-color','border-top-color','border-radius','padding','font-size','font-weight','min-height'].map(name=>style.getPropertyValue(name));
  };
  for(const [index,id] of ['print','csv','share'].entries()) {
    const actual=page.locator('.simple-result .actions button').nth(index);
    const original=page.locator(`#${id}`);
    expect(await actual.getAttribute('class')).toBe(await original.getAttribute('class'));
    expect(await actual.evaluate(styles)).toEqual(await original.evaluate(styles));
  }
});

test('optional wizard fields, date range, mobile overtime and copied checkmark', async ({page}) => {
  await page.setViewportSize({width:390,height:844});
  await page.goto('/');
  for(let step=1;step<4;step++) await page.getByRole('button',{name:'Continue',exact:true}).click();
  const wizard=page.locator('#simple-wizard');
  await expect(wizard.getByRole('heading',{name:'Add some optional information?'})).toBeVisible();
  await expect(wizard.locator('.optional')).toHaveCount(4);
  const overtime=wizard.locator('[data-simple-overtime]');
  await expect(overtime).toHaveValue('none');
  await overtime.scrollIntoViewIfNeeded();
  await expect(overtime).toBeInViewport();
  await page.screenshot({path:test.info().outputPath('optional-fields-mobile.png')});
  await overtime.selectOption('weekly');
  await expect(overtime).toHaveValue('weekly');
  await overtime.selectOption('none');
  await wizard.locator('[data-simple-name]').fill('Alex');
  await expect(wizard.locator('.simple-period > .field-label')).toHaveCSS('font-weight','700');
  const originalPeriod = await wizard.locator('[data-simple-period-label]').textContent();
  await wizard.getByRole('button',{name:'Choose period dates'}).click();
  await page.locator('[data-range-day]').first().click();
  await page.locator('#close-date-range').click();
  await expect(wizard.locator('[data-simple-period-label]')).toHaveText(originalPeriod!);
  await wizard.getByRole('button',{name:'Choose period dates'}).click();
  await expect(page.locator('#date-range-dialog')).toBeVisible();
  await page.locator('#range-end').fill('2026-12-20');
  await page.locator('#range-start').fill('2026-12-14');
  await page.locator('#range-end').fill('2026-12-20');
  await page.locator('#apply-dates').click();
  await wizard.getByRole('button',{name:'Calculate Hours',exact:true}).click();
  const result=page.locator('.simple-result');
  await expect(result.locator('.report-identity')).toContainText('Alex');
  await expect(result.locator('.readonly-time-card caption')).toHaveText('Time Card');
  await expect(result.locator('.report-card-heading')).toHaveCount(0);
  await expect(result.locator('.report-billing-settings input')).toHaveCount(2);
  expect(await result.locator('.report-billing-settings input').evaluateAll(inputs => inputs.every(input => (input as HTMLInputElement).readOnly))).toBe(true);
  expect(await result.locator('.report-identity').evaluate(element => parseFloat(getComputedStyle(element).borderTopLeftRadius))).toBeGreaterThan(0);
  const identityBox = (await result.locator('.report-identity').boundingBox())!;
  expect((await result.locator('.readonly-time-card').boundingBox())!.y).toBeGreaterThan(identityBox.y + identityBox.height);

  await expect(result.locator('.report-identity')).toContainText('2026-12-14 – 2026-12-20');
  await expect(result.locator('.readonly-time-card')).toContainText('2026-12-14');
  const draft = await page.evaluate(() => JSON.parse(localStorage.getItem('time-card-v1')!));
  expect(draft.entries.every((entry:{row:string;actualDate:string})=>entry.row===entry.actualDate)).toBe(true);
  await page.evaluate(()=>Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async()=>{}}}));
  const share=result.locator('[data-simple-action="share"]');
  await share.click();
  await expect(share).toHaveClass(/copied/);
  expect(await share.evaluate(el=>getComputedStyle(el,'::before').content)).toBe('"✓"');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.screenshot({path:'test-results/optional-result-mobile.png',fullPage:true});
});

test('SE work days wrap and remain readable', async ({page}) => {
 await page.goto('/');
 for (const width of [320,375,390]) {
  await page.setViewportSize({width,height:667});
  const tiles=page.locator('.simple-work-days label');
  const first=(await tiles.first().boundingBox())!;
  expect((await tiles.last().boundingBox())!.y).toBeGreaterThan(first.y);
  for(const tile of await tiles.all()) expect((await tile.boundingBox())!.width).toBeGreaterThanOrEqual(64);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.screenshot({path:test.info().outputPath(`se-days-${width}.png`)});
 }
});

test('opened daily times stay authoritative after collapse and ignore invalid defaults', async ({page}) => {
 await page.goto('/'); await page.getByRole('button',{name:'Continue',exact:true}).click();
 await page.locator('[data-custom-times] summary').click();
 await page.locator('[data-time="end"][data-date]:not([data-date=""])').last().fill('6:00');
 await page.locator('[data-custom-times] summary').click();
 await page.getByRole('textbox',{name:'Clock In',exact:true}).fill('999');
 await page.getByRole('button',{name:'Continue',exact:true}).click();
 await expect(page.getByRole('dialog')).toHaveAccessibleName('Do you take an unpaid break?');
 await page.locator('[data-break-preset][value="30"]').check();
 await page.getByRole('button',{name:'Continue',exact:true}).click();
 await page.getByRole('button',{name:'Calculate Hours',exact:true}).last().click();
 await expect(page.locator('.simple-result .report-total').first()).toContainText('41:30');
});

test('opening unchanged daily times remains selected after close and refresh', async ({page}) => {
 await page.goto('/'); await page.getByRole('button',{name:'Continue',exact:true}).click();
 await page.locator('[data-custom-times] summary').click();
 await page.locator('[data-custom-times] summary').click();
 await page.getByRole('button',{name:'Close wizard'}).click();
 await page.reload();
 await page.getByRole('link',{name:'Want to fill in quickly? Click here to open the wizard',exact:true}).click();
 await page.getByRole('textbox',{name:'Clock In',exact:true}).fill('999');
 await page.getByRole('button',{name:'Continue',exact:true}).click();
 await expect(page.getByRole('dialog')).toHaveAccessibleName('Do you take an unpaid break?');
});

test('legacy hidden incomplete daily times cannot block unexpanded defaults', async ({page}) => {
 const {createCard}=await import('../../src/state/card');
 const {createSimpleMeta,setSimpleDefault}=await import('../../src/state/simple');
 const card=createCard('2026-11-09'); const meta=createSimpleMeta(card,true);
 setSimpleDefault(card,meta,'start','8:00','AM'); setSimpleDefault(card,meta,'end','4:30','PM');
 card.entries[4].end={raw:'',value:null,ampm:'PM',dirty:false};
 card.emptyRows=['primary:2026-11-14','primary:2026-11-15'];
 const legacy={...meta,step:2,customizeTimes:false,customTimesUsed:true,customTimes:[card.entries[4].row]};
 Reflect.deleteProperty(legacy,'dailyTimesSelected');
 await page.addInitScript(({card,legacy})=>{
  localStorage.setItem('time-card-v1',JSON.stringify(card));
  localStorage.setItem('time-card-simple-ui-v1',JSON.stringify({mode:'detailed',visited:true,meta:legacy}));
 },{card,legacy});
 await page.goto('/');
 await page.getByRole('link',{name:'Want to fill in quickly? Click here to open the wizard',exact:true}).click();
 await expect(page.locator('[data-custom-times]')).not.toHaveAttribute('open','');
 await expect(page.getByRole('textbox',{name:'Clock In',exact:true})).toHaveValue('8:00');
 await expect(page.getByRole('textbox',{name:'Clock Out',exact:true})).toHaveValue('4:30');
 await page.getByRole('button',{name:'Continue',exact:true}).click();
 await expect(page.getByRole('dialog')).toHaveAccessibleName('Do you take an unpaid break?');
 const stored=await page.evaluate(()=>JSON.parse(localStorage.getItem('time-card-v1')!));
 expect(stored.entries.map((entry:{start:{value:number};end:{value:number}})=>[entry.start.value,entry.end.value])).toEqual([[480,990],[480,990],[480,990],[480,990],[480,990]]);
 await page.locator('[data-break-preset][value="30"]').check();
 await page.getByRole('button',{name:'Continue',exact:true}).click();
 await page.getByRole('button',{name:'Calculate Hours',exact:true}).last().click();
 await expect(page.locator('.simple-result .report-total').first()).toContainText('40:00');
});
