import { test, expect } from '@playwright/test';
import { createCard, addEntry, setMinute } from '../../src/state/card';

test('duration breaks persist through formal report and CSV', async ({ page }) => {
  await page.goto('/');

    const card = createCard('2026-11-16');
    card.durationBreaks = { [card.anchor]: [15, 30], '2026-11-17': [30] };
    Object.assign(card.settings, { overtime: false, rate: 2000 });
    for (const [id, start, end] of [['morning', 540, 720], ['afternoon', 780, 1020]] as const) {
      const entry = addEntry(card, card.anchor, id);
      setMinute(card, entry, entry.start, start); setMinute(card, entry, entry.end, end);
    }
  await page.evaluate(card => {
    localStorage.setItem('time-card-v1', JSON.stringify(card));
    localStorage.setItem('time-card-simple-ui-v1', JSON.stringify({ mode: 'detailed', visited: true }));
  }, card);
  await page.reload();
  await expect(page.locator('#print-report')).toContainText('6:15');
  await expect(page.locator('#print-report')).toContainText('125.00');
  const downloaded = page.waitForEvent('download');
  await page.locator('#csv').click();
  const download = await downloaded;
  const path = test.info().outputPath('duration.csv');
  await download.saveAs(path);
  const { readFile } = await import('node:fs/promises');
  expect(await readFile(path, 'utf8')).toContain('"Total","375","6:15"');
});

test('daily duration editor covers blank dates, skips existing positive breaks and stays idempotent', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Close wizard' }).click();
  const detailed = page.getByRole('button', { name: 'Detailed Calculator', exact: true });
  if (await detailed.isVisible()) await detailed.click();
  const first = page.locator('.day').first();
  await first.locator('[data-add-break]').click();
  await expect(first.locator('[data-duration-date]')).toHaveValue('30');
  await first.locator('[data-add-break]').click();
  await expect(first.locator('[data-duration-date]')).toHaveCount(2);
  await page.locator('[data-bulk-break]').click();
  await expect(page.locator('[data-duration-date]')).toHaveCount(8);
  await page.locator('[data-bulk-break]').click();
  await expect(page.locator('[data-duration-date]')).toHaveCount(8);
  await expect(page.locator('.timeline')).toHaveCount(0);
  await page.reload();
  await expect(page.locator('[data-duration-date]')).toHaveCount(8);
  await page.locator('#add-time-card').click();
  page.once('dialog', dialog => dialog.dismiss());
  await page.locator('[data-remove-worker]:visible').click();
  await expect(page.locator('.worker-card')).toHaveCount(2);
  page.once('dialog', dialog => dialog.accept());
  await page.locator('[data-remove-worker]:visible').click();
  await expect(page.locator('.worker-card')).toHaveCount(1);
  await page.setViewportSize({ width: 375, height: 812 });
  await page.screenshot({ path: test.info().outputPath('duration-mobile.png'), fullPage: true });
});

test('advanced reset is available and Sunday is the first option', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Close wizard' }).click();
  await page.locator('[data-card="name"]').fill('Keep worker');
  await page.locator('.rate-settings [data-setting="rate"]').fill('25');
  await page.locator('.rate-settings [data-setting="rate"]').blur();
  await page.locator('.overtime-rule').selectOption('daily');
  await page.locator('#settings > summary').click();
  await expect(page.locator('[data-setting="weekStart"] option').first()).toHaveAttribute('value', '0');
  await expect(page.locator('#reset-advanced')).toBeVisible();
  const original = await page.evaluate(() => JSON.parse(localStorage.getItem('time-card-v1')!));
  await page.locator('[data-card="currency"]').selectOption('EUR');
  await page.locator('[data-card="format"]').selectOption('24');
  await expect(page.locator('[data-card="format"]').locator('..')).toHaveClass(/setting-modified/);
  await page.locator('#reset-advanced').click();
  await expect(page.locator('[data-card="currency"]')).toHaveValue('USD');
  await expect(page.locator('[data-card="format"]')).toHaveValue('12');
  await expect(page.locator('[data-card="format"]').locator('..')).not.toHaveClass(/setting-modified/);
  const restored = await page.evaluate(() => JSON.parse(localStorage.getItem('time-card-v1')!));
  expect(restored.entries).toEqual(original.entries);
  expect(restored.name).toBe(original.name);
  expect(restored.settings.rate).toBe(original.settings.rate);
  expect(restored.settings.overtime).toBe(original.settings.overtime);

});

test('24 hour Quick Fill reads afternoon time and hides meridiem controls', async ({ page }) => {
  const card = createCard('2026-11-16');
  card.format = '24';
  const entry = addEntry(card, card.anchor, 'day');
  setMinute(card, entry, entry.start, 480); setMinute(card, entry, entry.end, 990);
  await page.goto('/');
  await page.evaluate(card => {
    localStorage.setItem('time-card-v1', JSON.stringify(card));
    localStorage.setItem('time-card-simple-ui-v1', JSON.stringify({ mode: 'detailed', visited: true }));
  }, card);
  await page.reload();
  await page.getByRole('link', { name: 'Want to fill in quickly? Click here to open the wizard', exact: true }).click();
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await expect(page.locator('[data-time="end"][data-date=""]')).toHaveValue('16:30');
  await expect(page.locator('#simple-wizard [data-ampm]:visible')).toHaveCount(0);
  await page.locator('[data-time="end"][data-date=""]').fill('17:00');
  await page.locator('[data-time="end"][data-date=""]').blur();
  await expect(page.locator('[data-time="end"][data-date=""]').first()).toHaveValue('17:00');
  await expect(page.getByRole('button', { name: 'Continue', exact: true })).toBeEnabled();
});

test('excessive duration break error points to its minute input and clears after repair', async ({ page }) => {
  const card = createCard('2026-11-16');
  card.durationBreaks = { [card.anchor]: [60] };
  const entry = addEntry(card, card.anchor, 'short');
  setMinute(card, entry, entry.start, 540); setMinute(card, entry, entry.end, 570);
  await page.goto('/');
  await page.evaluate(card => {
    localStorage.setItem('time-card-v1', JSON.stringify(card));
    localStorage.setItem('time-card-simple-ui-v1', JSON.stringify({ mode: 'detailed', visited: true }));
  }, card);
  await page.reload();
  const minutes = page.locator('[data-duration-date]').first();
  await expect(minutes).toHaveAttribute('aria-invalid', 'true');
  await minutes.fill('15'); await minutes.blur();
  await expect(minutes).not.toHaveAttribute('aria-invalid', 'true');
  await expect(page.locator('#daily-report .report-grand-total')).toContainText('0:15');
});
