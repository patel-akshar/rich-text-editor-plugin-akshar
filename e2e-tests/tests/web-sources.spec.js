/**
 * Pastes from other common sources: ordinary web pages and Excel.
 */
const { test, expect } = require("@playwright/test");
const {
  openEditor,
  pasteInto,
  getEditorHtml,
  getEditorText,
} = require("./helpers");
const web = require("../fixtures/web-clipboard");

test.describe("web page paste", () => {
  test("article copy: headings, paragraphs, formatting and links all retained", async ({
    page,
  }) => {
    await openEditor(page);
    await pasteInto(page, { html: web.WEBPAGE_ARTICLE_NO_IMAGE });

    const text = await getEditorText(page);
    expect(text).toContain("Quarterly Results Announced");
    expect(text).toContain("Revenue grew in the third quarter, the company said.");
    expect(text).toContain("Read the full story for details.");

    const html = await getEditorHtml(page);
    expect(html).toMatch(/<h2>/);
    expect(html).toMatch(/<b>third quarter<\/b>/);
    expect(html).toContain('href="https://news.example.com/full-story"');
    // Wrapper divs and classes are gone
    expect(html).not.toContain("article-body");
    expect(html).not.toContain("class=");
  });

  test("KNOWN LIMITATION: article containing an https image pastes as nothing", async ({
    page,
  }) => {
    // The paste handler suppresses the default paste and then returns early for
    // clipboard HTML containing an external image (deferring to onImageUpload,
    // which only fires for image FILES). Copying a typical web article with an
    // inline photo therefore pastes nothing at all — text included. This test
    // documents the behavior; it is the code path to fix if webpage copies with
    // images must be supported.
    await openEditor(page, { allowImages: true });
    const before = await getEditorHtml(page);
    await pasteInto(page, { html: web.WEBPAGE_ARTICLE_WITH_IMAGE });

    expect(await getEditorHtml(page)).toBe(before);
  });
});

test.describe("Excel paste", () => {
  test("table structure and all cell values retained", async ({ page }) => {
    await openEditor(page);
    await pasteInto(page, { html: web.EXCEL_TABLE });

    const html = await getEditorHtml(page);
    expect(html).toMatch(/<table/);
    expect((html.match(/<tr/g) || []).length).toBe(3);
    expect((html.match(/<td/g) || []).length).toBe(6);

    const text = await getEditorText(page);
    for (const cell of ["Region", "Total", "North", "1250", "South", "980"]) {
      expect(text).toContain(cell);
    }
  });

  test("Excel-specific markup (xl classes, colgroup, office attrs) is stripped", async ({
    page,
  }) => {
    await openEditor(page);
    await pasteInto(page, { html: web.EXCEL_TABLE });

    const html = await getEditorHtml(page);
    expect(html).not.toContain("xl65");
    expect(html).not.toContain("class=");
    expect(html).not.toContain("<colgroup");
    expect(html).not.toContain("align=");
  });
});
