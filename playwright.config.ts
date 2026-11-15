import { defineConfig, devices } from "@playwright/test";
const port = Number(process.env.E2E_PORT || 4173);
export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: true,
  // 性能验收使用 CPU 降速，单 worker 避免其他浏览器争用测量资源。
  workers: 1,
  timeout: 30000,
  use: { baseURL: `http://127.0.0.1:${port}`, trace: "on", timezoneId: "Asia/Shanghai" },
  webServer: {
    command: `npm run preview -- --host 127.0.0.1 --port ${port}`,
    url: `http://127.0.0.1:${port}`,
    reuseExistingServer: false,
  },
  projects: [
    { name: "chrome", use: { channel: "chrome", viewport: { width: 1440, height: 900 }, timezoneId: "Asia/Shanghai" } },
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
      },
    },
    {
      name: "webkit",
      use: {
        ...devices["Desktop Safari"],
      },
    },
  ],
});
