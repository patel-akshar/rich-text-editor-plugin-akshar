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

  test("base64 image in pasted HTML: save waits for the upload, then goes through", async ({
    page,
  }) => {
    // An image embedded in clipboard HTML as a data: URI (modern Word) never
    // fires onImageUpload. The paste handler uploads it itself; until the doc
    // URL comes back the save is withheld (base64 must never reach Appian),
    // then the content saves with the URL. Before the fix this paste rendered
    // but silently never saved.
    await openEditor(page, { allowImages: true });
    await page.evaluate(() => {
      window.__harness.uploadDelayMs = 1500;
    });
    await pasteInto(page, {
      html: `<p>with image</p><img src="${TINY_PNG_BASE64}">`,
    });

    // Mid-upload: base64 renders in the editor, but a blur must not save it
    const htmlDuring = await getEditorHtml(page);
    expect(htmlDuring).toContain("data:image/png");
    const savedDuring = await blurAndGetSaved(page);
    expect(savedDuring.richText || "").not.toContain("data:image");

    // Upload completes: content saves with the document URL
    await page.waitForFunction(() =>
      /mock\.appian\.local\/doc\//.test(window.$("#summernote").summernote("code"))
    );
    await page.waitForFunction(() => !!window.__harness.saved.richText);
    const harness = await getHarness(page);
    expect(harness.saved.richText).toContain("with image");
    expect(harness.saved.richText).toContain("https://mock.appian.local/doc/1");
    expect(harness.saved.richText).not.toContain("data:image");
    expect(harness.clientApiCalls).toHaveLength(1);
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

  test("http(s) image in pasted HTML survives paste-time cleaning", async ({ page }) => {
    await openEditor(page, { allowImages: true });
    await pasteInto(page, {
      html: '<p>caption</p><img src="https://cdn.example.com/pic.png">',
    });

    const html = await getEditorHtml(page);
    expect(html).toContain("caption");
    expect(html).toContain('src="https://cdn.example.com/pic.png"');
  });

  test("multiple images inserted together are each uploaded and replaced", async ({ page }) => {
    await openEditor(page, { allowImages: true });
    await page.evaluate(async (dataUri) => {
      const res = await fetch(dataUri);
      const blob = await res.blob();
      const files = [
        new File([blob], "one.png", { type: blob.type }),
        new File([blob], "two.png", { type: blob.type }),
      ];
      window.$("#summernote").summernote("focus");
      window.$("#summernote").summernote("insertImagesOrCallback", files);
    }, TINY_PNG_BASE64);

    // Both uploads round-trip: two mock document URLs in the editor
    await page.waitForFunction(
      () =>
        (window.$("#summernote").summernote("code").match(/mock\.appian\.local\/doc\//g) || [])
          .length === 2
    );

    const harness = await getHarness(page);
    expect(harness.clientApiCalls).toHaveLength(2);
    expect(harness.saved.uploadedImages).toHaveLength(2);
    expect(harness.saved.richText).not.toContain("data:image");
  });

  test("stored content with a relative image src survives render and save", async ({
    page,
  }) => {
    // Some connected systems return relative doc URLs (/suite/doc/...). The
    // unloadable-image filter is scoped to paste-time cleaning, so existing
    // stored images must never be stripped when rendering or saving.
    await openEditor(page, {
      allowImages: true,
      richText: '<p>report figure</p><img src="/suite/doc/42">',
    });

    const html = await getEditorHtml(page);
    expect(html).toContain('src="/suite/doc/42"');

    const saved = await blurAndGetSaved(page);
    expect(saved.richText || "").toContain('src="/suite/doc/42"');
  });

  test("screenshot paste (image file only, no html flavor) inserts and uploads the image once", async ({
    page,
  }) => {
    // Taking an OS screenshot and pressing Ctrl/Cmd+V puts ONLY an image file
    // on the clipboard. This must flow through Summernote's own paste path
    // (pasteByEvent -> onImageUpload): one image, uploaded and src-replaced.
    await openEditor(page, { allowImages: true });
    await pasteInto(page, { imageDataUri: TINY_PNG_BASE64 });

    await page.waitForFunction(() =>
      /https:\/\/mock\.appian\.local\/doc\/\d+/.test(window.$("#summernote").summernote("code"))
    );

    const html = await getEditorHtml(page);
    expect((html.match(/<img/g) || []).length).toBe(1);

    const harness = await getHarness(page);
    expect(harness.clientApiCalls).toHaveLength(1);
    expect(harness.saved.richText).not.toContain("data:image");
  });

  test("screenshot paste is blocked when allowImages is false", async ({ page }) => {
    // allowImages=false strips <img> from pasted HTML, but the image-FILE paste
    // path (Summernote pasteByEvent -> onImageUpload) must be blocked too, or a
    // screenshot paste bypasses the restriction entirely.
    await openEditor(page, { allowImages: false });
    await pasteInto(page, { imageDataUri: TINY_PNG_BASE64 });
    // Give the async FileReader path time to insert if it (incorrectly) runs
    await page.waitForTimeout(400);

    const html = await getEditorHtml(page);
    expect(html).not.toContain("<img");
    const harness = await getHarness(page);
    expect(harness.clientApiCalls).toHaveLength(0);
  });

  test("multiple image files pasted together are each inserted and uploaded once", async ({
    page,
  }) => {
    await openEditor(page, { allowImages: true });
    await page.evaluate(async (dataUri) => {
      const blob = await (await fetch(dataUri)).blob();
      const dt = new DataTransfer();
      dt.items.add(new File([blob], "one.png", { type: blob.type }));
      dt.items.add(new File([blob], "two.png", { type: blob.type }));
      const event = new Event("paste", { bubbles: true, cancelable: true });
      Object.defineProperty(event, "clipboardData", { value: dt });
      window.$("#summernote").summernote("focus");
      document.querySelector(".note-editable").dispatchEvent(event);
    }, TINY_PNG_BASE64);

    await page.waitForFunction(
      () =>
        (window.$("#summernote").summernote("code").match(/mock\.appian\.local\/doc\//g) || [])
          .length === 2
    );
    const html = await getEditorHtml(page);
    expect((html.match(/<img/g) || []).length).toBe(2);
    const harness = await getHarness(page);
    expect(harness.clientApiCalls).toHaveLength(2);
  });

  test("non-PNG image file (JPEG) pastes and uploads like a PNG", async ({ page }) => {
    // Screenshots and copied photos are often JPEG; the upload path must not
    // be PNG-specific. (Note: uploadBase64Img skips data URIs under 100 chars,
    // so the test image must be big enough to clear that floor.)
    await openEditor(page, { allowImages: true });
    const jpegDataUri = await page.evaluate(() => {
      const canvas = document.createElement("canvas");
      canvas.width = 24;
      canvas.height = 24;
      const ctx = canvas.getContext("2d");
      ctx.fillStyle = "#3366cc";
      ctx.fillRect(0, 0, 24, 24);
      return canvas.toDataURL("image/jpeg");
    });
    await pasteInto(page, { imageDataUri: jpegDataUri });

    await page.waitForFunction(() =>
      /mock\.appian\.local\/doc\//.test(window.$("#summernote").summernote("code"))
    );
    const html = await getEditorHtml(page);
    expect((html.match(/<img/g) || []).length).toBe(1);
  });

  test("images nested inside pasted tables and lists are retained", async ({ page }) => {
    await openEditor(page, { allowImages: true });
    await pasteInto(page, {
      html:
        '<table><tbody><tr><td>cell <img src="https://cdn.example.com/a.png"></td></tr></tbody></table>' +
        '<ul><li>item <img src="https://cdn.example.com/b.png"></li></ul>',
    });

    const html = await getEditorHtml(page);
    expect(html).toContain('src="https://cdn.example.com/a.png"');
    expect(html).toContain('src="https://cdn.example.com/b.png"');
    expect(html).toMatch(/<td>[\s\S]*<img[\s\S]*<\/td>/);
    expect(html).toMatch(/<li>[\s\S]*<img[\s\S]*<\/li>/);
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
