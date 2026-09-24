/**
 * Custom Playwright reporter that generates a standalone visual test report at
 * test-report/index.html. For every test case it records:
 *   - what the test performs (spec-section description + the test's title)
 *   - pass/fail/skip status per browser, with duration
 *   - the error message when a test failed
 *   - the end-of-test screenshot captured for each browser (screenshot: "on")
 *
 * Screenshots are copied to test-report/screenshots/ and referenced relatively,
 * so the whole test-report/ folder is portable (e.g. as a CI artifact).
 */
const fs = require("fs");
const path = require("path");
const specDescriptions = require("./spec-descriptions");

const OUT_DIR = path.resolve(__dirname, "..", "test-report");
const SHOTS_DIR = path.join(OUT_DIR, "screenshots");

const STATUS_LABEL = { passed: "PASS", failed: "FAIL", timedOut: "FAIL", skipped: "SKIP", interrupted: "FAIL" };
const STATUS_CLASS = { passed: "pass", failed: "fail", timedOut: "fail", skipped: "skip", interrupted: "fail" };

function esc(s) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function safeName(s) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80);
}

class PasteReport {
  constructor() {
    this.entries = [];
    this.startTime = 0;
  }

  onBegin() {
    this.startTime = Date.now();
    fs.rmSync(OUT_DIR, { recursive: true, force: true });
    fs.mkdirSync(SHOTS_DIR, { recursive: true });
  }

  onTestEnd(test, result) {
    // titlePath: ["", project, file, ...describes, title]
    const parts = test.titlePath();
    const project = parts[1] || "default";
    const file = path.basename(parts[2] || "unknown");
    const title = parts.slice(3).join(" › ");

    const screenshots = [];
    for (const a of result.attachments) {
      if (a.name === "screenshot" && a.path && fs.existsSync(a.path)) {
        const dest = `${safeName(file)}--${safeName(title)}--${project}-${screenshots.length}.png`;
        try {
          fs.copyFileSync(a.path, path.join(SHOTS_DIR, dest));
          screenshots.push(`screenshots/${dest}`);
        } catch (e) {
          /* screenshot copy is best-effort */
        }
      }
    }

    this.entries.push({
      project,
      file,
      title,
      status: result.status,
      duration: result.duration,
      error: result.error ? String(result.error.message || result.error).replace(/\u001b\[[0-9;]*m/g, "") : null,
      screenshots,
    });
  }

  onEnd() {
    const byFile = new Map();
    for (const e of this.entries) {
      if (!byFile.has(e.file)) byFile.set(e.file, new Map());
      const byTitle = byFile.get(e.file);
      if (!byTitle.has(e.title)) byTitle.set(e.title, []);
      byTitle.get(e.title).push(e);
    }

    const counts = { passed: 0, failed: 0, skipped: 0 };
    for (const e of this.entries) {
      if (e.status === "passed") counts.passed++;
      else if (e.status === "skipped") counts.skipped++;
      else counts.failed++;
    }
    const totalSec = ((Date.now() - this.startTime) / 1000).toFixed(1);
    const when = new Date().toLocaleString();

    let sections = "";
    for (const [file, byTitle] of byFile) {
      const desc = specDescriptions[file] || "";
      let rows = "";
      for (const [title, runs] of byTitle) {
        runs.sort((a, b) => a.project.localeCompare(b.project));
        const chips = runs
          .map(
            (r) =>
              `<span class="chip ${STATUS_CLASS[r.status] || "fail"}" title="${esc(r.project)}: ${esc(r.status)} in ${r.duration}ms">` +
              `${esc(r.project)} · ${STATUS_LABEL[r.status] || "FAIL"}</span>`
          )
          .join(" ");
        const errors = runs
          .filter((r) => r.error)
          .map((r) => `<pre class="error"><b>${esc(r.project)}:</b> ${esc(r.error.split("\n").slice(0, 6).join("\n"))}</pre>`)
          .join("");
        const shots = runs
          .flatMap((r) => r.screenshots.map((s) => ({ project: r.project, src: s })))
          .map(
            (s) =>
              `<figure><a href="${esc(s.src)}" target="_blank"><img loading="lazy" src="${esc(s.src)}" alt="${esc(title)} (${esc(s.project)})"></a>` +
              `<figcaption>${esc(s.project)}</figcaption></figure>`
          )
          .join("");
        const worst = runs.some((r) => STATUS_CLASS[r.status] === "fail") ? "fail" : runs.every((r) => r.status === "skipped") ? "skip" : "pass";
        rows += `
        <details class="test ${worst}">
          <summary><span class="dot ${worst}"></span><span class="title">${esc(title)}</span><span class="chips">${chips}</span></summary>
          ${errors}
          <div class="shots">${shots || "<p class='none'>No screenshots captured.</p>"}</div>
        </details>`;
      }
      sections += `
      <section>
        <h2>${esc(file)}</h2>
        ${desc ? `<p class="desc">${esc(desc)}</p>` : ""}
        ${rows}
      </section>`;
    }

    const html = `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>RTE Paste Test Report</title>
<style>
  :root { --pass:#1a7f37; --fail:#cf222e; --skip:#6e7781; --border:#d0d7de; --bg:#f6f8fa; }
  body { font-family: -apple-system, "Segoe UI", Roboto, sans-serif; margin: 0 auto; max-width: 1080px; padding: 24px 16px; color: #1f2328; }
  h1 { margin: 0 0 4px; } .meta { color: var(--skip); margin: 0 0 16px; }
  .totals { display: flex; gap: 12px; margin-bottom: 24px; }
  .totals div { border: 1px solid var(--border); border-radius: 8px; padding: 10px 16px; background: var(--bg); font-weight: 600; }
  .totals .n { font-size: 22px; display: block; }
  .t-pass .n { color: var(--pass); } .t-fail .n { color: var(--fail); } .t-skip .n { color: var(--skip); }
  section { margin-bottom: 28px; }
  h2 { border-bottom: 2px solid var(--border); padding-bottom: 6px; margin-bottom: 6px; font-size: 18px; }
  .desc { color: #57606a; margin: 6px 0 12px; font-size: 14px; line-height: 1.5; }
  details.test { border: 1px solid var(--border); border-radius: 8px; margin: 6px 0; background: #fff; }
  details.test.fail { border-color: var(--fail); }
  summary { display: flex; align-items: center; gap: 10px; padding: 10px 12px; cursor: pointer; list-style: none; }
  summary::-webkit-details-marker { display: none; }
  .dot { width: 10px; height: 10px; border-radius: 50%; flex: none; }
  .dot.pass { background: var(--pass); } .dot.fail { background: var(--fail); } .dot.skip { background: var(--skip); }
  .title { flex: 1; font-size: 14px; }
  .chips { display: flex; gap: 6px; flex-wrap: wrap; }
  .chip { font-size: 11px; padding: 2px 8px; border-radius: 999px; border: 1px solid var(--border); white-space: nowrap; }
  .chip.pass { color: var(--pass); border-color: var(--pass); } .chip.fail { color: #fff; background: var(--fail); border-color: var(--fail); }
  .chip.skip { color: var(--skip); }
  .error { margin: 0 12px 10px; padding: 10px; background: #fff1f0; border: 1px solid #ffd7d5; border-radius: 6px; font-size: 12px; overflow-x: auto; white-space: pre-wrap; }
  .shots { display: flex; gap: 12px; flex-wrap: wrap; padding: 0 12px 12px; }
  figure { margin: 0; } figcaption { text-align: center; font-size: 12px; color: var(--skip); margin-top: 4px; }
  .shots img { width: 300px; max-width: 90vw; border: 1px solid var(--border); border-radius: 6px; display: block; }
  .none { color: var(--skip); font-size: 13px; }
</style></head><body>
<h1>RTE Paste Test Report</h1>
<p class="meta">Generated ${esc(when)} · ${esc(totalSec)}s total · Summernote component (richTextFieldWithTables)</p>
<div class="totals">
  <div class="t-pass"><span class="n">${counts.passed}</span>passed</div>
  <div class="t-fail"><span class="n">${counts.failed}</span>failed</div>
  <div class="t-skip"><span class="n">${counts.skipped}</span>skipped</div>
</div>
${sections}
</body></html>`;

    fs.writeFileSync(path.join(OUT_DIR, "index.html"), html);
    // Machine-readable results for downstream formats (report/make-pdf.js)
    fs.writeFileSync(
      path.join(OUT_DIR, "results.json"),
      JSON.stringify({ generated: new Date().toISOString(), totalSec, counts, entries: this.entries }, null, 2)
    );
    console.log(`\nVisual test report: ${path.join(OUT_DIR, "index.html")}`);
  }

  printsToStdio() {
    return false;
  }
}

module.exports = PasteReport;
