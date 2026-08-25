/**
 * Shared helpers for driving the Summernote component in the browser harness.
 */

/**
 * Open the editor page with optional component parameter overrides.
 * @param {import('@playwright/test').Page} page
 * @param {object} [params] - overrides for the mock Appian parameters
 */
async function openEditor(page, params = {}) {
  const qs = Object.keys(params).length
    ? `?params=${encodeURIComponent(JSON.stringify(params))}`
    : "";
  await page.goto(`/editor/index.html${qs}`);
  await page.waitForFunction(() => window.__harness && window.__harness.ready);
}

/** Focus the editing area (required before paste/insert so a range exists). */
async function focusEditor(page) {
  await page.evaluate(() => {
    window.$("#summernote").summernote("focus");
  });
}

/**
 * Simulate a user paste: dispatch a native ClipboardEvent on the editable area
 * with the given clipboard flavors, exactly as the browser would on Ctrl/Cmd+V.
 * @param {import('@playwright/test').Page} page
 * @param {{html?: string, text?: string}} flavors
 */
async function pasteInto(page, flavors) {
  await focusEditor(page);
  await page.evaluate(({ html, text }) => {
    const editable = document.querySelector(".note-editable");
    const dt = new DataTransfer();
    if (html) dt.setData("text/html", html);
    if (text) dt.setData("text/plain", text);
    const event = new ClipboardEvent("paste", {
      bubbles: true,
      cancelable: true,
      clipboardData: dt,
    });
    editable.dispatchEvent(event);
  }, flavors);
}

/** The editor's current HTML content. */
async function getEditorHtml(page) {
  return page.evaluate(() => window.$("#summernote").summernote("code"));
}

/** The editor's current visible text. */
async function getEditorText(page) {
  return page.evaluate(() => document.querySelector(".note-editable").innerText);
}

/**
 * Blur the editor like a user tabbing away — triggers the component's
 * save-to-Appian (setAppianValue) path — then return the harness state.
 */
async function blurAndGetSaved(page) {
  await page.locator(".note-editable").blur();
  return page.evaluate(() => window.__harness.saved);
}

/** Read the harness state (saved values, validations, client API calls). */
async function getHarness(page) {
  return page.evaluate(() => ({
    saved: window.__harness.saved,
    saveHistory: window.__harness.saveHistory,
    validations: window.__harness.validations,
    clientApiCalls: window.__harness.clientApiCalls,
  }));
}

/**
 * Insert an image the way the toolbar "picture" button / image-file paste does:
 * builds a File from a data URI and hands it to summernote's
 * insertImagesOrCallback, which invokes the component's onImageUpload callback
 * (FileReader -> insertNode -> upload via connected system).
 */
async function insertImageFile(page, dataUri, fileName = "test.png") {
  await focusEditor(page);
  await page.evaluate(
    async ({ dataUri, fileName }) => {
      const res = await fetch(dataUri);
      const blob = await res.blob();
      const file = new File([blob], fileName, { type: blob.type });
      window.$("#summernote").summernote("insertImagesOrCallback", [file]);
    },
    { dataUri, fileName }
  );
}

module.exports = {
  openEditor,
  focusEditor,
  pasteInto,
  getEditorHtml,
  getEditorText,
  blurAndGetSaved,
  getHarness,
  insertImageFile,
};
