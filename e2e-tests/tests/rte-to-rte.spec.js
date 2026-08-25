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
const { RTE_RICH_CONTENT } = require("../fixtures/samples");

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
    // KNOWN BUG (caught by this suite): the summernote.paste handler appends
    // text-node content verbatim (cleanedHtml += node.textContent) without
    // running it through cleanHtml, so \n from plain-text pastes never becomes
    // <br> and multi-line text collapses onto one line. The Jest unit test
    // passes because it calls cleanHtml directly. Remove test.fail() once the
    // paste handler routes text nodes through cleanHtml(text, true).
    test.fail();
    await openEditor(page);
    await pasteInto(page, { text: "line one\nline two\nline three" });

    const html = await getEditorHtml(page);
    expect(html).toContain("line one");
    expect(html).toContain("line two");
    expect((html.match(/<br/g) || []).length).toBeGreaterThanOrEqual(2);
  });
});
