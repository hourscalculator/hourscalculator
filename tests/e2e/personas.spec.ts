import { test, expect, type Page } from '@playwright/test';
import { openDetailed, verifyDelivery } from './helpers';

test('Settings hides and restores identity and content without losing values', async ({ page }) => {
  await openDetailed(page);
  await page.locator('#settings').evaluate((node: HTMLDetailsElement) => node.open = true);
  await page.getByLabel('Show Client', { exact: true }).check();
  await page.getByLabel('Show Project', { exact: true }).check();
  await page.locator('[data-card="client"]').fill('Acme');
  await page.locator('[data-card="project"]').fill('Kitchen Renovation');
  await page.locator('[data-add-content]').first().click();
  await page.locator('[data-content]').first().fill('Site preparation');
  await page.getByLabel('Show Content', { exact: true }).uncheck();
  await expect(page.locator('[data-content]').first()).toBeHidden();
  await page.getByLabel('Show Content', { exact: true }).check();
  await expect(page.locator('[data-content]').first()).toHaveValue('Site preparation');
  await page.getByLabel('Show Client', { exact: true }).uncheck();
  await expect(page.locator('[data-card="client"]')).toBeHidden();
  await page.reload();
  await page.locator('#settings').evaluate((node: HTMLDetailsElement) => node.open = true);
  await page.getByLabel('Show Client', { exact: true }).check();
  await expect(page.locator('[data-card="client"]')).toHaveValue('Acme');
  await expect(page.locator('[data-card="project"]')).toHaveValue('Kitchen Renovation');
});

test('Freelancer visible multi-period entry totals 10:15 and $768.75', async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-11-09T04:00:00Z'));
  await openDetailed(page);
  await page.locator('[data-card="name"]').fill('Freelancer');
  await page.locator('.overtime-rule').selectOption('none');
  await page.locator('.rate-settings [data-setting="rate"]').fill('75');
  await page.locator('.rate-settings [data-setting="rate"]').blur();
  for (const [index, times] of [[0, ['9:15a', '11:45a', '12:30p', '3p']], [1, ['10a', '12p', '1p', '4:15p']]] as const) {
    const day = page.locator('.day').nth(index);
    await day.locator('[data-field="start"]').first().fill(times[0]);
    await day.locator('[data-field="start"]').first().blur();
    await day.locator('[data-field="end"]').first().fill(times[1]);
    await day.locator('[data-field="end"]').first().blur();
    if (await day.locator('[data-field="start"]').count() < 2) await day.locator('[data-add]').click();
    await day.locator('[data-field="start"]').last().fill(times[2]);
    await day.locator('[data-field="start"]').last().blur();
    await day.locator('[data-field="end"]').last().fill(times[3]);
    await day.locator('[data-field="end"]').last().blur();
  }
  for (const day of (await page.locator('.day').all()).slice(2)) {
    for (const input of await day.locator('[data-field="start"], [data-field="end"]').all()) { await input.fill(''); await input.blur(); }
  }
  await expect(page.locator('#daily-report .report-grand-total')).toContainText('10:15');
  await expect(page.locator('#daily-report')).toContainText('$768.75');
  await verifyDelivery(page, 'freelancer', 615, 76875);
  await page.screenshot({ path: test.info().outputPath('freelancer.png'), fullPage: true });
});

test('HR biweekly 40 and 42 hours yields 82 hours and $1826', async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-11-02T04:00:00Z'));
  await openDetailed(page);
  await page.locator('[data-card="name"]').fill('Jordan');
  await page.locator('[data-card="length"]').selectOption('2');
  await page.locator('.rate-settings [data-setting="rate"]').fill('22');
  await page.locator('[data-setting="auto"]').check();
  const monday = page.locator('.day[data-date="2026-11-02"]');
  await monday.locator('[data-field="start"]').fill('9a');
  await monday.locator('[data-field="end"]').fill('5:30p');
  await monday.locator('[data-field="end"]').blur();
  const friday = page.locator('.day[data-date="2026-11-13"]');
  await friday.locator('[data-field="end"]').fill('7:30p');
  await friday.locator('[data-field="end"]').blur();
  await expect(page.locator('#daily-report .report-grand-total')).toContainText('82:00');
  await expect(page.locator('#daily-report')).toContainText('$1,826.00');
  await expect(page.locator('#print-report')).toContainText('2026-11-02 – 2026-11-15');
  await verifyDelivery(page, 'hr', 4920, 182600);
  await page.screenshot({ path: test.info().outputPath('hr.png'), fullPage: true });
});

test('three copied cards preserve independent shifts and total 24 hours $600', async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-11-09T04:00:00Z'));
  await openDetailed(page);
  await page.locator('.rate-settings [data-setting="rate"]').fill('25');
  for (const [index, name, start, end, rest] of [[0,'Alex','7a','3:30p','30'],[1,'Ben','7:30a','4p','30'],[2,'Chris','8a','5p','60']] as const) {
    if (index) await page.locator('#add-time-card').click();
    const worker = page.locator('.worker-card').nth(index);
    await worker.locator('[data-card="name"]').fill(name);
    await worker.locator('[data-card="project"]').fill('Kitchen Renovation');
    await worker.locator('[data-setting="auto"]').check();
    await worker.locator('[data-setting="deduction"]').fill(rest);
    await worker.locator('[data-setting="deduction"]').blur();
    const day = worker.locator('.day').last();
    await day.locator('[data-field="start"]').fill(start);
    await day.locator('[data-field="end"]').fill(end);
    await day.locator('[data-field="end"]').blur();
  }
  await expect(page.locator('#daily-report .report-grand-total')).toContainText('24:00');
  await expect(page.locator('#daily-report')).toContainText('$600.00');
  await page.reload();
  await expect(page.locator('.worker-card')).toHaveCount(3);
  await expect(page.locator('#daily-report .report-grand-total')).toContainText('24:00');
  await verifyDelivery(page, 'team', 1440, 60000);
  await page.screenshot({ path: test.info().outputPath('team.png'), fullPage: true });
});
test('new draft starts with optional identity and content disabled', async ({page}) => {
 await page.goto('/');
 await page.getByRole('button',{name:'Work an irregular schedule? Click here to open Detailed Calculator',exact:true}).click();
 await expect(page.locator('[data-card="client"]')).toBeHidden();
 await expect(page.locator('[data-card="project"]')).toBeHidden();
 await expect(page.locator('[data-add-content]').first()).toBeHidden();
});

test('manual lunch and automatic break deduct once and overlapping breaks block delivery', async ({page}) => {
 await page.clock.setFixedTime(new Date('2026-11-09T04:00:00Z'));
 await openDetailed(page);
 const day=page.locator('.day').last();
 await day.locator('[data-field="start"]').fill('9a'); await day.locator('[data-field="start"]').blur();
 await day.locator('[data-field="end"]').fill('5p'); await day.locator('[data-field="end"]').blur();
 await day.locator('[data-add-break]').click();
 await day.locator('[data-field="b0-start"]').fill('12p'); await day.locator('[data-field="b0-start"]').blur();
 await day.locator('[data-field="b0-end"]').fill('12:30p'); await day.locator('[data-field="b0-end"]').blur();
 await page.locator('[data-setting="auto"]').check();
 await expect(page.locator('#daily-report .report-grand-total')).toContainText('7:30');
 await day.locator('[data-add-break]').click();
 await day.locator('[data-field="b1-start"]').fill('12:15p'); await day.locator('[data-field="b1-start"]').blur();
 await day.locator('[data-field="b1-end"]').fill('12:45p'); await day.locator('[data-field="b1-end"]').blur();
 await expect(day.locator('.field-message').filter({hasText:'overlaps'}).first()).toBeVisible();
 const downloads: string[]=[]; page.on('download',file=>downloads.push(file.suggestedFilename()));
 await page.locator('#csv').click();
 expect(downloads).toEqual([]);
});

test('E F G multi-period gaps blank and zero duration are explicit', async ({page}) => {
 await page.clock.setFixedTime(new Date('2026-11-09T04:00:00Z'));
 await openDetailed(page);
 await expect(page.locator('#daily-report .report-grand-total')).toContainText('0:00');
 const day=page.locator('.day').last();
 await day.locator('[data-field="start"]').fill('9a'); await day.locator('[data-field="start"]').blur();
 await day.locator('[data-field="end"]').fill('9a'); await day.locator('[data-field="end"]').blur();
 await expect(day.locator('.field-message').filter({hasText:'different times'}).first()).toBeVisible();
 await day.locator('[data-field="end"]').fill('12p'); await day.locator('[data-field="end"]').blur();
 await day.locator('[data-add]').click();
 await day.locator('[data-field="start"]').last().fill('1p'); await day.locator('[data-field="start"]').last().blur();
 await day.locator('[data-field="end"]').last().fill('5p'); await day.locator('[data-field="end"]').last().blur();
 await expect(page.locator('#daily-report .report-grand-total')).toContainText('7:00');
 await day.locator('[data-add-break]').click();
 await day.locator('[data-field="b0-start"]').fill('12:15p'); await day.locator('[data-field="b0-start"]').blur();
 await day.locator('[data-field="b0-end"]').fill('12:45p'); await day.locator('[data-field="b0-end"]').blur();
 await expect(day.locator('.field-message').filter({hasText:/outside|within|work/i}).first()).toBeVisible();
 const downloads: string[]=[]; page.on('download',file=>downloads.push(file.suggestedFilename()));
 await page.locator('#csv').click(); expect(downloads).toEqual([]);
 await page.screenshot({path:test.info().outputPath('EFG-gap-validation.png'),fullPage:true});
});

test('historical mixed rates show $400 regular and zero premium after card selection', async ({page}) => {
 const {createCard,addEntry,setMinute,addEmployee}=await import('../../src/state/card');
 const card=createCard('2026-11-09'); card.name='Legacy A'; card.client='Existing Client'; card.settings.rate=2000;
 let entry=addEntry(card,'2026-11-09','old-a'); setMinute(card,entry,entry.start,540); setMinute(card,entry,entry.end,1020);
 addEmployee(card,'legacy-b'); card.name='Legacy B'; card.settings.rate=3000;
 entry=addEntry(card,'2026-11-09','old-b'); setMinute(card,entry,entry.start,540); setMinute(card,entry,entry.end,1020);
 await page.addInitScript(value=>{
  if (!localStorage.getItem('time-card-v1')) {
   localStorage.setItem('time-card-v1',JSON.stringify(value));
   localStorage.setItem('time-card-simple-ui-v1',JSON.stringify({mode:'detailed',visited:true}));
  }
 },card);
 await page.goto('/');
 const total=page.locator('#daily-report .pay-summary').last().locator('tr').filter({has:page.getByRole('rowheader',{name:'Gross pay',exact:true})});
 await expect(total.locator('td')).toHaveText(['$400.00','+','$0.00','=','$400.00']);
 await expect(page.locator('[data-card="client"]').first()).toBeVisible();
 await page.locator('[data-card="name"]').first().fill('Legacy A selected');
 await expect(total.locator('td')).toHaveText(['$400.00','+','$0.00','=','$400.00']);
 await page.locator('[data-card="name"]').last().fill('Legacy B selected');
 await expect(total.locator('td')).toHaveText(['$400.00','+','$0.00','=','$400.00']);
 await page.screenshot({path:test.info().outputPath('historical-mixed-rates.png'),fullPage:true});
});
