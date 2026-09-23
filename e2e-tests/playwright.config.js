const { defineConfig } = require("@playwright/test");

module.exports = defineConfig({
  testDir: "./tests",
  timeout: 30000,
  fullyParallel: true,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: "http://localhost:4173",
    trace: "retain-on-failure",
  },
  webServer: {
    command: "node server.js",
    port: 4173,
    reuseExistingServer: true,
  },
  projects: [
    {
      name: "chromium",
      use: {
        browserName: "chromium",
        // Needed for the real-clipboard RTE-to-RTE test (Chromium-only API)
        permissions: ["clipboard-read", "clipboard-write"],
      },
    },
    { name: "firefox", use: { browserName: "firefox" } },
    { name: "webkit", use: { browserName: "webkit" } },
  ],
});
