/**
 * Full before/after pipeline: runs the suite against the CURRENT component,
 * then against upstream/master's component, preserves both result sets, and
 * renders the comparison PDF.
 *
 *   npm run report:beforeafter        (this script)
 *   node report/make-before-after.js  (render-only, from preserved runs)
 *
 * Safety: refuses to run if cp/richTextFieldWithTables/v1/index.js has
 * uncommitted changes (the upstream pass temporarily overwrites it, restoring
 * it from git afterwards — even if a step fails).
 */
const { execSync, spawnSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const E2E = path.resolve(__dirname, "..");
const REPO = path.resolve(E2E, "..");
const COMPONENT = "cp/richTextFieldWithTables/v1/index.js";

function sh(cmd, opts = {}) {
  const out = execSync(cmd, { cwd: REPO, encoding: "utf-8", ...opts });
  return out === null ? "" : out.trim();
}

function runSuite(label) {
  console.log(`\n=== Running suite against ${label} component ===`);
  // Suite failures are expected on upstream - don't abort on non-zero exit
  const res = spawnSync("npx", ["playwright", "test"], { cwd: E2E, stdio: "inherit" });
  if (res.error) throw res.error;
  const results = path.join(E2E, "test-report", "results.json");
  if (!fs.existsSync(results)) {
    throw new Error(`Suite run against ${label} produced no results.json - aborting.`);
  }
  const counts = JSON.parse(fs.readFileSync(results, "utf-8")).counts;
  console.log(`${label}: ${JSON.stringify(counts)}`);
  return counts;
}

function preserve(name) {
  const src = path.join(E2E, "test-report");
  const dest = path.join(E2E, name);
  fs.rmSync(dest, { recursive: true, force: true });
  fs.cpSync(src, dest, { recursive: true });
}

function main() {
  // Refuse to clobber uncommitted component changes
  if (sh(`git status --porcelain -- ${COMPONENT}`) !== "") {
    console.error(`${COMPONENT} has uncommitted changes - commit or restore them first.`);
    process.exit(1);
  }
  sh("git fetch upstream", { stdio: "ignore" });

  // 1. Current component ("after")
  const forkCounts = runSuite("current (fork)");
  preserve("test-report-fork");

  // 2. Upstream component ("before"), restoring no matter what
  try {
    sh(`git checkout upstream/master -- ${COMPONENT}`);
    runSuite("upstream");
    preserve("test-report-upstream");
  } finally {
    sh(`git checkout HEAD -- ${COMPONENT}`);
    console.log(`\nRestored ${COMPONENT} to the committed version.`);
  }

  if (forkCounts.failed > 0) {
    console.warn(
      `\nWARNING: ${forkCounts.failed} executions fail on the CURRENT component - ` +
        "the 'after' column of the report will show failures."
    );
  }

  // 3. Render the comparison
  const render = spawnSync("node", [path.join(__dirname, "make-before-after.js")], {
    cwd: E2E,
    stdio: "inherit",
  });
  process.exit(render.status || 0);
}

main();
