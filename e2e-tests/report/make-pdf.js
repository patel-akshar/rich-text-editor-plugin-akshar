/**
 * Builds a manager-facing PDF from the latest test run (test-report/results.json,
 * written by report/paste-report.js). Uses Playwright's Chromium print-to-PDF —
 * no extra dependencies.
 *
 *   node report/make-pdf.js   →   test-report/RTE-Test-Report.pdf
 *
 * Layout: executive summary (verdict, totals, environment), results by
 * functional area, detailed per-test results with per-browser status, and a
 * screenshot appendix (one Chromium screenshot per test case).
 */
const fs = require("fs");
const path = require("path");
const { chromium } = require("@playwright/test");
const specDescriptions = require("./spec-descriptions");

const OUT_DIR = path.resolve(__dirname, "..", "test-report");
const RESULTS = path.join(OUT_DIR, "results.json");
const PDF_PATH = path.join(OUT_DIR, "RTE-Test-Report.pdf");

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
};
const BROWSERS = ["chromium", "firefox", "webkit"];
const BROWSER_LABEL = { chromium: "Chrome", firefox: "Firefox", webkit: "Safari" };

function esc(s) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function statusCell(status) {
  if (!status) return '<td class="s skip">—</td>';
  if (status === "passed") return '<td class="s pass">PASS</td>';
  if (status === "skipped") return '<td class="s skip">N/A</td>';
  return '<td class="s fail">FAIL</td>';
}

async function main() {
  if (!fs.existsSync(RESULTS)) {
    console.error("No test-report/results.json — run `npm test` first.");
    process.exit(1);
  }
  const data = JSON.parse(fs.readFileSync(RESULTS, "utf-8"));

  // Group: file -> title -> {project: entry}
  const byFile = new Map();
  for (const e of data.entries) {
    if (!byFile.has(e.file)) byFile.set(e.file, new Map());
    const byTitle = byFile.get(e.file);
    if (!byTitle.has(e.title)) byTitle.set(e.title, {});
    byTitle.get(e.title)[e.project] = e;
  }

  const anyFailed = data.counts.failed > 0;
  const runDate = new Date(data.generated).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  // --- Area summary table ---
  let areaRows = "";
  for (const [file, byTitle] of byFile) {
    const runs = [...byTitle.values()].flatMap((p) => Object.values(p));
    const failed = runs.filter((r) => r.status !== "passed" && r.status !== "skipped").length;
    areaRows += `<tr>
      <td>${esc(AREA_NAMES[file] || file)}</td>
      <td class="num">${byTitle.size}</td>
      <td class="num">${runs.filter((r) => r.status === "passed").length}</td>
      <td class="num">${failed}</td>
      <td class="s ${failed ? "fail" : "pass"}">${failed ? "ATTENTION" : "PASS"}</td>
    </tr>`;
  }

  // --- Detailed sections ---
  let detailSections = "";
  for (const [file, byTitle] of byFile) {
    let rows = "";
    for (const [title, projects] of byTitle) {
      rows += `<tr><td class="t">${esc(title)}</td>${BROWSERS.map((b) =>
        statusCell(projects[b] && projects[b].status)
      ).join("")}</tr>`;
    }
    detailSections += `
    <section class="detail">
      <h3>${esc(AREA_NAMES[file] || file)}</h3>
      <p class="desc">${esc(specDescriptions[file] || "")}</p>
      <table>
        <thead><tr><th>Test case</th>${BROWSERS.map((b) => `<th class="s">${BROWSER_LABEL[b]}</th>`).join("")}</tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </section>`;
  }

  // --- Screenshot appendix (one Chromium screenshot per test case) ---
  let figures = "";
  for (const [file, byTitle] of byFile) {
    for (const [title, projects] of byTitle) {
      const entry = projects["chromium"];
      const shot = entry && entry.screenshots && entry.screenshots[0];
      if (!shot) continue;
      const abs = path.join(OUT_DIR, shot);
      if (!fs.existsSync(abs)) continue;
      const b64 = fs.readFileSync(abs).toString("base64");
      figures += `<figure>
        <img src="data:image/png;base64,${b64}">
        <figcaption><b>${esc(AREA_NAMES[file] || file)}</b> — ${esc(title)}</figcaption>
      </figure>`;
    }
  }

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
    @page { size: letter; margin: 0; }
    body { font-family: -apple-system, "Segoe UI", Roboto, Helvetica, sans-serif; color: #1f2328; margin: 0; font-size: 11px; }
    .page { padding: 48px 56px; }
    h1 { font-size: 26px; margin: 0 0 2px; }
    .sub { color: #57606a; font-size: 13px; margin: 0 0 24px; }
    .verdict { border-radius: 10px; padding: 18px 22px; margin: 18px 0 22px; color: #fff; background: ${anyFailed ? "#cf222e" : "#1a7f37"}; }
    .verdict b { font-size: 18px; display: block; margin-bottom: 4px; }
    .kpis { display: flex; gap: 14px; margin-bottom: 22px; }
    .kpis div { flex: 1; border: 1px solid #d0d7de; border-radius: 8px; padding: 10px 14px; text-align: center; }
    .kpis .n { display: block; font-size: 22px; font-weight: 700; }
    h2 { font-size: 15px; border-bottom: 2px solid #d0d7de; padding-bottom: 4px; margin: 22px 0 10px; }
    h3 { font-size: 13px; margin: 18px 0 4px; }
    .desc { color: #57606a; margin: 2px 0 8px; line-height: 1.45; }
    table { width: 100%; border-collapse: collapse; font-size: 10.5px; }
    th, td { border: 1px solid #d0d7de; padding: 5px 8px; text-align: left; vertical-align: top; }
    th { background: #f6f8fa; }
    td.num, th.num { text-align: right; width: 52px; }
    td.s, th.s { text-align: center; width: 64px; font-weight: 700; }
    td.pass { color: #1a7f37; } td.fail { color: #fff; background: #cf222e; } td.skip { color: #6e7781; font-weight: 400; }
    td.t { width: auto; }
    .detail { break-inside: avoid; }
    .env { color: #57606a; line-height: 1.6; }
    .appendix figure { break-inside: avoid; margin: 0 0 16px; }
    .appendix img { width: 100%; border: 1px solid #d0d7de; border-radius: 4px; }
    .appendix figcaption { font-size: 10px; color: #57606a; margin-top: 3px; }
    .cols { column-count: 2; column-gap: 18px; }
    .pb { break-before: page; }
  </style></head><body>

  <div class="page">
    <h1>Rich Text Editor — Paste Handling Test Report</h1>
    <p class="sub">Appian Summernote component (richTextFieldWithTables) · Automated browser test suite</p>

    <div class="verdict">
      <b>${anyFailed ? `${data.counts.failed} TEST RUN(S) FAILED` : "ALL TESTS PASSED"}</b>
      ${data.counts.passed} of ${data.counts.passed + data.counts.failed} test executions passed across three browsers.
      ${data.counts.skipped ? `${data.counts.skipped} were skipped by design (browser-specific).` : ""}
    </div>

    <div class="kpis">
      <div><span class="n">${runDate}</span>run date</div>
      <div><span class="n">${[...byFile.values()].reduce((a, m) => a + m.size, 0)}</span>test cases</div>
      <div><span class="n">3</span>browsers</div>
      <div><span class="n">${data.totalSec}s</span>run time</div>
    </div>

    <h2>Scope</h2>
    <p class="desc">Each test drives the real, unmodified editor component in a live browser and simulates
    end-user copy/paste from common sources — Microsoft Word, PDF viewers, web pages, Excel, and other
    editor instances — verifying that text, lists, tables, links, formatting and images are retained,
    that unsafe content is neutralized, and that pasting leaves no visual artifacts. Every test case
    runs on Chrome (Chromium), Firefox, and Safari (WebKit) engines.</p>

    <h2>Results by functional area</h2>
    <table>
      <thead><tr><th>Functional area</th><th class="num">Cases</th><th class="num">Passed*</th><th class="num">Failed*</th><th class="s">Result</th></tr></thead>
      <tbody>${areaRows}</tbody>
    </table>
    <p class="env">*Passed/Failed count test executions (each case runs on up to three browsers).</p>

    <h2>Environment</h2>
    <p class="env">
      Test framework: Playwright · Browsers: Chromium, Firefox, WebKit (desktop) ·
      Component under test: cp/richTextFieldWithTables/v1 (unmodified source served with a mocked Appian SDK) ·
      Generated: ${esc(new Date(data.generated).toLocaleString())}
    </p>
  </div>

  <div class="page pb">
    <h2>Detailed results</h2>
    ${detailSections}
  </div>

  <div class="page pb appendix">
    <h2>Appendix — end-of-test screenshots (Chrome)</h2>
    <p class="desc">Final editor state captured at the end of each test case. Screenshots for Firefox and
    Safari are available in the interactive HTML report (test-report/index.html).</p>
    <div class="cols">${figures}</div>
  </div>

  </body></html>`;

  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: "load" });
  await page.pdf({
    path: PDF_PATH,
    format: "Letter",
    printBackground: true,
    displayHeaderFooter: true,
    headerTemplate: "<span></span>",
    footerTemplate:
      '<div style="width:100%;text-align:center;font-size:8px;color:#6e7781;">RTE Paste Handling Test Report — page <span class="pageNumber"></span> of <span class="totalPages"></span></div>',
    margin: { top: "0.4in", bottom: "0.5in", left: "0", right: "0" },
  });
  await browser.close();
  const sizeMb = (fs.statSync(PDF_PATH).size / 1024 / 1024).toFixed(1);
  console.log(`PDF report: ${PDF_PATH} (${sizeMb} MB)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
