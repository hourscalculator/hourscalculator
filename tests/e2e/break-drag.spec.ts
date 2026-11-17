import { openDetailed } from "./helpers";
import { test, expect } from '@playwright/test';
import { createCard, addEntry, setMinute } from '../../src/state/card';

test('legacy automatic break excess points to the old break field', async ({ page }) => {
  const card = createCard('2026-11-16');
  Object.assign(card.settings, { auto: true, deduction: 30, threshold: 0 });
  const entry = addEntry(card, card.anchor, 'short');
  setMinute(card, entry, entry.start, 540);
  setMinute(card, entry, entry.end, 555);
  await page.goto('/');
  await page.evaluate(card => {
    localStorage.setItem('time-card-v1', JSON.stringify(card));
    localStorage.setItem('time-card-simple-ui-v1', JSON.stringify({ mode: 'detailed', visited: true }));
  }, card);
  await page.reload();
  await expect(page.locator('[data-field="b0-end"]').first()).toHaveAttribute('aria-invalid', 'true');
});
test('legacy automatic break remains editable and help closes outside', async ({page}) => {
  await page.setViewportSize({width:390,height:844});
  await openDetailed(page);
  const day = page.locator('.day').last();
  await day.locator('[data-field="start"]').fill('9');
  await day.locator('[data-field="end"]').fill('5p');
  await day.locator('[data-field="end"]').blur();
  await page.evaluate(() => { const card = JSON.parse(localStorage.getItem('time-card-v1')!); card.settings.auto = true; localStorage.setItem('time-card-v1', JSON.stringify(card)); });
  await page.reload();
  await expect(day.locator('[data-field="b0-start"]')).toHaveValue('12:00');
  await expect(day.locator('[data-field="b0-end"]')).toHaveValue('12:30');
  await expect(day.locator('[data-daily-break]')).toHaveCount(0);
  await day.locator('[data-field="b0-end"]').fill('1245p');
  await day.locator('[data-field="b0-end"]').blur();
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('time-card-v1')!).settings.auto)).toBe(false);
  await expect(day.locator('[data-field="b0-end"]')).toHaveValue('12:45');
  await expect(page.locator('.daily-total')).toHaveCount(0);
  await page.getByRole('button', {name:'Explain overtime'}).click();
  await page.mouse.click(1,1);
  await expect(page.getByRole('dialog')).not.toBeVisible();
  await page.getByRole('button', {name:'Explain overtime'}).click();
  await page.getByRole('button', {name:'Close overtime help'}).click();
  await expect(page.getByRole('dialog')).not.toBeVisible();
  await page.screenshot({path:'test-results/break-timeline-mobile.png',fullPage:true});
});
