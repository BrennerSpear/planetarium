import { defineConfig } from "@playwright/test";

const PLAYWRIGHT_PORT = 4288;

export default defineConfig({
  testDir: "./tests",
  testMatch: "**/*.spec.ts",
  fullyParallel: false,
  retries: 0,
  timeout: 30_000,
  use: {
    baseURL: `http://127.0.0.1:${PLAYWRIGHT_PORT}`,
    launchOptions: {
      args: [
        "--use-gl=angle",
        "--use-angle=swiftshader",
        "--enable-unsafe-swiftshader",
      ],
    },
    trace: "on-first-retry",
    viewport: {
      width: 1440,
      height: 960,
    },
  },
  webServer: {
    command: `bunx vite --host 127.0.0.1 --port ${PLAYWRIGHT_PORT}`,
    reuseExistingServer: false,
    timeout: 120_000,
    url: `http://127.0.0.1:${PLAYWRIGHT_PORT}/?test=1`,
  },
});
