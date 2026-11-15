import { expect, test } from "@playwright/test";
test("cold mobile input under throttling", async ({ page, browserName }) => {
  test.skip(browserName !== "chromium", "Chromium CDP throttling");
  await page.setViewportSize({ width: 390, height: 844 });
  const session = await page.context().newCDPSession(page);
  await session.send("Network.enable");
  await session.send("Network.setCacheDisabled", { cacheDisabled: true });
  await session.send("Network.emulateNetworkConditions", {
    offline: false,
    latency: 150,
    downloadThroughput: 200000,
    uploadThroughput: 100000,
  });
  await session.send("Emulation.setCPUThrottlingRate", { rate: 4 });
  await page.addInitScript(() => {
    const metrics = { lcp: 0, cls: 0, eventDuration: 0 };
    (window as unknown as { observedMetrics: typeof metrics }).observedMetrics =
      metrics;
    new PerformanceObserver((list) => {
      for (const e of list.getEntries()) metrics.lcp = e.startTime;
    }).observe({ type: "largest-contentful-paint", buffered: true });
    new PerformanceObserver((list) => {
      for (const e of list.getEntries() as (PerformanceEntry & {
        hadRecentInput: boolean;
        value: number;
      })[])
        if (!e.hadRecentInput) metrics.cls += e.value;
    }).observe({ type: "layout-shift", buffered: true });
    new PerformanceObserver((list) => {
      for (const e of list.getEntries())
        metrics.eventDuration = Math.max(metrics.eventDuration, e.duration);
    }).observe({
      type: "event",
      buffered: true,
      durationThreshold: 16,
    } as PerformanceObserverInit);
  });
  const start = Date.now();
  await page.goto("/decimal/");
  await page.locator(".day").last().locator(".work-fields input").nth(0).fill("9");
  await page.locator(".day").last().locator(".work-fields input").nth(1).fill("10");
  await page.locator(".day").last().locator(".work-fields input").nth(1).blur();
  await expect(page.locator("#daily-report .report-grand-total .report-total td:first-of-type")).toHaveText("1:00");
  const elapsed = Date.now() - start;
  console.log(`Cold mobile effective input ${elapsed}ms`);
  console.log(
    "Auxiliary browser observations",
    await page.evaluate(
      () => (window as unknown as { observedMetrics: unknown }).observedMetrics,
    ),
  );
  expect(elapsed).toBeLessThan(3000);
});
