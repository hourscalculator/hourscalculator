import { test, expect } from '@playwright/test';
import { createCard, addEntry, setMinute } from '../../src/state/card';
test('Detailed preserves minute breaks on night shifts', async ({ page }) => {
  const card = createCard('2026-11-09');
  const entry = addEntry(card, card.anchor, 'night');
  setMinute(card, entry, entry.start, 1320);
  setMinute(card, entry, entry.end, 360);
  entry.dailyBreakMinutes = 30;
  await page.addInitScript(card => localStorage.setItem('time-card-v1', JSON.stringify(card)), card);
  await page.goto('/');
  await expect(page.locator('#daily-report .report-total td').first()).toHaveText('7:30');
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('time-card-v1')!).entries[0].dailyBreakMinutes)).toBe(30);
});
