import { openDetailed } from "./helpers";
import { expect, test } from '@playwright/test';
for (const width of [375, 390]) test(`work and break delete controls stay beside their inputs at ${width}px`, async ({ page }) => {
  await page.setViewportSize({ width, height: 844 });
  await openDetailed(page);
  const day = page.locator('.day').first();
  await day.locator('[data-add-break]').click();
  const positions = await day.evaluate(day => {
    const box = (selector: string) => day.querySelector(selector)!.getBoundingClientRect();
    const borders = (selector: string) => getComputedStyle(day.querySelector(selector)!).borderBottomWidth;
    return {
      work: box('[data-field="end"]'), workToggle: box('[data-toggle-meridiem="end"]'),
      workDelete: box('[data-remove]'), rest: box('[data-duration-date]'),
      restDelete: box('[data-delete-duration]'), actions: box('.day-actions'),
      dateBorder: borders('.date-cell'), breakBorder: borders('.duration-cell'),
      dayBorder: getComputedStyle(day).borderBottomWidth,
    };
  });
  expect(positions.workDelete.left).toBeGreaterThanOrEqual(positions.work.right);
  expect(Math.abs(positions.workToggle.top - positions.work.top)).toBeLessThanOrEqual(2);
  expect(positions.work.width).toBeGreaterThanOrEqual(48);
  expect(positions.workToggle.width).toBeGreaterThanOrEqual(52);
  expect(positions.workToggle.width).toBeLessThanOrEqual(60);
  expect(positions.restDelete.left).toBeGreaterThanOrEqual(positions.rest.right);
  expect(positions.rest.width).toBeGreaterThanOrEqual(48);
  expect(positions.actions.top).toBeGreaterThanOrEqual(positions.rest.bottom);
  expect(positions.dateBorder).toBe('0px');
  expect(positions.breakBorder).toBe('0px');
  expect(positions.dayBorder).toBe('1px');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
test('very narrow work inputs stack while each time control and Out delete stay together', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 844 });
  await openDetailed(page);
  await page.locator('#settings > summary').click();
  await page.getByLabel('Show Content', { exact: true }).uncheck();
  await page.locator('#settings > summary').click();
  const day = page.locator('.day').first();
  await expect(day.locator('.day-actions .text-button:visible')).toHaveCount(2);
  const positions = await day.evaluate(day => {
    const box = (selector: string) => day.querySelector(selector)!.getBoundingClientRect();
    const heading = (key: string) => day.querySelector(`[data-field="${key}"]`)!.closest('.time-field')!.querySelector('.time-field-heading')!.getBoundingClientRect();
    return {
      inHeading: heading('start'),
      outHeading: heading('end'),
      in: box('[data-field="start"]'),
      inToggle: box('[data-toggle-meridiem="start"]'),
      out: box('[data-field="end"]'),
      outToggle: box('[data-toggle-meridiem="end"]'),
      workDelete: box('[data-remove]'),
    };
  });
  expect(positions.outHeading.top).toBeGreaterThan(positions.inHeading.top);
  expect(Math.abs(positions.inToggle.top - positions.in.top)).toBeLessThanOrEqual(2);
  expect(Math.abs(positions.outToggle.top - positions.out.top)).toBeLessThanOrEqual(2);
  expect(positions.in.width).toBeGreaterThanOrEqual(80);
  expect(positions.out.width).toBeGreaterThanOrEqual(80);
  expect(positions.inToggle.width).toBeGreaterThanOrEqual(52);
  expect(positions.inToggle.width).toBeLessThanOrEqual(60);
  expect(positions.outToggle.width).toBeGreaterThanOrEqual(52);
  expect(positions.outToggle.width).toBeLessThanOrEqual(60);
  expect(positions.workDelete.left).toBeGreaterThanOrEqual(positions.outToggle.right);
  expect(positions.workDelete.top).toBeLessThan(positions.outToggle.bottom);
  expect(positions.workDelete.bottom).toBeGreaterThan(positions.outToggle.top);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await day.screenshot({ path: test.info().outputPath('very-narrow-day.png') });
});
test('desktop actions follow all work and break records', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await openDetailed(page);
  const day = page.locator('.day').first();
  await day.locator('[data-add-break]').click();
  await day.locator('[data-add-break]').click();
  const positions = await day.evaluate(day => ({
    lastBreak: day.querySelector('.duration-group:last-child')!.getBoundingClientRect().bottom,
    actions: day.querySelector('.day-actions')!.getBoundingClientRect().top,
    width: day.getBoundingClientRect().width,
    workWidth: day.querySelector('[data-field="start"]')!.getBoundingClientRect().width,
  }));
  expect(positions.actions).toBeGreaterThanOrEqual(positions.lastBreak);
  expect(positions.width).toBeGreaterThan(500);
  expect(positions.workWidth).toBeGreaterThan(100);
  await day.screenshot({ path: test.info().outputPath('desktop-day.png') });
});
test('two tables, persistent rows and any-day forward fill', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openDetailed(page);
  await expect(page.locator('[data-days] .entry-table')).toHaveCount(1);
  await expect(page.locator('[data-days] details')).toHaveCount(0);
  const wednesday = page.locator('.day').nth(2);
  await wednesday.locator('[data-field="start"]').fill('9');
  await wednesday.locator('[data-field="end"]').fill('5p');
  await wednesday.locator('[data-field="end"]').blur();
  await expect(page.locator('.day').nth(4).locator('[data-field="end"]')).toHaveValue('5:00');
  await expect(page.locator('.day').first().locator('[data-field="start"]')).toHaveValue('');
  await wednesday.locator('[data-add-break]').click();
  await expect(page.locator('[data-paid]')).toHaveCount(0);
  await expect(page.locator('#report-body')).toBeEmpty();
  const printed = page.locator('#print-report > .report-hours');
  await expect(printed).toContainText('Wed');
  await expect(page.locator('#print-report .readonly-time-card')).toHaveCount(1);
  const actions = page.locator('#editor .actions');
  await expect(actions.getByRole('button', {name:'Print / PDF',exact:true})).toBeVisible();
  const positions = await page.evaluate(() => ({
    settings: document.querySelector('.quick-settings')!.getBoundingClientRect().top,
    entry: document.querySelector('[data-days]')!.getBoundingClientRect().top,
    name: document.querySelector('[data-card="name"]')!.getBoundingClientRect().top,
    report: document.querySelector('.report')!.getBoundingClientRect().bottom,
  }));
  expect(positions.settings).toBeLessThan(positions.entry);
  expect(positions.name).toBeLessThan(positions.report);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: 'test-results/two-tables-mobile.png', fullPage: true });
});
