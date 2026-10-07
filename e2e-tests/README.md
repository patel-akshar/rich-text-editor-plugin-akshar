# RTE E2E Test Suite (fork-only)

Browser-level tests for the Summernote component (`cp/richTextFieldWithTables/v1`)
that replace manual copy/paste testing: 60 test cases run against the **real,
unmodified component source** on Chromium, Firefox, and WebKit (~180 executions,
~30s) with a mocked Appian SDK. They complement the Jest unit suite in
`cp/tests/` (235 tests), which upstream also runs — only the unit tests travel
in upstream PRs; this suite is the fork's own gate.

This directory must be kept out of upstream PRs. The standing two-branch model:

| Branch | Contents |
|---|---|
| `master` | plugin fixes + this suite + fork CI — daily work happens here |
| `paste-handling-fixes` | plugin fixes only, cut from `upstream/master` — the PR branch |

Plugin changes are made on `paste-handling-fixes` (or cherry-picked onto it),
then merged into `master` and verified with this suite before pushing:

```bash
git checkout paste-handling-fixes   # plugin work happens here
# ...edit cp/, commit, push...
git checkout master && git merge paste-handling-fixes
cd e2e-tests && npm test            # regression gate
git push origin master
```

## How it works

- `server.js` — serves `cp/richTextFieldWithTables/v1` at `http://localhost:4173/editor/`,
  rewriting the `APPIAN_JS_SDK_URI` placeholder in `index.html` to the mock SDK.
- `harness/appian-mock.js` — mock `window.Appian` (onNewValue, saveValue,
  setValidations, invokeClientApi image upload, aria helpers). Exposes
  `window.__harness` so tests can override parameters and inspect everything
  saved back to "Appian".
- `fixtures/` — realistic clipboard HTML for MS Word (mso styles, supportLists
  conditionals, hard returns, tables, hyperlinks, embedded images), PDF viewers
  (plain text), web pages, and Excel; hostile payloads; base64
  images.
- `report/` — the custom reporter (`paste-report.js`) that builds the visual
  test report, its spec descriptions (`spec-descriptions.js`), and the PDF
  builder (`make-pdf.js`).
- `tests/` — Playwright specs, run on Chromium, Firefox AND WebKit:
  - `rte-to-rte.spec.js` — copy/paste between two editor instances, kitchen-sink
    retention matrix, base64 images (incl. one real-clipboard test using actual
    Cmd/Ctrl+C, Chromium only)
  - `word-paste.spec.js` — Word paragraphs, bullet/numbered lists, hard
    returns, the original source-newlines-between-spans regression, tables,
    unquoted attributes, hyperlinks, formatting styles, embedded file:/// images
  - `pdf-paste.spec.js` — plain-text PDF copies: paragraphs, bullet glyphs,
    hard-wrapped lines, URLs, typographic characters
  - `web-sources.spec.js` — web-page articles and Excel tables
  - `cursor-position.spec.js` — pastes into EXISTING content: mid-paragraph,
    list items, table cells, replacing a selection
  - `paste-cleanup.spec.js` — Enter-then-paste and repeated-paste empty
    paragraph cleanup; user-created blanks preserved
  - `sanitization.spec.js` — scripts, event handlers, iframes, `javascript:`
    links, style tags
  - `images.spec.js` — upload via connected system, src replacement, multiple
    images, uploadedImages bookkeeping, allowImages=false, upload failures
  - `editor-lifecycle.spec.js` — typing, readOnly, SAIL re-renders, maxSize
    validation (typed and pasted), undo after paste, link creation, toolbar
    formatting

Pastes are dispatched as native `ClipboardEvent`s with real `DataTransfer`
flavors (`text/html` / `text/plain`) on the editable area — exactly what the
browser fires on Ctrl/Cmd+V — so the component's `summernote.paste` handler,
`cleanHtml`, and insert logic all run for real.

## Visual test report

Every run generates a standalone report at `test-report/index.html` (via the
custom reporter in `report/paste-report.js`). For each test case it shows:
what the test performs (spec-section description + test title), pass/fail/skip
status per browser with duration, the error message on failure, and the
end-of-test screenshot from each browser. Open it with:

```bash
open test-report/index.html
```

The `test-report/` folder is self-contained (screenshots referenced
relatively), gitignored, and uploaded as a CI artifact on every Actions run.
Spec-section descriptions live in `report/spec-descriptions.js` — add an entry
there when adding a new spec file.

For a shareable, manager-facing document, build the PDF version after a run:

```bash
npm run report:pdf     # → test-report/RTE-Test-Report.pdf
```

It contains an executive summary (verdict, totals, environment), results by
functional area, detailed per-test results with per-browser status, and a
screenshot appendix. CI builds it automatically on every run.

## CI

The suite runs automatically in GitHub Actions on every push to the fork's
`master` that touches `cp/` or `e2e-tests/` (see `.github/workflows/e2e.yml`,
which — like this directory — exists only on `master` and never rides into
upstream PRs). Upstream's own CI runs only the Jest unit suite; the browser
tests are this fork's additional gate.

## Setup (one time)

```bash
cd e2e-tests
npm install
npx playwright install chromium firefox webkit
```

## Run

```bash
npm test              # headless run, all 3 browsers (also builds test-report/)
npm run test:headed   # watch the browser
npm run test:debug    # Playwright inspector
npm run report        # open Playwright's own HTML report
npm run report:pdf    # build the manager-facing PDF from the last run
```

Single browser: `npx playwright test --project=chromium`

Run a single file: `npx playwright test tests/word-paste.spec.js`

## Adding cases

Drop new clipboard HTML into `fixtures/` (paste real clipboard dumps from Word —
`Get-Clipboard -TextFormatType Html` on Windows or a clipboard inspector on
macOS) and assert on `getEditorHtml` / `blurAndGetSaved` in a new spec.

## Pre-PR evidence: FIXES.md

Before opening an upstream PR, regenerate `FIXES.md` (repo root) from scratch:

```bash
npm run report:fixes         # both suites + diff analysis -> FIXES.md, docs/fixes/
npm run report:beforeafter   # same, plus the PDF report
```

No manual mapping is needed. The pipeline:

1. Runs the suite against upstream's `cp/` and your branch's `cp/` (default branch `paste-handling-fixes`),
   each in a throwaway git worktree on its own port, so your working tree is never touched.
2. Sends the `cp/` diff, the tests that changed outcome (with upstream's failure messages) and the commit
   messages to Claude via the headless `claude` CLI. Claude identifies each fix *from the code* and explains
   the problem, root cause and change, and assigns the fail→pass tests that prove it.
3. Checks that answer against the real results, then writes `FIXES.md` with a before/after test table and
   screenshot pair per fix. Regressions and fail→pass tests no fix explains are flagged at the top.
   The analysis is saved to `docs/fixes/analysis.json`.

On a machine without the `claude` CLI (or to keep the reviewed explanations unchanged), run the suites
fresh but reuse the committed analysis:

```bash
npm run report:beforeafter:noclaude
```

This re-validates the saved fix groupings against the fresh results — drift (a fix's tests no longer
failing upstream, or new unattributed fixes) is flagged at the top of FIXES.md.

Requires the `claude` CLI to be installed and logged in. The explanations are regenerated on every run, so
review `FIXES.md` before pasting it. To re-render without a new analysis or new runs, use
`-- --analysis ../docs/fixes/analysis.json --from-runs <before-dir> <after-dir>`.

Image links point at `raw.githubusercontent.com/.../master/docs/fixes/`, so commit `FIXES.md` + `docs/fixes/`
to **master** and push before pasting `FIXES.md` into the PR description. Neither belongs on the PR branch.
Other PRs: `-- --head <branch> --title "<heading>"`.
