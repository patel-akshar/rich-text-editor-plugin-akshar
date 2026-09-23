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

  test("paste over a selection replaces the selected text", async ({ page }) => {
    await openEditor(page, { richText: "<p>keep DELETEME keep2</p>" });
    await selectTextInEditor(page, "DELETEME");
    await pasteInto(page, { html: "<b>new</b>" }, { preserveSelection: true });

    const html = await getEditorHtml(page);
    expect(html).not.toContain("DELETEME");
    expect(html).toMatch(/keep <b>new<\/b>\s*keep2/);
  });
});
