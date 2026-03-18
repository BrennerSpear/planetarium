import { defineConfig, devices } from "@playwright/test";

const testServerPort = 43173;
const testServerUrl = `http://127.0.0.1:${testServerPort}`;

export default defineConfig({
  testDir: "./tests",
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: "list",
  use: {
    ...devices["Desktop Chrome"],
    baseURL: testServerUrl,
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
    colorScheme: "dark",
    trace: "on-first-retry",
    launchOptions: {
      args: [
        "--enable-webgl",
        "--ignore-gpu-blocklist",
        "--use-angle=swiftshader-webgl",
        "--enable-unsafe-swiftshader",
      ],
    },
  },
  webServer: {
    command: `bun run dev --host 127.0.0.1 --port ${testServerPort} --strictPort`,
    url: testServerUrl,
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
