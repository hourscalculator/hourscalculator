import { openDetailed } from "./helpers";
import { expect, test } from '@playwright/test';
test('four overtime choices share calculation and day layout', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openDetailed(page);
  await expect(page.locator('.entry-table thead th')).toHaveCount(4);
  const day = page.locator('.day').last();
  await day.locator('[data-field="start"]').fill('5a');
  await day.locator('[data-field="end"]').fill('8p');
  await day.locator('[data-field="end"]').blur();
  const choice = page.locator('.overtime-rule');
  await expect(choice.locator('option')).toHaveCount(4);
  for (const [value, expected] of [['none', '15:00 / 0:00 / 0:00'], ['weekly40', '15:00 / 0:00 / 0:00'], ['daily', '8:00 / 7:00 / 0:00'], ['ca', '8:00 / 4:00 / 3:00']]) {
    await choice.selectOption(value);
    const cells = page.locator('#daily-report .pay-summary tr').filter({ has: page.getByRole('rowheader', { name: 'hh:mm', exact: true }) }).locator('td');
    const actual = await cells.allTextContents();
    const [regular, overtime, double] = expected.split(' / ');
    await expect(cells.first()).toHaveText(regular);
    const minutes = (value: string) => Number(value.split(':')[0]) * 60 + Number(value.split(':')[1]);
    expect(minutes(actual[2])).toBe(minutes(overtime) + (value === "ca" ? 0 : minutes(double)));
    if (value === "ca") expect(minutes(actual[4])).toBe(minutes(double));
    const download = page.waitForEvent('download');
    await page.locator('#csv').click();
    const file = await download;
    const { readFile } = await import('node:fs/promises');
    const exported = await readFile((await file.path())!, 'utf8');
    const date = await day.getAttribute('data-date');
    const row = exported.split('\r\n').find(line => line.startsWith(`"${date}",`))!;
    const fields = row.split(',').map(value => value.replace(/^"|"$/g, ''));
    expect(fields.slice(4, 7).map(Number)).toEqual([regular, overtime, double].map(minutes));
  }
  await expect(day.locator('.timeline')).toHaveCount(0);
  const formula = page.locator('#daily-report .pay-summary');
  await expect(formula.locator('tr').filter({ has: page.getByRole('rowheader', { name: 'Decimal', exact: true }) }).locator('.operator')).toHaveText(['+', '+', '=']);
  expect(await formula.locator('td').first().evaluate((el) => getComputedStyle(el).borderTopWidth)).toBe('0px');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: 'test-results/overtime-layout-mobile.png', fullPage: true });
});
