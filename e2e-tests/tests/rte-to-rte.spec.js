/**
 * Simulates a user copying content from one Rich Text Editor instance and
 * pasting it into another (e.g. two RTE fields on the same Appian interface,
 * or across two browser tabs).
 */
const { test, expect } = require("@playwright/test");
const {
  openEditor,
  pasteInto,
  getEditorHtml,
  getEditorText,
  blurAndGetSaved,
} = require("./helpers");
const { RTE_RICH_CONTENT, RTE_KITCHEN_SINK, TINY_PNG_BASE64 } = require("../fixtures/samples");

test.describe("RTE to RTE copy/paste", () => {
  test("rich content pasted from one editor renders identically in another", async ({
    context,
  }) => {
    const pageA = await context.newPage();
    const pageB = await context.newPage();
    await openEditor(pageA, { richText: RTE_RICH_CONTENT });
    await openEditor(pageB);

    // "Copy" from editor A: its serialized content is what a browser copy
    // of the full selection places on the clipboard as text/html
    const copiedHtml = await getEditorHtml(pageA);
    expect(copiedHtml).toContain("Section Title");

    await pasteInto(pageB, { html: copiedHtml });

    const textB = await getEditorText(pageB);
    expect(textB).toContain("Section Title");
    expect(textB).toContain("Bullet one");
    expect(textB).toContain("Number two");
    expect(textB).toContain("A link");
    expect(textB).toContain("R2C2");

    const htmlB = await getEditorHtml(pageB);
    // Structure survives the round trip
    expect(htmlB).toMatch(/<h3[^>]*>[^<]*Section Title/);
    expect(htmlB).toMatch(/<b>bold<\/b>/);
    expect(htmlB).toMatch(/<ul>[\s\S]*Bullet one/);
    expect(htmlB).toMatch(/<ol>[\s\S]*Number one/);
    expect(htmlB).toMatch(/<table[\s\S]*R1C1/);
    expect(htmlB).toContain('href="https://example.com"');
  });

  test("kitchen sink: every supported content type is retained across the paste", async ({
    context,
  }) => {
    const pageA = await context.newPage();
    const pageB = await context.newPage();
    await openEditor(pageA, { richText: RTE_KITCHEN_SINK });
    await openEditor(pageB);

    await pasteInto(pageB, { html: await getEditorHtml(pageA) });
    const html = await getEditorHtml(pageB);
    const text = await getEditorText(pageB);

    // Multiple paragraphs, all present and separate
    expect(text).toContain("First paragraph with plain text.");
    expect(text).toContain("Closing paragraph.");
    expect((html.match(/<p/g) || []).length).toBeGreaterThanOrEqual(4);

    // Formatting styles
    expect(html).toMatch(/<b>bold<\/b>/);
    expect(html).toMatch(/<i>italic<\/i>/);
    expect(html).toMatch(/<u>underline<\/u>/);
    expect(html).toMatch(/<strike>strike<\/strike>/);
    expect(html).toMatch(/<sup>sup<\/sup>/);
    expect(html).toMatch(/<sub>sub<\/sub>/);
    expect(html).toMatch(/font-size:\s*18px/);
    expect(html).toMatch(/background-color:\s*rgb\(255,\s*255,\s*0\)/);

    // Lists
    expect(html).toMatch(/<ul>[\s\S]*Bullet A[\s\S]*Bullet B/);
    expect(html).toMatch(/<ol>[\s\S]*Step 1[\s\S]*Step 2/);

    // URLs
    expect(html).toContain('href="https://example.com/page"');
    expect(html).toContain('href="mailto:me@example.com"');

    // Table
    expect(html).toMatch(/<table[\s\S]*H1[\s\S]*C2/);
  });

  test("base64 image embedded in copied RTE content is retained in the target editor", async ({
    context,
  }) => {
    const pageB = await context.newPage();
    await openEditor(pageB, { allowImages: true });

    await pasteInto(pageB, {
      html: `<p>caption above</p><img src="${TINY_PNG_BASE64}"><p>caption below</p>`,
    });

    const html = await getEditorHtml(pageB);
    expect(html).toContain("caption above");
    expect(html).toContain("caption below");
    expect(html).toContain('src="data:image/png;base64');
  });

  test("KNOWN LIMITATION: content containing an uploaded (https) image is not pasted at all", async ({
    context,
  }) => {
    // The paste handler calls preventDefault() and then returns early when the
    // clipboard HTML contains an external image (to avoid duplicate pasting via
    // onImageUpload) — but onImageUpload only fires for image FILES, not HTML.
    // Net effect: copying RTE content that includes an already-uploaded image
    // and pasting it into another RTE inserts NOTHING, text included.
    // This test documents the current behavior; if image+text RTE-to-RTE paste
    // becomes a requirement, this is the code path to fix.
    const pageB = await context.newPage();
    await openEditor(pageB, { allowImages: true });
    const before = await getEditorHtml(pageB);

    await pasteInto(pageB, {
      html: '<p>important text</p><img src="https://mock.appian.local/doc/1"><p>more text</p>',
    });

    expect(await getEditorHtml(pageB)).toBe(before);
  });

  test("pasting a table adds a trailing paragraph so the cursor can move below it", async ({
    page,
  }) => {
    await openEditor(page);
    await pasteInto(page, {
      html: "<table><tbody><tr><td>only cell</td></tr></tbody></table>",
    });

    const html = await getEditorHtml(page);
    expect(html).toContain("only cell");
    // Component inserts <p><br></p> after a trailing pasted table
    expect(html.replace(/\s+/g, "")).toMatch(/<\/table><p><br><\/p>/);
  });

  test("pasted content is saved back to Appian on blur", async ({ page }) => {
    await openEditor(page);
    await pasteInto(page, { html: "<p>Saved <b>content</b></p>" });

    const saved = await blurAndGetSaved(page);
    expect(saved.richText).toContain("Saved");
    expect(saved.richText).toContain("<b>content</b>");
  });

  test("real clipboard: select-all copy in editor A pastes into editor B (Chromium)", async ({
    context,
    browserName,
  }) => {
    test.skip(browserName !== "chromium", "async clipboard permissions are Chromium-only");

    const pageA = await context.newPage();
    await openEditor(pageA, { richText: "<p>Clipboard <b>round trip</b></p>" });

    // Select everything in editor A and copy with the real keyboard shortcut
    await pageA.locator(".note-editable").click();
    await pageA.evaluate(() => {
      const editable = document.querySelector(".note-editable");
      const range = document.createRange();
      range.selectNodeContents(editable);
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
    });
    await pageA.keyboard.press("ControlOrMeta+c");

    // Read the actual clipboard flavors the copy produced
    const clipboard = await pageA.evaluate(async () => {
      const items = await navigator.clipboard.read();
      const out = {};
      for (const item of items) {
        if (item.types.includes("text/html")) {
          out.html = await (await item.getType("text/html")).text();
        }
        if (item.types.includes("text/plain")) {
          out.text = await (await item.getType("text/plain")).text();
        }
      }
      return out;
    });
    expect(clipboard.html || clipboard.text).toBeTruthy();

    // Paste those exact flavors into editor B
    const pageB = await context.newPage();
    await openEditor(pageB);
    await pasteInto(pageB, clipboard);

    const textB = await getEditorText(pageB);
    expect(textB).toContain("Clipboard");
    expect(textB).toContain("round trip");
    if (clipboard.html) {
      expect(await getEditorHtml(pageB)).toMatch(/<b>round trip<\/b>/);
    }
  });

  test("plain-text paste converts newlines to line breaks", async ({ page }) => {
    await openEditor(page);
    await pasteInto(page, { text: "line one\nline two\nline three" });

    const html = await getEditorHtml(page);
    expect(html).toContain("line one");
    expect(html).toContain("line two");
    expect((html.match(/<br/g) || []).length).toBeGreaterThanOrEqual(2);
  });
});
