/**
 * Image workflows: inserting/uploading images through the connected system,
 * pasting HTML that embeds images, allowImages=false stripping, and the
 * uploadedImages bookkeeping (wasRemovedFromField).
 */
const { test, expect } = require("@playwright/test");
const {
  openEditor,
  pasteInto,
  getEditorHtml,
  getHarness,
  insertImageFile,
  blurAndGetSaved,
} = require("./helpers");
const { TINY_PNG_BASE64 } = require("../fixtures/samples");

test.describe("image manipulation", () => {
  test("inserted image is uploaded via the connected system and its src replaced", async ({
    page,
  }) => {
    await openEditor(page, { allowImages: true });
    await insertImageFile(page, TINY_PNG_BASE64);

    // Wait for the upload round trip: base64 src -> mock document URL
    await page.waitForFunction(() =>
      /https:\/\/mock\.appian\.local\/doc\/\d+/.test(
        window.$("#summernote").summernote("code")
      )
    );

    const harness = await getHarness(page);
    expect(harness.clientApiCalls).toHaveLength(1);
    expect(harness.clientApiCalls[0].apiName).toBe("ImageStorageClientApi");
    expect(harness.clientApiCalls[0].payload.base64).toMatch(/^data:image\/png;base64,/);

    // richText saved out with the document URL, never with base64
    expect(harness.saved.richText).toContain("https://mock.appian.local/doc/1");
    expect(harness.saved.richText).not.toContain("data:image");

    // uploadedImages bookkeeping saved out
    expect(harness.saved.uploadedImages).toEqual([
      expect.objectContaining({
        docId: 1,
        docUrl: "https://mock.appian.local/doc/1",
        wasRemovedFromField: false,
      }),
    ]);

    // No loading spinner left behind
    const html = await getEditorHtml(page);
    expect(html).not.toContain("loading");
  });

  test("deleting an uploaded image marks it wasRemovedFromField on next save", async ({
    page,
  }) => {
    await openEditor(page, { allowImages: true });
    await insertImageFile(page, TINY_PNG_BASE64);
    await page.waitForFunction(() =>
      /mock\.appian\.local\/doc\//.test(window.$("#summernote").summernote("code"))
    );

    // User deletes the image (replace content) then leaves the field
    await page.evaluate(() => {
      window.$("#summernote").summernote("code", "<p>image deleted</p>");
      window.$("#summernote").summernote("focus");
    });
    const saved = await blurAndGetSaved(page);

    expect(saved.richText).toContain("image deleted");
    expect(saved.uploadedImages).toEqual([
      expect.objectContaining({ docId: 1, wasRemovedFromField: true }),
    ]);
  });

  test("richText is never saved while a base64 image is still in the content", async ({
    page,
  }) => {
    await openEditor(page, { allowImages: true });
    // Paste HTML embedding a base64 image (e.g. copied from another RTE) —
    // this path inserts the img without an upload
    await pasteInto(page, {
      html: `<p>with image</p><img src="${TINY_PNG_BASE64}">`,
    });

    const html = await getEditorHtml(page);
    expect(html).toContain("data:image/png");

    const saved = await blurAndGetSaved(page);
    // The save-out is blocked until the base64 image is converted
    expect(saved.richText || "").not.toContain("data:image");
  });

  test("images are stripped on paste when allowImages is false", async ({ page }) => {
    await openEditor(page, { allowImages: false });
    await pasteInto(page, {
      html: `<p>text stays</p><img src="${TINY_PNG_BASE64}">`,
    });

    const html = await getEditorHtml(page);
    expect(html).toContain("text stays");
    expect(html).not.toContain("<img");
  });

  test("external http(s) images in pasted HTML are left to the upload callback (no duplicate insert)", async ({
    page,
  }) => {
    await openEditor(page, { allowImages: true });
    const before = await getEditorHtml(page);
    await pasteInto(page, {
      html: '<p>para</p><img src="https://example.com/pic.png">',
    });

    // Paste handler returns early for external images; content is unchanged
    const after = await getEditorHtml(page);
    expect(after).toBe(before);
  });

  test("connected system failure surfaces a validation message", async ({ page }) => {
    await openEditor(page, { allowImages: true });
    await page.evaluate(() => {
      window.__harness.failNextUpload = true;
    });
    await insertImageFile(page, TINY_PNG_BASE64);

    await page.waitForFunction(() => window.__harness.validations.length > 0);
    const harness = await getHarness(page);
    expect(harness.validations.join(" ")).toContain("Simulated connected system failure");
  });
});
