import { defineConfig, devices } from "@playwright/test";
import { STORAGE_STATE_PATH } from "./src/lib/const";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false, // Disable parallel execution for e2e tests that modify shared database state
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1, // Use single worker to avoid database conflicts
  reporter: "html",
  use: {
    baseURL: "http://localhost:4321",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        // storageState: STORAGE_STATE_PATH,
      },
    },
  ],
  webServer: {
    command: "NODE_ENV=test npx astro dev --port 4321",
    url: "http://localhost:4321",
    reuseExistingServer: !process.env.CI,
    env: {
      // Use test environment variables for e2e tests
      ...process.env,
      NODE_ENV: "test",
      E2E_TESTING: "true",
    },
    stdout: "pipe", // See server logs
    stderr: "pipe",
  },
});
