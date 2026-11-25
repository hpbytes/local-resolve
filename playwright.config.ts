import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "tests",
  timeout: 120000,
  use: {
    actionTimeout: 15000,
    baseURL: "http://127.0.0.1:4173",
    channel: "msedge",
    viewport: { width: 1440, height: 900 },
  },
  webServer: {
    command: "npm run preview -- --host 127.0.0.1 --port 4173",
    url: "http://127.0.0.1:4173",
    reuseExistingServer: true,
  },
});
