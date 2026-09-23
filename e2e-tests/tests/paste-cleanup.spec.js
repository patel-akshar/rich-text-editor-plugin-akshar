/**
 * Empty-paragraph cleanup around pastes (the "update paste handler" behavior):
 * pressing Enter before pasting must not leave a stray blank paragraph,
 * repeated pastes must not accumulate trailing blanks, and blank paragraphs
 * the user created on purpose must survive.
 */
const { test, expect } = require("@playwright/test");
const {
  openEditor,
  pasteInto,
  getEditorHtml,
  setCursorInEditor,
} = require("./helpers");

function countEmptyParagraphs(html) {
  return (html.match(/<p>(?:\s|&nbsp;)*<br>(?:\s|&nbsp;)*<\/p>/g) || []).length;
}

test.describe("paste empty-paragraph cleanup", () => {
  test("Enter-then-paste leaves no stray empty paragraph at the caret", async ({ page }) => {
    await openEditor(page, { richText: "<p>hello</p>" });
    await setCursorInEditor(page, "hello", "after");
    await page.keyboard.press("Enter");
    await pasteInto(page, { html: "<p>world</p>" }, { preserveSelection: true });

    const html = await getEditorHtml(page);
    expect(html).toContain("<p>hello</p>");
    expect(html).toContain("<p>world</p>");
    expect(countEmptyParagraphs(html)).toBe(0);
  });

  test("repeated pastes do not accumulate trailing empty paragraphs", async ({ page }) => {
    await openEditor(page, { richText: "<p>start</p>" });
    await setCursorInEditor(page, "start", "after");
    await page.keyboard.press("Enter");
    await pasteInto(page, { html: "<p>first paste</p>" }, { preserveSelection: true });
    await pasteInto(page, { html: "<p>second paste</p>" });
    await pasteInto(page, { html: "<p>third paste</p>" });

    const html = await getEditorHtml(page);
    expect(html).toContain("first paste");
    expect(html).toContain("second paste");
    expect(html).toContain("third paste");
    expect(countEmptyParagraphs(html)).toBe(0);
  });

  test("blank paragraphs that existed before the paste are preserved", async ({ page }) => {
    await openEditor(page, {
      richText: "<p>hello</p><p><br></p><p><br></p>",
    });
    // Paste at the end of the first paragraph, not in the trailing blanks
    await setCursorInEditor(page, "hello", "after");
    await pasteInto(page, { html: "<b>inline</b>" }, { preserveSelection: true });

    const html = await getEditorHtml(page);
    expect(html).toContain("inline");
    // The user's intentional trailing blank paragraphs are still there
    expect(countEmptyParagraphs(html)).toBe(2);
  });
});
