import { test, expect, type Page } from '@playwright/test';

export async function openDetailed(page: Page) {
  await page.goto('/');
  const blankFixture = await page.evaluate(() => {
    try { return localStorage.getItem('time-card-v1') === null; }
    catch { return false; }
  });
  const close = page.getByRole('button', { name: 'Close wizard' });
  if (await close.isVisible()) await close.click();
  const detailed = page.getByRole('button', { name: 'Detailed Calculator', exact: true });
  if (await detailed.isVisible()) await detailed.click();
  await page.locator('#settings > summary').click();
  for (const field of ['Client', 'Project', 'Content']) await page.getByLabel(`Show ${field}`, { exact: true }).check();
  await page.locator('#settings > summary').click();
  if (blankFixture) {
    for (const day of await page.locator('.day').all()) {
      for (const key of ['start', 'end']) {
        const input = day.locator(`[data-field="${key}"]`);
        if (await input.count()) {
          await input.fill(''); await input.blur();
          const meridiem = day.locator(`[data-toggle-meridiem="${key}"]`);
          if (await meridiem.count() && await meridiem.getAttribute('aria-checked') === 'true') await meridiem.click();
        }
      }
    }
  }
  for (const day of await page.locator('.day').all()) {
    if (await day.locator('[data-field="start"]').count() === 0) await day.locator('[data-add]').click();
  }
}

export async function chooseRange(page: Page, start: string, end: string) {
  await page.locator('[data-choose-dates]').first().click();
  await page.locator('#range-start').fill(start);
  await page.locator('#range-end').fill(end);
  await page.locator('#apply-dates').click();
}

export async function verifyDelivery(page: Page, title: string, minutes: number, cents: number) {
  const info = test.info();
  const downloaded = page.waitForEvent('download');
  await page.locator('#csv:visible, [data-simple-action="csv"]:visible').click();
  const file = await downloaded;
  const csvPath = info.outputPath(`${title}.csv`);
  await file.saveAs(csvPath);
  const { readFile } = await import('node:fs/promises');
  const exported = await readFile(csvPath, 'utf8');
  const rows = exported.replace(/^\uFEFF/, '').split('\r\n').map(line => [...line.matchAll(/"((?:[^"]|"")*)"/g)].map(match => match[1].replace(/""/g, '"')));
  const days = rows.filter(row => /^\d{4}-\d{2}-\d{2}$/.test(row[0] ?? ''));
  const actualMinutes = days.reduce((sum, row) => sum + Number(row[1]), 0);
  const actualPay = rows.filter(row => row[0] === 'Gross pay cents').reduce((sum, row) => sum + Number(row[1]), 0);
  expect(actualMinutes).toBe(minutes);
  expect(actualPay).toBe(cents);
  const expectedDays: Record<string, number[]> = { hourly: [480,480,480,480,570], freelancer: [300,315], hr: [480,480,480,480,480,480,480,480,480,600], team: [480,480,480], 'break-edit': [450,450,450,450,450] };
  expect(days.map(row => Number(row[1]))).toEqual(expectedDays[title]);
  if (title === 'hr') {
    expect(days.slice(0,5).reduce((sum,row) => sum + Number(row[1]),0)).toBe(2400);
    expect(days.slice(5).reduce((sum,row) => sum + Number(row[1]),0)).toBe(2520);
    expect(days.reduce((sum,row) => sum + Number(row[4]),0)).toBe(4800);
    expect(days.reduce((sum,row) => sum + Number(row[5]),0)).toBe(120);
  }
  if (title === 'hourly') {
    expect(days.reduce((sum,row) => sum + Number(row[4]),0)).toBe(2400);
    expect(days.reduce((sum,row) => sum + Number(row[5]),0)).toBe(90);
  }
  if (title === 'team') expect(rows.filter(row => row[0] === 'Gross pay cents').map(row => Number(row[1]))).toEqual([20000,20000,20000]);
  await info.attach(`${title}-verification`, { body: JSON.stringify({ expected: { minutes, cents, days: expectedDays[title] }, actual: { minutes: actualMinutes, cents: actualPay, days }, status: 'PASS' }, null, 2), contentType: 'application/json' });
  const nativeClipboard = info.project.name !== 'webkit';
  if (nativeClipboard) await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
  else await page.evaluate(() => {
    Object.defineProperty(window, 'ClipboardItem', { configurable: true, value: undefined });
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async (value: string) => { (window as any).sharedLink = value; } } });
  });
  await page.evaluate(() => {
    (window as any).printObserved = false;
    window.addEventListener('beforeprint', () => { (window as any).printObserved = true; });
  });
  await page.locator('#print:visible, [data-simple-action="print"]:visible').click();
  if (info.project.name === 'webkit') {
    info.annotations.push({ type: '无法验证', description: 'Headless WebKit does not emit beforeprint in this environment. Real Chrome verifies the native event.' });
  } else {
    await expect.poll(() => page.evaluate(() => (window as any).printObserved)).toBe(true);
  }
  const printed = await page.locator('#print-report').innerHTML();
  await page.locator('#share:visible, [data-simple-action="share"]:visible').click();
  const readLink = () => page.evaluate(native => native ? navigator.clipboard.readText() : (window as any).sharedLink as string, nativeClipboard);
  await expect.poll(readLink).toContain('#report=');
  const url = await readLink();
  const context = await page.context().browser()!.newContext({ timezoneId: 'Asia/Shanghai' });
  try {
    const report = await context.newPage();
    await report.goto(url);
    await expect.poll(() => report.locator('#readonly-report').innerHTML()).toBe(printed);
    expect(await report.evaluate(() => localStorage.getItem('time-card-v1'))).toBeNull();
    await report.screenshot({ path: info.outputPath(`${title}-shared.png`), fullPage: true });
    if (info.project.name !== 'webkit') await report.pdf({ path: info.outputPath(`${title}.pdf`), format: 'A4' });
  } finally { await context.close(); }
}


