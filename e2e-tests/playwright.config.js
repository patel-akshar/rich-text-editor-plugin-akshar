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
    // Compact viewport so report screenshots are content-dense: the editor
    // fills the frame instead of floating in a 1280x720 sea of whitespace.
    // Tests locate elements by role/selector, never by coordinates, so the
    // viewport size does not affect test behavior.
    viewport: { width: 860, height: 520 },
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
    {
      name: "firefox",
      use: {
        browserName: "firefox",
        launchOptions: {
          firefoxUserPrefs: {
            // Firefox only delivers focus/blur events when its window has
            // OS-level focus; with parallel workers on Windows the windows
            // fight over focus, so keyboard.type and blur-triggered saves
            // silently do nothing. This pref makes Firefox treat its windows
            // as always focused (the standard Playwright remedy).
            "focusmanager.testmode": true,
          },
        },
      },
    },
    { name: "webkit", use: { browserName: "webkit" } },
  ],
});
