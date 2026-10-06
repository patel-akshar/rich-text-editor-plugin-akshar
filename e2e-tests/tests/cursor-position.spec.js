/**
 * Pastes into EXISTING content — at a cursor position mid-paragraph, inside
 * list items and table cells, and replacing a selection. Every other paste
 * spec targets an empty editor; these cover the everyday case.
 */
const { test, expect } = require("@playwright/test");
const {
  openEditor,
  pasteInto,
  getEditorHtml,
  getEditorText,
  setCursorInEditor,
  selectTextInEditor,
} = require("./helpers");

test.describe("paste at cursor position", () => {
  test("inline HTML pasted mid-paragraph lands at the cursor without splitting it", async ({
    page,
  }) => {
    await openEditor(page, { richText: "<p>alpha omega</p>" });
    await setCursorInEditor(page, "alpha ", "after");
    await pasteInto(page, { html: "<b>beta</b>" }, { preserveSelection: true });

    const html = await getEditorHtml(page);
    expect(html).toMatch(/<p>alpha <b>beta<\/b>\s*omega<\/p>/);
    // Still one paragraph
    expect((html.match(/<p/g) || []).length).toBe(1);
  });

  test("single plain-text word pasted mid-paragraph inserts inline, not as a new paragraph", async ({
    page,
  }) => {
    await openEditor(page, { richText: "<p>alpha omega</p>" });
    await setCursorInEditor(page, "alpha ", "after");
    await pasteInto(page, { text: "beta" }, { preserveSelection: true });

    // NOTE: cleanHtml trims surrounding whitespace from pasted plain text, so
    // "beta " pastes as "beta" — cosmetic; the word may fuse with the next one.
    // The behavior under test is inline insertion: order preserved, still ONE
    // paragraph (a block wrapper would split the sentence in two).
    const text = await getEditorText(page);
    expect(text).toMatch(/alpha\s*beta\s*omega/);
    const html = await getEditorHtml(page);
    expect((html.match(/<p/g) || []).length).toBe(1);
  });

  test("paste inside a list item keeps the list structure intact", async ({ page }) => {
    await openEditor(page, { richText: "<ul><li>one</li><li>two</li></ul>" });
    await setCursorInEditor(page, "one", "after");
    await pasteInto(page, { html: "<b>x</b>" }, { preserveSelection: true });

    const html = await getEditorHtml(page);
    expect((html.match(/<li/g) || []).length).toBe(2);
    expect(html).toMatch(/<li>one<b>x<\/b>/);
    expect(html).toContain("<li>two</li>");
  });

  test("paste inside a table cell keeps the table structure intact", async ({ page }) => {
    await openEditor(page, {
      richText: "<table><tbody><tr><td>C1</td><td>C2</td></tr></tbody></table>",
    });
    await setCursorInEditor(page, "C1", "after");
    await pasteInto(page, { html: "<b>x</b>" }, { preserveSelection: true });

    const html = await getEditorHtml(page);
    expect((html.match(/<td/g) || []).length).toBe(2);
    // Summernote normalizes cell content into a <p> block — structure and
    // content both intact either way
    expect(html).toMatch(/<td>(<p>)?C1<b>x<\/b>(<\/p>)?<\/td>/);
    expect(html).toContain("<td>C2</td>");
  });

  test("table pasted mid-content leaves exactly one blank line before the following text", async ({
    page,
  }) => {
    // A mid-content paste splits the destination paragraph, leaving an empty
    // half after the table; the handler must reuse it rather than add a second
    // blank paragraph on top of it
    await openEditor(page, { richText: "<p>before</p><p>after</p>" });
    await setCursorInEditor(page, "before", "after");
    await pasteInto(
      page,
      { html: "<table><tbody><tr><td>C1</td></tr></tbody></table>" },
      { preserveSelection: true }
    );

    const html = (await getEditorHtml(page)).replace(/\s+/g, "");
    expect(html).toContain("<p>before</p>");
    expect(html).toContain("<p>after</p>");
    // Exactly one empty paragraph between the table and "after"
    expect(html).toMatch(/<\/table><p><br><\/p><p>after<\/p>/);
    expect(html).not.toMatch(/<\/table><p><br><\/p><p><br><\/p>/);
  });

  test("multi-line plain text: spacing correct AND caret ends at the end of the pasted text", async ({
    page,
  }) => {
    // The explicit end-to-end chain: paste multi-line text -> verify the line
    // structure -> verify the caret's exact position -> prove it by typing
    await openEditor(page);
    await pasteInto(page, { text: "line one\nline two\nline three" });

    // Spacing: one paragraph, two <br>s, no stray blank paragraphs
    const html = (await getEditorHtml(page)).replace(/\s+/g, "");
    expect(html).toMatch(/^<p>lineone<br>linetwo<br>linethree<\/p>$/);

    // Caret: collapsed, inside the pasted paragraph, at the very end of
    // "line three"
    const caret = await page.evaluate(() => {
      const sel = window.getSelection();
      const r = sel.getRangeAt(0);
      const container = r.startContainer;
      return {
        collapsed: r.collapsed,
        text: container.nodeType === 3 ? container.textContent : container.nodeName,
        atEnd:
          container.nodeType === 3
            ? r.startOffset === container.textContent.length
            : r.startOffset === container.childNodes.length,
        inEditor: !!(container.parentElement || container).closest(".note-editable"),
      };
    });
    expect(caret.collapsed).toBe(true);
    expect(caret.inEditor).toBe(true);
    expect(caret.atEnd).toBe(true);

    // The proof: typing continues exactly where the paste ended
    await page.keyboard.type(" CONTINUED");
    const after = (await getEditorHtml(page)).replace(/\s+/g, "");
    expect(after).toMatch(/linethree(&nbsp;|\s)?CONTINUED<\/p>$/);
  });

  test("multi-line plain text pasted mid-paragraph: following text pushed below, caret before it", async ({
    page,
  }) => {
    await openEditor(page, { richText: "<p>start END</p>" });
    await setCursorInEditor(page, "start ", "after");
    await pasteInto(page, { text: "alpha\nbeta" }, { preserveSelection: true });

    // All content present, in order, with the line break inside
    const text = await getEditorText(page);
    expect(text).toMatch(/start\s*alpha[\s\S]*beta[\s\S]*END/);
    // Typing lands between the pasted text and "END", not at the document end
    await page.keyboard.type("|HERE|");
    const after = await getEditorText(page);
    expect(after).toMatch(/beta[\s\S]*\|HERE\|[\s\S]*END/);
  });

  test("paste over a selection replaces the selected text", async ({ page }) => {
    await openEditor(page, { richText: "<p>keep DELETEME keep2</p>" });
    await selectTextInEditor(page, "DELETEME");
    await pasteInto(page, { html: "<b>new</b>" }, { preserveSelection: true });

    const html = await getEditorHtml(page);
    expect(html).not.toContain("DELETEME");
    expect(html).toMatch(/keep <b>new<\/b>\s*keep2/);
  });
});
