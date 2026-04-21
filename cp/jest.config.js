module.exports = {
  testEnvironment: "jsdom",
  testMatch: ["**/tests/**/*.test.js"],
  setupFiles: ["./tests/helpers/setupGlobals.js"],
  transform: {
    // Use our custom transform for the source index.js files
    "richTextField/v1/index\\.js$": "./tests/helpers/browserScriptTransform.js",
    "richTextFieldWithTables/v1/index\\.js$":
      "./tests/helpers/browserScriptTransform.js",
  },
  // Don't transform node_modules, but DO transform our source files
  transformIgnorePatterns: ["/node_modules/"],
  collectCoverageFrom: [
    "richTextField/v1/index.js",
    "richTextFieldWithTables/v1/index.js",
  ],
  coverageDirectory: "coverage",
  coverageReporters: ["text", "lcov", "clover"],
};
