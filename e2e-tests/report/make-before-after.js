/**
 * Before/after comparison PDF: the SAME test suite run against the upstream
 * component ("before") and the working branch's component ("after"), compared
 * per test scenario. Purely results-driven — each test's title and its
 * plain-language caption (report/screenshot-captions.js) describe the scenario;
 * no diff analysis and no `claude` CLI involved.
 *
 *   npm run report:beforeafter            runs both suites (isolated worktrees),
 *                                         then renders the PDF
 *   npm run report:beforeafter:render     re-renders from the preserved runs
 *
 * Options:
 *   --before <ref>     component ref for the "before" pass (default: the
 *                      merge-base of upstream/master and the working branch)
 *   --after <ref>      component ref for the "after" pass (default:
 *                      paste-handling-fixes if it exists, else HEAD)
 *   --from-runs <b> <a>  skip running; use two preserved test-report dirs
 *   --out <file>       PDF path (default: test-report/RTE-Before-After-Report.pdf)
 *
 * Fresh runs are preserved to test-report-upstream/ and test-report-fork/.
 */
const fs = require("fs");
const os = require("os");
const path = require("path");
const { chromium } = require("@playwright/test");
const { runIsolated, loadRun, overall, firstError, revParse, git } = require("./make-fixes-md");
const captions = require("./screenshot-captions");
const specDescriptions = require("./spec-descriptions");

const E2E = path.resolve(__dirname, "..");
const REPO = path.resolve(E2E, "..");

const AREA_NAMES = {
  "word-paste.spec.js": "Microsoft Word paste",
  "pdf-paste.spec.js": "PDF paste",
  "web-sources.spec.js": "Web page & Excel paste",
  "rte-to-rte.spec.js": "RTE-to-RTE copy/paste",
  "cursor-position.spec.js": "Paste into existing content",
  "paste-cleanup.spec.js": "Blank-line cleanup on paste",
  "sanitization.spec.js": "Security / paste sanitization",
  "images.spec.js": "Image handling & upload",
  "editor-lifecycle.spec.js": "Editor core behavior",
  "mixed-content.spec.js": "Mixed-content pastes",
  "nested-structures.spec.js": "Nested structures",
  "robustness.spec.js": "Paste robustness",
};

function esc(s) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function badge(status) {
  if (status === "passed") return '<span class="b pass">PASS</span>';
  if (status === "skipped") return '<span class="b skip">N/A</span>';
  if (status === "absent") return '<span class="b skip">—</span>';
  return '<span class="b fail">FAIL</span>';
}

function shotUri(runDir, projects) {
  const e = (projects || {}).chromium || Object.values(projects || {})[0];
  if (!e || !e.screenshots || !e.screenshots.length) return null;
  const p = path.join(runDir, e.screenshots[0]);
  if (!fs.existsSync(p)) return null;
  return "data:image/png;base64," + fs.readFileSync(p).toString("base64");
}

function parseArgs(argv) {
  const o = { fromRuns: null, before: null, after: null, out: null };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--from-runs") o.fromRuns = [argv[++i], argv[++i]];
    else if (argv[i] === "--before") o.before = argv[++i];
    else if (argv[i] === "--after") o.after = argv[++i];
    else if (argv[i] === "--out") o.out = argv[++i];
    else throw new Error(`Unknown option: ${argv[i]}`);
  }
  return o;
}

async function main() {
  const o = parseArgs(process.argv.slice(2));
  const PDF_PATH = o.out
    ? path.resolve(process.cwd(), o.out)
    : path.join(E2E, "test-report", "RTE-Before-After-Report.pdf");

  let beforeDir, afterDir;
  if (o.fromRuns) {
    [beforeDir, afterDir] = o.fromRuns.map((d) => path.resolve(process.cwd(), d));
  } else {
    const afterRef = o.after || (revParse("paste-handling-fixes") ? "paste-handling-fixes" : "HEAD");
    const afterSha = revParse(afterRef);
    const baseSha = revParse(o.before || "upstream/master");
    if (!afterSha || !baseSha) throw new Error("Cannot resolve refs - fetch upstream first?");
    const beforeSha = o.before ? baseSha : git(["merge-base", baseSha, afterSha]);
    const harnessSha = revParse("HEAD");
    const runsRoot = fs.mkdtempSync(path.join(os.tmpdir(), "rte-beforeafter-"));
    beforeDir = await runIsolated("before", harnessSha, beforeSha, runsRoot);
    afterDir = await runIsolated("after", harnessSha, afterSha, runsRoot);
    // Preserve for :render and for inspection
    for (const [src, name] of [[beforeDir, "test-report-upstream"], [afterDir, "test-report-fork"]]) {
      const dest = path.join(E2E, name);
      fs.rmSync(dest, { recursive: true, force: true });
      fs.cpSync(src, dest, { recursive: true });
    }
    beforeDir = path.join(E2E, "test-report-upstream");
    afterDir = path.join(E2E, "test-report-fork");
  }

  const before = loadRun(beforeDir);
  const after = loadRun(afterDir);

  // Classify per unique test title
  const fixed = [], regressed = [], samePass = [], sameFail = [];
  for (const [title, a] of after.byTitle) {
    const b = before.byTitle.get(title) || { projects: {} };
    const sb = overall(b.projects), sa = overall(a.projects);
    const row = { title, file: a.file, b: b.projects, a: a.projects };
    if (sb === "failed" && sa === "passed") fixed.push(row);
    else if (sb !== "failed" && sa === "failed") regressed.push(row);
    else if (sa === "failed") sameFail.push(row);
    else samePass.push(row);
  }

  // --- Fixed-scenario sections, grouped by area, with screenshot pairs ---
  const byArea = new Map();
  for (const r of fixed) {
    if (!byArea.has(r.file)) byArea.set(r.file, []);
    byArea.get(r.file).push(r);
  }
  let fixedSections = "";
  for (const [file, rows] of byArea) {
    let cards = "";
    for (const r of rows) {
      const caption = captions[r.title] || "";
      const bShot = shotUri(beforeDir, r.b);
      const aShot = shotUri(afterDir, r.a);
      const err = firstError(r.b);
      cards += `
        <div class="card">
          <div class="cardtitle">${esc(r.title)} &nbsp; ${badge("failed")} → ${badge("passed")}</div>
          ${caption ? `<p class="cap">${esc(caption)}</p>` : ""}
          ${err ? `<p class="err">Upstream failure: ${esc(err)}</p>` : ""}
          ${bShot && aShot ? `<div class="pair">
            <figure><figcaption>BEFORE (upstream)</figcaption><img src="${bShot}"></figure>
            <figure><figcaption>AFTER (working branch)</figcaption><img src="${aShot}"></figure>
          </div>` : ""}
        </div>`;
    }
    fixedSections += `
      <section>
        <h2>${esc(AREA_NAMES[file] || file)} — ${rows.length} scenario${rows.length > 1 ? "s" : ""} fixed</h2>
        ${specDescriptions[file] ? `<p class="areadesc">${esc(specDescriptions[file])}</p>` : ""}
        ${cards}
      </section>`;
  }

  const regressionBlock = regressed.length
    ? `<section><h2 class="redh">⚠ Regressions — passing upstream, failing on the working branch</h2>
       <table class="t"><thead><tr><th>Test scenario</th></tr></thead><tbody>
       ${regressed.map((r) => `<tr><td>${esc(r.title)}</td></tr>`).join("")}
       </tbody></table></section>`
    : "";

  // --- Appendix: full per-test table ---
  let appendixRows = "";
  for (const [title, a] of after.byTitle) {
    const b = before.byTitle.get(title) || { projects: {} };
    appendixRows += `<tr><td>${esc(AREA_NAMES[a.file] || a.file)}</td><td>${esc(title)}</td>
      <td class="c">${badge(overall(b.projects))}</td><td class="c">${badge(overall(a.projects))}</td></tr>`;
  }

  const u = before.data.counts, f = after.data.counts;
  const runDate = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });

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
    .note.red { background: #fbf0f2; border-color: var(--fail); }
    section { padding: 14px 56px 2px; }
    h2 { font-size: 13pt; border-bottom: 2px solid #e4e4ee; padding-bottom: 4px; }
    h2.redh { color: var(--fail); }
    .areadesc { color: var(--muted); font-size: 9pt; margin-top: -2px; }
    .card { page-break-inside: avoid; margin: 10px 0 16px; }
    .cardtitle { font-weight: 700; font-size: 10pt; }
    .cap { margin: 2px 0 6px; }
    .err { color: var(--fail); font-size: 8.5pt; margin: 0 0 6px; }
    .b { font-weight: 700; font-size: 8.5pt; padding: 1px 8px; border-radius: 9px; color: #fff; }
    .b.pass { background: var(--pass); } .b.fail { background: var(--fail); } .b.skip { background: #999; }
    .pair { display: flex; gap: 12px; margin: 4px 0 8px; }
    .pair figure { flex: 1; margin: 0; }
    .pair img { width: 100%; height: 2.3in; object-fit: cover; object-position: top center; border: 1px solid #ccc; }
    .pair figcaption { font-size: 8pt; color: var(--muted); margin-bottom: 3px; }
    .t { border-collapse: collapse; width: 100%; margin: 8px 0 12px; font-size: 8.5pt; }
    .t th, .t td { border: 1px solid #e0e0ea; padding: 3px 7px; text-align: left; }
    .t th { background: #f4f4fa; }
    .c { text-align: center; width: 64px; }
    @page { margin: 0.5in 0; }
  </style></head><body>
    <div class="cover">
      <h1>Rich Text Editor — Before &amp; After</h1>
      <div class="sub">The identical ${after.byTitle.size}-scenario browser test suite run against the upstream
      component ("before") and the working branch ("after"), on Chrome, Firefox and Safari engines. Generated ${runDate}.</div>
      <div class="kpis">
        <div class="kpi bad"><div class="n">${u.failed}</div><div class="l">executions failing on upstream</div></div>
        <div class="kpi good"><div class="n">${f.failed}</div><div class="l">failing on the working branch (${f.passed} passing)</div></div>
        <div class="kpi good"><div class="n">${fixed.length}</div><div class="l">scenarios fixed (fail → pass)</div></div>
        <div class="kpi ${regressed.length ? "bad" : "good"}"><div class="n">${regressed.length}</div><div class="l">regressions</div></div>
      </div>
      <div class="note ${regressed.length ? "red" : ""}">${
        regressed.length
          ? `${regressed.length} scenario(s) pass on upstream but fail on the working branch — see the regression section.`
          : `${samePass.length} scenarios pass on both versions, confirming existing behavior is preserved. Each fixed scenario below is shown with the upstream failure and the same test passing on the working branch.`
      }</div>
    </div>
    ${regressionBlock}
    ${fixedSections}
    <section>
      <h2>Appendix: every scenario, before and after</h2>
      <table class="t"><thead><tr><th>Area</th><th>Test scenario</th><th>Before</th><th>After</th></tr></thead>
      <tbody>${appendixRows}</tbody></table>
    </section>
  </body></html>`;

  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: "load" });
  await page.pdf({ path: PDF_PATH, format: "Letter", printBackground: true });
  await browser.close();
  const mb = (fs.statSync(PDF_PATH).size / 1024 / 1024).toFixed(1);
  console.log(`Before/After report: ${PDF_PATH} (${mb} MB) — ${fixed.length} fixed, ${regressed.length} regressions`);
  if (regressed.length) process.exitCode = 2;
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
