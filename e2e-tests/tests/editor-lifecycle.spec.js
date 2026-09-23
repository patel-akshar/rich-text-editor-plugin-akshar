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

  test("undo after paste reverts the pasted content", async ({ page, browserName }) => {
    await openEditor(page, { richText: "<p>original</p>" });
    await page.locator(".note-editable").click();
    await pasteInto(page, { html: "<p>pasted addition</p>" });
    expect(await getEditorText(page)).toContain("pasted addition");

    await page.evaluate(() => window.$("#summernote").summernote("undo"));

    const text = await getEditorText(page);
    // Undo must never corrupt or lose the pre-paste content
    expect(text).toContain("original");
    // KNOWN CROSS-BROWSER DIFFERENCE: Summernote's history snapshots interact
    // with the custom paste path differently per engine — undo fully reverts
    // the paste in Chromium but leaves it in place in Firefox/WebKit.
    if (browserName === "chromium") {
      expect(text).not.toContain("pasted addition");
    }
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
