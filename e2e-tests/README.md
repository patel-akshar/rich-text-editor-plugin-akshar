# RTE E2E Test Suite (fork-only)

Browser-level tests for the Summernote component (`cp/richTextFieldWithTables/v1`)
that replace manual copy/paste testing. The suite runs the **real, unmodified
component source** in Chromium with a mocked Appian SDK.

This directory is committed to the fork but must be kept out of upstream PRs:
the suite lives in its own commit(s) touching only `e2e-tests/`, so branch
upstream PRs from `upstream/master` (not the fork's `master`) and they will
never include it:

```bash
git fetch upstream
git checkout -b my-upstream-fix upstream/master
# cherry-pick or make only the plugin changes here, then PR from this branch
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
- `tests/` — Playwright specs, run on Chromium, Firefox AND WebKit:
  - `rte-to-rte.spec.js` — copy/paste between two editor instances, kitchen-sink
    retention matrix, base64 images (incl. one real-clipboard test using actual
    Cmd/Ctrl+C, Chromium only)
  - `word-paste.spec.js` — Word paragraphs, bullet/numbered lists, hard
    returns, tables, unquoted attributes, hyperlinks, formatting styles,
    embedded file:/// images
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
npx playwright install chromium
```

## Run

```bash
npm test              # headless run
npm run test:headed   # watch the browser
npm run test:debug    # Playwright inspector
npm run report        # open the last HTML report
```

Run a single file: `npx playwright test tests/word-paste.spec.js`

## Adding cases

Drop new clipboard HTML into `fixtures/` (paste real clipboard dumps from Word —
`Get-Clipboard -TextFormatType Html` on Windows or a clipboard inspector on
macOS) and assert on `getEditorHtml` / `blurAndGetSaved` in a new spec.
