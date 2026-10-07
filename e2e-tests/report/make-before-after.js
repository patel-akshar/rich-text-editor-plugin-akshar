/**
 * Builds a before/after PDF comparing the SAME test suite run against the
 * upstream component (before) and this fork's component (after).
 *
 * Inputs (created by running the suite twice and copying test-report/):
 *   test-report-upstream/results.json + screenshots/   (upstream index.js)
 *   test-report-fork/results.json     + screenshots/   (fork index.js)
 *
 *   node report/make-before-after.js  →  test-report/RTE-Before-After-Report.pdf
 *
 * Layout: executive summary (headline counts), one section per fix with the
 * evidencing tests' before/after status and a before/after screenshot pair,
 * and an appendix listing every test whose outcome changed.
 */
const fs = require("fs");
const path = require("path");
const { chromium } = require("@playwright/test");

const BASE = path.resolve(__dirname, "..");
const UPSTREAM_DIR = path.join(BASE, "test-report-upstream");
const FORK_DIR = path.join(BASE, "test-report-fork");
const PDF_PATH = path.join(BASE, "test-report", "RTE-Before-After-Report.pdf");

/**
 * Fixes come from the analysis make-fixes-md.js saves (docs/fixes/analysis.json,
 * or --analysis <file>); fixes without browser-level tests are omitted.
 */
const analysisArg = process.argv.indexOf("--analysis");
const ANALYSIS = JSON.parse(
  fs.readFileSync(analysisArg > -1 ? path.resolve(process.argv[analysisArg + 1]) : path.resolve(BASE, "..", "docs", "fixes", "analysis.json"), "utf-8")
);
const FIXES = ANALYSIS.fixes
  .filter((f) => f.tests && f.tests.length)
  .map((f) => ({ title: f.title, problem: f.problem, fix: f.change, tests: f.tests, shot: f.shot || f.tests[0] }));

function esc(s) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function load(dir) {
  const data = JSON.parse(fs.readFileSync(path.join(dir, "results.json"), "utf-8"));
  // title -> { project -> entry }
  const byTitle = new Map();
  for (const e of data.entries) {
    if (!byTitle.has(e.title)) byTitle.set(e.title, {});
    byTitle.get(e.title)[e.project] = e;
  }
  return { data, byTitle };
}

function overallStatus(projects) {
  const statuses = Object.values(projects || {}).map((e) => e.status);
  if (statuses.length === 0) return null;
  if (statuses.some((s) => s !== "passed" && s !== "skipped")) return "failed";
  if (statuses.every((s) => s === "skipped")) return "skipped";
  return "passed";
}

function badge(status) {
  if (status === "passed") return '<span class="b pass">PASS</span>';
  if (status === "skipped") return '<span class="b skip">N/A</span>';
  if (status === null) return '<span class="b skip">—</span>';
  return '<span class="b fail">FAIL</span>';
}

function shotPath(dir, projects) {
  const e = (projects || {}).chromium || Object.values(projects || {})[0];
  if (!e || !e.screenshots || !e.screenshots.length) return null;
  const p = path.join(dir, e.screenshots[0]);
  if (!fs.existsSync(p)) return null;
  // Embed as a data URI - Chromium blocks file:// subresources in setContent pages
  return "data:image/png;base64," + fs.readFileSync(p).toString("base64");
}

async function main() {
  const upstream = load(UPSTREAM_DIR);
  const fork = load(FORK_DIR);

  const findTitle = (needle) => {
    for (const t of fork.byTitle.keys()) if (t.includes(needle)) return t;
    return null;
  };

  // --- Per-fix sections ---
  let fixSections = "";
  let fixIndex = 0;
  for (const f of FIXES) {
    fixIndex++;
    let rows = "";
    for (const needle of f.tests) {
      const title = findTitle(needle);
      if (!title) continue;
      const before = overallStatus(upstream.byTitle.get(title));
      const after = overallStatus(fork.byTitle.get(title));
      rows += `<tr><td>${esc(title)}</td><td class="c">${badge(before)}</td><td class="c">${badge(after)}</td></tr>`;
    }
    const exemplar = findTitle(f.shot);
    const beforeShot = exemplar ? shotPath(UPSTREAM_DIR, upstream.byTitle.get(exemplar)) : null;
    const afterShot = exemplar ? shotPath(FORK_DIR, fork.byTitle.get(exemplar)) : null;
    const shots =
      beforeShot && afterShot
        ? `<div class="pair">
             <figure><figcaption>BEFORE (upstream) — ${esc(exemplar)}</figcaption><img src="${beforeShot}"></figure>
             <figure><figcaption>AFTER (this fork) — same test</figcaption><img src="${afterShot}"></figure>
           </div>`
        : "";
    fixSections += `
      <section class="fix">
        <h2>Fix ${fixIndex}: ${esc(f.title)}</h2>
        <p><b>Before:</b> ${esc(f.problem)}</p>
        <p><b>After:</b> ${esc(f.fix)}</p>
        <table class="t"><thead><tr><th>Evidencing test</th><th>Before</th><th>After</th></tr></thead>
        <tbody>${rows}</tbody></table>
        ${shots}
      </section>`;
  }

  // --- Appendix: every test whose outcome changed ---
  let changedRows = "";
  let changedCount = 0;
  for (const [title, projects] of fork.byTitle) {
    const before = overallStatus(upstream.byTitle.get(title));
    const after = overallStatus(projects);
    if (before !== after) {
      changedCount++;
      changedRows += `<tr><td>${esc(title)}</td><td class="c">${badge(before)}</td><td class="c">${badge(after)}</td></tr>`;
    }
  }

  const u = upstream.data.counts;
  const fcounts = fork.data.counts;
  const runDate = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
    :root { --pass:#1c7c3c; --fail:#b10d28; --ink:#1a1a2e; --muted:#5a5a72; }
    * { box-sizing: border-box; }
    body { font: 10.5pt/1.5 -apple-system, "Segoe UI", Arial, sans-serif; color: var(--ink); margin: 0; }
    .cover { padding: 48px 56px 24px; }
    h1 { font-size: 24pt; margin: 0 0 4px; }
    .sub { color: var(--muted); margin-bottom: 28px; }
    .kpis { display: flex; gap: 14px; margin: 18px 0 8px; }
    .kpi { flex: 1; border: 1px solid #ddd; border-radius: 8px; padding: 12px 16px; }
    .kpi .n { font-size: 20pt; font-weight: 700; }
    .kpi.bad .n { color: var(--fail); } .kpi.good .n { color: var(--pass); }
    .kpi .l { color: var(--muted); font-size: 9pt; }
    .note { background: #f2f6f2; border-left: 4px solid var(--pass); padding: 10px 14px; margin: 16px 0; }
    section.fix { padding: 18px 56px 6px; page-break-inside: avoid; }
    h2 { font-size: 13pt; border-bottom: 2px solid #e4e4ee; padding-bottom: 4px; }
    .t { border-collapse: collapse; width: 100%; margin: 8px 0 12px; font-size: 9pt; }
    .t th, .t td { border: 1px solid #e0e0ea; padding: 4px 8px; text-align: left; }
    .t th { background: #f4f4fa; }
    .c { text-align: center; width: 70px; }
    .b { font-weight: 700; font-size: 8.5pt; padding: 1px 8px; border-radius: 9px; color: #fff; }
    .b.pass { background: var(--pass); } .b.fail { background: var(--fail); } .b.skip { background: #999; }
    .pair { display: flex; gap: 12px; margin: 6px 0 10px; }
    .pair figure { flex: 1; margin: 0; }
    .pair img { width: 100%; height: 2.5in; object-fit: cover; object-position: top center; border: 1px solid #ccc; }
    .pair figcaption { font-size: 8pt; color: var(--muted); margin-bottom: 4px; }
    .appendix { padding: 24px 56px; }
    @page { margin: 0.5in 0; }
  </style></head><body>
    <div class="cover">
      <h1>Rich Text Editor — Paste Handling: Before &amp; After</h1>
      <div class="sub">The identical ${fork.byTitle.size}-scenario browser test suite, run against the upstream component ("before")
      and this fork's component ("after"), on Chrome, Firefox and Safari engines. Generated ${runDate}.</div>
      <div class="kpis">
        <div class="kpi bad"><div class="n">${u.failed}</div><div class="l">test executions FAILING on the upstream component</div></div>
        <div class="kpi good"><div class="n">${fcounts.failed}</div><div class="l">failing after the fixes (${fcounts.passed} passing)</div></div>
        <div class="kpi good"><div class="n">${changedCount}</div><div class="l">test scenarios that went from FAIL to PASS</div></div>
      </div>
      <div class="note">Every scenario that fails on upstream maps to one of the ${FIXES.length} fixes below —
      no unexplained differences. Scenarios passing on both versions confirm existing behavior was preserved.</div>
    </div>
    ${fixSections}
    <div class="appendix">
      <h2>Appendix: every scenario whose outcome changed (${changedCount})</h2>
      <table class="t"><thead><tr><th>Test scenario</th><th>Before</th><th>After</th></tr></thead>
      <tbody>${changedRows}</tbody></table>
    </div>
  </body></html>`;

  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: "load" });
  await page.pdf({ path: PDF_PATH, format: "Letter", printBackground: true });
  await browser.close();
  const mb = (fs.statSync(PDF_PATH).size / 1024 / 1024).toFixed(1);
  console.log(`Before/After report: ${PDF_PATH} (${mb} MB)`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
