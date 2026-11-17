import { test, expect } from '@playwright/test';
import { verifyDelivery } from './helpers';

test('collapsed daily settings preserve personalized Friday on continue', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await page.getByText('Do your hours vary by day? Click here to expand and customize', { exact: true }).click();
  const ends = page.locator('input[data-time="end"]:not([data-date=""])');
  await ends.nth(4).fill('6:00');
  await ends.nth(4).blur();
  await page.getByText('Do your hours vary by day? Click here to expand and customize', { exact: true }).click();
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await page.locator('[data-break-preset][value="30"]').check();
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await page.getByRole('button', { name: 'Calculate Hours', exact: true }).last().click();
  await expect(page.locator('.simple-result .report-total').first()).toContainText('41:30');
});

test('Quick Fill break minutes stay visible in Detail without an inferred time', async ({page}) => {
 await page.clock.setFixedTime(new Date('2026-11-09T04:00:00Z'));
 await page.goto('/');
 await page.getByRole('button',{name:'Continue',exact:true}).click();
 await page.getByRole('button',{name:'Continue',exact:true}).click();
 await page.locator('[data-break-preset][value="30"]').check();
 await page.getByRole('button',{name:'Continue',exact:true}).click();
 await page.getByRole('button',{name:'Calculate Hours',exact:true}).last().click();
 await page.getByRole('link',{name:'Want to adjust the details? Click here to open Detailed Calculator',exact:true}).click();
 await expect(page.locator('[data-duration-date]')).toHaveCount(5);
 await expect(page.locator('[data-duration-date]').first()).toHaveValue('30');
 await expect(page.locator('[data-field^="b"]')).toHaveCount(0);
 await expect(page.locator('#daily-report .report-grand-total .report-total td:first-of-type')).toHaveText('40:00');
 await page.reload();
 await expect(page.locator('[data-duration-date]')).toHaveCount(5);
 await expect(page.locator('#daily-report .report-grand-total .report-total td:first-of-type')).toHaveText('40:00');
 const monday = page.locator('.day[data-date="2026-11-09"]');
 await monday.locator('[data-add-break]').click();
 await expect(monday.locator('[data-duration-date]')).toHaveCount(2);
 await expect(page.locator('#daily-report .report-grand-total .report-total td:first-of-type')).toHaveText('39:30');
});

test('Detail break edit returns to Quick Fill with its actual minutes', async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-11-09T04:00:00Z'));
  await page.goto('/');
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await page.locator('[data-time="start"][data-date=""]').fill('9a');
  await page.locator('[data-time="end"][data-date=""]').fill('5p');
  await page.locator('[data-time="end"][data-date=""]').blur();
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await page.locator('[data-break-preset][value="30"]').check();
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await page.getByRole('button', { name: 'Calculate Hours', exact: true }).last().click();
  await page.getByRole('link', { name: 'Want to adjust the details? Click here to open Detailed Calculator', exact: true }).click();
  const monday = page.locator('.day[data-date="2026-11-09"]');
  await monday.locator('[data-duration-date]').fill('45');
  await monday.locator('[data-duration-date]').blur();
  await expect(monday.locator('.day-hours')).toHaveText('7:15');
  await page.getByRole('link', { name: 'Want to fill in quickly? Click here to open the wizard', exact: true }).click();
  await page.getByRole('button', { name: 'Back', exact: true }).click();
  await expect(page.locator('[data-break="2026-11-09"]')).toHaveValue('45');
});

test('Quick Fill zero break has no Detail summary', async ({page}) => {
 await page.clock.setFixedTime(new Date('2026-11-09T04:00:00Z'));
 await page.goto('/');
 await page.getByRole('button',{name:'Continue',exact:true}).click();
 await page.getByRole('button',{name:'Continue',exact:true}).click();
 await page.getByRole('button',{name:'Continue',exact:true}).click();
 await page.getByRole('button',{name:'Calculate Hours',exact:true}).last().click();
 await page.getByRole('link',{name:'Want to adjust the details? Click here to open Detailed Calculator',exact:true}).click();
 await expect(page.locator('.legacy-break-summary')).toHaveCount(0);
 await expect(page.locator('#daily-report .report-grand-total .report-total td:first-of-type')).toHaveText('42:30');
});

test('Detail Friday edit survives wizard back, continue, close and refresh', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.clock.setFixedTime(new Date('2026-11-09T04:00:00Z'));
  await page.goto('/');
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await page.locator('[data-break-preset][value="30"]').check();
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await page.locator('[data-simple-rate]').fill('20');
  await page.locator('[data-simple-overtime]').selectOption('weekly');
  await page.getByRole('button', { name: 'Calculate Hours', exact: true }).last().click();
  await page.getByRole('link', { name: 'Want to adjust the details? Click here to open Detailed Calculator', exact: true }).click();
  const friday = page.locator('.day[data-date="2026-11-13"]');
  await friday.locator('[data-field="end"]').fill('6p');
  await friday.locator('[data-field="end"]').blur();
  await expect(page.locator('#daily-report .report-grand-total')).toContainText('41:30');
  await page.getByRole('link', { name: 'Want to fill in quickly? Click here to open the wizard', exact: true }).click();
  await page.getByRole('button', { name: 'Back', exact: true }).click();
  await page.getByRole('button', { name: 'Back', exact: true }).click();
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await page.getByRole('button', { name: 'Calculate Hours', exact: true }).last().click();
  await expect(page.locator('.simple-result .report-total').first()).toContainText('41:30');
  await page.reload();
  await expect(page.locator('.simple-result .report-total').first()).toContainText('41:30');
  await expect(page.locator('.simple-result')).toContainText('$845.00');
  await verifyDelivery(page, 'hourly', 2490, 84500);
  await page.screenshot({ path: test.info().outputPath('sync-friday.png'), fullPage: true });
});

test('Simple break changes in Detail persist through delivery and refresh', async ({page}) => {
 await page.clock.setFixedTime(new Date('2026-11-09T04:00:00Z'));
 await page.goto('/');
 await page.getByRole('button',{name:'Continue',exact:true}).click();
 await page.getByRole('button',{name:'Continue',exact:true}).click();
 await page.locator('[data-break-preset][value="30"]').check();
 await page.getByRole('button',{name:'Continue',exact:true}).click();
 await page.locator('[data-simple-rate]').fill('20');
 await page.getByRole('button',{name:'Calculate Hours',exact:true}).last().click();
 await page.getByRole('link',{name:'Want to adjust the details? Click here to open Detailed Calculator',exact:true}).click();
 await expect(page.locator('[data-duration-date]').first()).toHaveValue('30');
 await expect(page.locator('#daily-report .report-grand-total')).toContainText('40:00');
 await expect(page.locator('#daily-report')).toContainText('$800.00');
 await page.reload();
 await expect(page.locator('#daily-report .report-grand-total')).toContainText('40:00');
 await expect(page.locator('#print-report')).toContainText('40:00');
 await page.getByRole('link',{name:'Want to fill in quickly? Click here to open the wizard',exact:true}).click();
 await page.getByRole('button',{name:'Back',exact:true}).click();
 await expect(page.locator('[data-break-preset][value="30"]')).toBeChecked();
 await page.getByRole('button',{name:'Continue',exact:true}).click();
 await page.getByRole('button',{name:'Calculate Hours',exact:true}).last().click();
 await expect(page.locator('.simple-result .report-total').first()).toContainText('40:00');
});

test('uniform Detail changes become wizard defaults and new days inherit them', async ({page}) => {
 await page.clock.setFixedTime(new Date('2026-11-09T04:00:00Z'));
 await page.goto('/');
 await page.getByRole('button',{name:'Work an irregular schedule? Click here to open Detailed Calculator',exact:true}).click();
 for (const day of (await page.locator('.day').all()).slice(0,5)) {
  await day.locator('[data-field="start"]').fill('9a'); await day.locator('[data-field="start"]').blur();
  await day.locator('[data-field="end"]').fill('5:30p'); await day.locator('[data-field="end"]').blur();
 }
 await page.getByRole('link',{name:'Want to fill in quickly? Click here to open the wizard',exact:true}).click();
 await page.getByRole('button',{name:'Continue',exact:true}).click();
 await expect(page.getByRole('textbox',{name:'Clock In',exact:true})).toHaveValue('9:00');
 await expect(page.getByRole('textbox',{name:'Clock Out',exact:true})).toHaveValue('5:30');
 await page.getByRole('button',{name:'Back',exact:true}).click();
 await page.locator('[data-day="2026-11-14"]').check();
 await page.getByRole('button',{name:'Continue',exact:true}).click();
 await page.locator('[data-custom-times] summary').click();
 await expect(page.locator('[data-time="start"][data-date="2026-11-14"]')).toHaveValue('9:00');
 await expect(page.locator('[data-time="end"][data-date="2026-11-14"]')).toHaveValue('5:30');
});

for (const [name,start,end,startPm,endPm,rest,expected] of [
 ['A overnight','10:00','6:00',true,false,'30','7:30'],
 ['B no break','9:00','5:00',false,true,'0','8:00'],
 ['C quarter hour','8:00','4:15',false,true,'30','7:45'],
 ['D decimal','8:00','4:45',false,true,'0','8:45'],
] as const) test(`regression ${name} through wizard and Detail`,async ({page})=>{
 await page.clock.setFixedTime(new Date('2026-11-09T04:00:00Z'));
 await page.goto('/');
 for (const date of ['10','11','12','13']) await page.locator(`[data-day="2026-11-${date}"]`).uncheck();
 await page.getByRole('button',{name:'Continue',exact:true}).click();
 await page.getByRole('textbox',{name:'Clock In',exact:true}).fill(start);
 await page.getByRole('textbox',{name:'Clock Out',exact:true}).fill(end);
 for (const [kind,pm] of [['start',startPm],['end',endPm]] as const) {
  const toggle=page.locator(`[data-ampm="${kind}"][data-date=""]`);
  if ((await toggle.getAttribute('aria-checked')==='true')!==pm) await toggle.click();
 }
 await page.getByRole('button',{name:'Continue',exact:true}).click();
 await page.locator(`[data-break-preset][value="${rest}"]`).check();
 await page.getByRole('button',{name:'Continue',exact:true}).click();
 await page.getByRole('button',{name:'Calculate Hours',exact:true}).last().click();
 await expect(page.locator('.simple-result .report-total').first()).toContainText(expected);
 await page.getByRole('link',{name:'Want to adjust the details? Click here to open Detailed Calculator',exact:true}).click();
 await expect(page.locator('#daily-report .report-grand-total')).toContainText(expected);
 await page.screenshot({path:test.info().outputPath(`${name[0]}.png`),fullPage:true});
});
