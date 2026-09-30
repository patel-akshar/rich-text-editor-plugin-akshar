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
const { TINY_PNG_BASE64 } = require("../fixtures/samples");

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

  test("article containing an https image pastes fully — text, link and image", async ({
    page,
  }) => {
    // Regression guard for the former whole-paste drop: clipboard HTML with an
    // external image used to insert NOTHING (early return that deferred to
    // onImageUpload, which never fires for HTML). Now the article pastes
    // completely, with the loadable https image retained.
    await openEditor(page, { allowImages: true });
    await pasteInto(page, { html: web.WEBPAGE_ARTICLE_WITH_IMAGE });

    const text = await getEditorText(page);
    expect(text).toContain("Quarterly Results Announced");
    expect(text).toContain("Revenue grew in the third quarter, the company said.");
    expect(text).toContain("Read the full story for details.");

    const html = await getEditorHtml(page);
    expect(html).toContain('src="https://cdn.example.com/photos/chart.jpg"');
    expect(html).toContain('href="https://news.example.com/full-story"');
  });

  test("right-click 'Copy image' pastes the image exactly once, not twice", async ({
    page,
  }) => {
    // Copying a bare image from a web page puts BOTH an <img> html flavor AND
    // an image file on the clipboard. Summernote's onImageUpload inserts the
    // file; the paste handler must bail out or the html flavor lands as a
    // second copy of the same image.
    await openEditor(page, { allowImages: true });
    await pasteInto(page, {
      html: '<img src="https://cdn.example.com/photos/chart.jpg">',
      imageDataUri: TINY_PNG_BASE64,
    });

    // onImageUpload inserts via async FileReader — wait for the image to land
    await page.waitForFunction(
      () => document.querySelectorAll(".note-editable img").length >= 1
    );
    // Give a second (duplicate) insertion time to happen if it were going to
    await page.waitForTimeout(300);

    const html = await getEditorHtml(page);
    expect((html.match(/<img/g) || []).length).toBe(1);
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

  test("range copied with an embedded chart: table retained, dead temp-file image dropped", async ({
    page,
  }) => {
    // Excel represents a copied chart/picture as <img src="file:///...Temp/...">
    // - a reference to the source machine's disk that can never load elsewhere.
    // The table must paste intact and the dead reference must not reach Appian.
    await openEditor(page, { allowImages: true });
    await pasteInto(page, { html: web.EXCEL_TABLE_WITH_CHART });

    const html = await getEditorHtml(page);
    expect(html).toMatch(/<table/);
    expect((html.match(/<td/g) || []).length).toBe(6);
    expect(html).not.toContain("<img");
    expect(html).not.toContain("file:///");
  });
});
