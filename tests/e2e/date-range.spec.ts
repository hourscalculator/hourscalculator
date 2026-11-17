import { openDetailed, chooseRange } from "./helpers";
import { test, expect } from '@playwright/test';
import { addEntry, createCard, setMinute } from '../../src/state/card';

test('changing period keeps work outside the visible range', async ({ page }) => {
  const card = createCard('2026-11-09');
  const entry = addEntry(card, '2026-11-30', 'outside-range');
  setMinute(card, entry, entry.start, 540);
  setMinute(card, entry, entry.end, 1020);
  await page.goto('/');
  await page.evaluate(card => {
    localStorage.setItem('time-card-v1', JSON.stringify(card));
    localStorage.setItem('time-card-simple-ui-v1', JSON.stringify({ mode: 'detailed', visited: true }));
  }, card);
  await page.reload();
  for (const weeks of ['1', '2', '3', '4']) {
    await page.locator('[data-card="length"]').selectOption(weeks);
    await expect(page.locator('.day')).toHaveCount(Number(weeks) * 7);
  }
  await expect(page.locator('.day[data-date="2026-11-30"] [data-field="start"]')).toHaveValue('9:00');
  await page.locator('[data-card="length"]').selectOption('1');
  await expect(page.locator('.day[data-date="2026-11-30"]')).toHaveCount(0);
  await page.reload();
  await page.locator('[data-card="length"]').selectOption('4');
  await expect(page.locator('.day[data-date="2026-11-30"] [data-field="end"]')).toHaveValue('5:00');
});

test('legacy month displays custom without changing saved period', async ({ page }) => {
  const card = createCard('2026-11-10');
  card.length = 'month';
  await page.goto('/');
  await page.evaluate(card => {
    localStorage.setItem('time-card-v1', JSON.stringify(card));
    localStorage.setItem('time-card-simple-ui-v1', JSON.stringify({ mode: 'detailed', visited: true }));
  }, card);
  await page.reload();
  await expect(page.locator('[data-card="length"]')).toHaveValue('custom');
  await expect(page.locator('[data-custom-start]')).toHaveValue('2026-11-01');
  await expect(page.locator('[data-custom-end]')).toHaveValue('2026-11-30');
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('time-card-v1')!).length)).toBe('month');
});

test('custom dates are editable and synchronized with period', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Close wizard' }).click();
  const detailed = page.getByRole('button', { name: 'Detailed Calculator', exact: true });
  if (await detailed.isVisible()) await detailed.click();
  await page.locator('[data-card="length"]').selectOption('custom');
  await page.locator('[data-custom-start]').fill('2026-11-10');
  await page.locator('[data-custom-end]').fill('2026-11-18');
  await expect(page.locator('[data-choose-dates]')).toContainText('2026-11-10');
  await expect(page.locator('[data-choose-dates]')).toContainText('2026-11-18');
  await expect(page.locator('.day')).toHaveCount(9);
  await page.locator('[data-choose-dates]').click();
  await page.locator('#range-start').fill('2026-11-28');
  await page.locator('#range-end').fill('2026-12-04');
  await page.locator('#apply-dates').click();
  await expect(page.locator('[data-custom-start]')).toHaveValue('2026-11-28');
  await expect(page.locator('[data-custom-end]')).toHaveValue('2026-12-04');
  await expect(page.locator('.day')).toHaveCount(7);
  const stored = await page.evaluate(() => localStorage.getItem('time-card-v1'));
  await page.locator('[data-custom-end]').fill('2026-11-01');
  await expect(page.locator('[data-custom-end]')).toHaveAttribute('aria-invalid', 'true');
  expect(await page.evaluate(() => localStorage.getItem('time-card-v1'))).toBe(stored);
  await page.locator('[data-custom-end]').fill('2026-12-05');
  await expect(page.locator('[data-custom-end]')).not.toHaveAttribute('aria-invalid', 'true');
  await expect(page.locator('[data-choose-dates]')).toContainText('2026-12-05');
});
test('multiweek tables, sticky headings and calendar date range', async ({page}) => {
  await page.setViewportSize({width:390,height:844});
  await openDetailed(page);
  await chooseRange(page, '2026-11-09', '2026-11-15');
  await page.locator('[data-card="length"]').selectOption('1');
  await expect(page.locator('[data-choose-dates]')).toContainText('2026-11-09');
  for (const weeks of ['2','3','4']) {
    await page.locator('[data-card="length"]').selectOption(weeks);
    await expect(page.locator('[data-days] .entry-table')).toHaveCount(Number(weeks));
    await expect(page.locator('.week-heading').last()).toContainText(`Week ${weeks}`);
  }
  await page.reload();
  await expect(page.locator('[data-card="length"]')).toHaveValue('4');
  await page.locator('.entry-table').first().evaluate(el => window.scrollTo(0, window.scrollY + el.getBoundingClientRect().top + 200));
  await expect.poll(async () => Math.abs(await page.locator('.week-heading').first().evaluate((el) => el.getBoundingClientRect().top))).toBeLessThan(2);
  await page.screenshot({path:"test-results/week-sticky-mobile.png"});
  await page.locator('[data-choose-dates]').click();
  await page.locator('#date-range-dialog').screenshot({path:'test-results/date-picker.png'});
  await page.locator('[data-range-day="2026-11-10"]').click();
  await page.locator('[data-range-day="2026-11-18"]').click();
  await page.locator('#apply-dates').click();
  await expect(page.locator('[data-card="length"]')).toHaveValue('custom');
  await expect(page.locator('[data-choose-dates]')).toHaveText('2026-11-10 – 2026-11-18');
  await expect(page.locator('.day:not(.context)')).toHaveCount(9);
  await expect(page.locator('.day:not(.context)').first().locator('.day-date')).toHaveAttribute('datetime','2026-11-10');
  await expect(page.locator('#print-report')).toContainText('2026-11-10 – 2026-11-18');
  const download = page.waitForEvent('download');
  await page.locator('#csv').click();
  const file = await download;
  const {readFile} = await import('node:fs/promises');
  const csv = await readFile((await file.path())!, 'utf8');
  expect(csv).toContain('"Start date","2026-11-10"');
  expect(csv).toContain('"End date","2026-11-18"');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({path:'test-results/date-range-mobile.png',fullPage:true});
  await page.locator('[data-choose-dates]').click();
  await page.locator('[data-range-day="2026-11-28"]').click();
  await page.locator('#next-month').click();
  await page.locator('[data-range-day="2026-12-04"]').click();
  await page.locator('#apply-dates').click();
  await expect(page.locator('[data-choose-dates]')).toHaveText('2026-11-28 – 2026-12-04');
  await page.locator('[data-choose-dates]').click();
  await page.locator('[data-range-day="2026-11-30"]').click();
  await page.locator('#close-date-range').click();
  await expect(page.locator('[data-choose-dates]')).toHaveText('2026-11-28 – 2026-12-04');
});
