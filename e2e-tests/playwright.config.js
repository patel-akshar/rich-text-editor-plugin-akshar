const { defineConfig } = require("@playwright/test");

module.exports = defineConfig({
  testDir: "./tests",
  timeout: 30000,
  fullyParallel: true,
  reporter: [["list"], ["html", { open: "never" }], ["./report/paste-report.js"]],
  use: {
    baseURL: "http://localhost:4173",
    trace: "retain-on-failure",
    // Capture a final screenshot for EVERY test (pass or fail) — consumed by
    // the paste-report reporter to build the visual test report
    screenshot: "on",
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
