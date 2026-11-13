import { test, expect } from '@playwright/test';
test('compact actions and clipboard denial fallback', async ({page}) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async()=>{throw Error('denied');}}});
  });
  await page.goto('/');
  await expect(page.locator('#calculate')).toHaveCount(0);
  await expect(page.locator('#save-status')).toBeHidden();
  await expect(page.locator('#share')).toHaveText('Copy share link');
  const clear = await page.locator('#clear').evaluate((el) => {
    const style = getComputedStyle(el);
    return [style.color,style.borderTopColor,style.backgroundColor];
  });
  expect(clear).toEqual(['rgb(191, 61, 61)','rgb(191, 61, 61)','rgb(255, 255, 255)']);
  await page.locator('#share').click();
  await expect(page.locator('#save-status')).toContainText('Copy unavailable');
  await expect(page.locator('#share-url')).toHaveValue(/#report=/);
});
test('copies report URL through browser clipboard', async ({page, context, browserName}) => {
  test.skip(browserName !== 'chromium', 'Chromium clipboard permissions');
  await context.grantPermissions(['clipboard-read','clipboard-write']);
  await page.goto('/');
  await page.locator('#share').click();
  await expect(page.locator('#save-status')).toHaveText('Share link copied');
  expect(await page.evaluate(() => navigator.clipboard.readText())).toContain('#report=');
  await expect(page.locator('#share')).toHaveClass(/copied/);
  expect(await page.locator('#share').evaluate((el) => getComputedStyle(el,'::before').backgroundColor)).toBe('rgb(52, 128, 74)');
  await page.locator('#share').screenshot({path:'test-results/copy-share-success.png'});
  await page.locator('[data-card="name"]').fill('Updated');
  await expect(page.locator('#share')).not.toHaveClass(/copied/);
});
