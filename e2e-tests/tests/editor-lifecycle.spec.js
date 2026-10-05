/**
 * Core editor behavior: typing, initial SAIL value, readOnly mode, and
 * maxSize validation — the surrounding plumbing the paste/image flows rely on.
 */
const { test, expect } = require("@playwright/test");
const {
  openEditor,
  pasteInto,
  getEditorHtml,
  getEditorText,
  blurAndGetSaved,
  getHarness,
} = require("./helpers");
const { TINY_PNG_BASE64 } = require("../fixtures/samples");

test.describe("editor lifecycle", () => {
  test("initial richText from Appian renders in the editor", async ({ page }) => {
    await openEditor(page, { richText: "<p>Initial <b>value</b> from SAIL</p>" });
    const text = await getEditorText(page);
    expect(text).toContain("Initial value from SAIL");
  });

  test("typed text is saved back to Appian on blur", async ({ page }) => {
    await openEditor(page);
    await page.locator(".note-editable").click();
    await page.keyboard.type("Hello from a real keyboard");

    const saved = await blurAndGetSaved(page);
    expect(saved.richText).toContain("Hello from a real keyboard");
  });

  test("readOnly mode renders content without an editable surface", async ({ page }) => {
    await openEditor(page, {
      readOnly: true,
      richText: "<p>read only content</p>",
    });
    await expect(page.locator(".note-editable")).toHaveCount(0);
    await expect(page.locator("#summernote")).toContainText("read only content");
  });

  test("flipping readOnly -> editable rebuilds the editor (SAIL re-render)", async ({
    page,
  }) => {
    await openEditor(page, { readOnly: true, richText: "<p>start locked</p>" });
    await expect(page.locator(".note-editable")).toHaveCount(0);

    await page.evaluate(() => window.__harness.applyParams({ readOnly: false }));
    await expect(page.locator(".note-editable")).toHaveCount(1);
    expect(await getEditorText(page)).toContain("start locked");
  });

  test("content over maxSize triggers a validation and blocks the save", async ({ page }) => {
    await openEditor(page, { maxSize: 50 });
    await page.locator(".note-editable").click();
    await page.keyboard.type("x".repeat(80));
    await page.locator(".note-editable").blur();

    const harness = await getHarness(page);
    expect(harness.validations.length).toBeGreaterThan(0);
    expect(harness.saved.richText).toBeUndefined();
  });

  test("pasting content over maxSize triggers a validation and blocks the save", async ({
    page,
  }) => {
    await openEditor(page, { maxSize: 100 });
    const bigParagraphs = Array.from(
      { length: 10 },
      (_, i) => `<p>Paragraph number ${i} with enough words to overflow the limit.</p>`
    ).join("");
    await pasteInto(page, { html: bigParagraphs });
    await page.locator(".note-editable").blur();

    const harness = await getHarness(page);
    expect(harness.validations.length).toBeGreaterThan(0);
    expect(harness.saved.richText).toBeUndefined();
  });

  test("maxSize validation does not flash while an image uploads", async ({ page }) => {
    // During an upload the image sits in the editor as a huge base64 data URI,
    // far over any realistic maxSize - but base64 is never what gets saved
    // (the connected system swaps in a short document URL). The size check
    // must ignore the transient base64 payload, or the "content too big"
    // error appears on every image paste and vanishes seconds later.
    await openEditor(page, { maxSize: 300, allowImages: true });
    // Slow the mock upload down well past the component's 500ms change
    // debounce, so validate() runs while the base64 is still in the editor
    await page.evaluate(() => {
      window.__harness.uploadDelayMs = 1500;
    });
    // A realistic image: its base64 alone far exceeds maxSize (a tiny
    // fixture PNG would fit under the limit and prove nothing)
    const bigImageDataUri = await page.evaluate(() => {
      const canvas = document.createElement("canvas");
      canvas.width = 200;
      canvas.height = 200;
      const ctx = canvas.getContext("2d");
      for (let i = 0; i < 200; i += 10) {
        ctx.fillStyle = `rgb(${i}, ${255 - i}, 128)`;
        ctx.fillRect(i, 0, 10, 200);
      }
      return canvas.toDataURL("image/png");
    });
    expect(bigImageDataUri.length).toBeGreaterThan(300);
    await page.locator(".note-editable").click();
    await pasteInto(page, { imageDataUri: bigImageDataUri }, { preserveSelection: true });

    // Race: resolve on EITHER a validation appearing (the flash) or the
    // upload completing. The flash fires at the ~500ms debounce, well before
    // the 1500ms upload, so sampling only before/after would miss it.
    await page.waitForFunction(
      () =>
        window.__harness.validations.length > 0 ||
        /mock\.appian\.local\/doc\//.test(window.$("#summernote").summernote("code"))
    );

    const outcome = await page.evaluate(() => ({
      validations: window.__harness.validations,
      uploaded: /mock\.appian\.local\/doc\//.test(window.$("#summernote").summernote("code")),
    }));
    expect(outcome.validations).toEqual([]);
    expect(outcome.uploaded).toBe(true);
  });

  test("typed text over maxSize still validates while an image is uploading", async ({
    page,
  }) => {
    // The base64 exclusion must not blind the size check to REAL oversize
    // content present at the same time
    await openEditor(page, { maxSize: 50, allowImages: true });
    await page.evaluate(() => {
      window.__harness.uploadDelayMs = 700;
    });
    await page.locator(".note-editable").click();
    await page.keyboard.type("x".repeat(80));
    await pasteInto(page, { imageDataUri: TINY_PNG_BASE64 });
    await page.locator(".note-editable").blur();

    const harness = await getHarness(page);
    expect(harness.validations.length).toBeGreaterThan(0);
  });

  test("undo after paste never corrupts pre-paste content", async ({ page }) => {
    // KNOWN LIMITATION: whether undo reverts a paste is unreliable in every
    // engine — the custom insertNode-based paste path does not deterministically
    // create a Summernote history snapshot (Chromium sometimes reverts,
    // Firefox/WebKit never do, and Chromium's behavior varies with timing).
    // The guarantee this test pins is the safety property: undo after a paste
    // must never corrupt or lose the content that existed before the paste.
    await openEditor(page, { richText: "<p>original</p>" });
    await page.locator(".note-editable").click();
    await pasteInto(page, { html: "<p>pasted addition</p>" });
    expect(await getEditorText(page)).toContain("pasted addition");

    await page.evaluate(() => window.$("#summernote").summernote("undo"));

    expect(await getEditorText(page)).toContain("original");
  });

  test("link creation: scheme-less URLs get https://, emails get mailto", async ({ page }) => {
    await openEditor(page);
    await page.locator(".note-editable").click();
    await page.evaluate(() => {
      window
        .$("#summernote")
        .summernote("createLink", { text: "the site", url: "example.com", isNewWindow: true });
    });

    let html = await getEditorHtml(page);
    expect(html).toContain('href="https://example.com"');

    await page.evaluate(() => {
      window
        .$("#summernote")
        .summernote("createLink", { text: "mail us", url: "team@example.com", isNewWindow: true });
    });
    html = await getEditorHtml(page);
    expect(html).toMatch(/href="mailto:\/{0,2}team@example\.com"/);
  });

  test("toolbar formatting: bold button produces bold saved output", async ({ page }) => {
    await openEditor(page);
    await page.locator(".note-editable").click();
    await page.keyboard.press("ControlOrMeta+b");
    await page.keyboard.type("emphasized");

    const saved = await blurAndGetSaved(page);
    expect(saved.richText).toMatch(/<(b|strong)>emphasized<\/(b|strong)>/);
  });
});
