/**
 * Mixed-content pastes: combinations of text, images, tables and lists in a
 * single paste, from the sources users actually copy from (Word, web pages,
 * Excel, other RTEs). Single-ingredient pastes live in the per-source specs;
 * these verify the ingredients don't interfere with each other, and that
 * content containing embedded images actually SAVES back to Appian.
 */
const { test, expect } = require("@playwright/test");
const {
  openEditor,
  pasteInto,
  getEditorHtml,
  getEditorText,
  getHarness,
  blurAndGetSaved,
  setCursorInEditor,
} = require("./helpers");
const { TINY_PNG_BASE64 } = require("../fixtures/samples");
const web = require("../fixtures/web-clipboard");

/** Word-style document section: heading, paragraphs, embedded screenshot, list, table. */
function wordDocWithImage() {
  return (
    '<p class="MsoNormal"><b>MOST RECENTLY APPROVED MODEL LABELING</b></p>' +
    '<p class="MsoNormal">Supplement Approval Date: 09/16/2026</p>' +
    `<img width=240 height=180 src="${TINY_PNG_BASE64}">` +
    "<ul><li>Warnings and Precautions updated</li><li>Medication Guide updated</li></ul>" +
    "<table><tbody><tr><td>NDA</td><td>208246</td></tr><tr><td>Supplement</td><td>S-028</td></tr></tbody></table>" +
    '<p class="MsoNormal">Link: <a href="https://darrts.example.gov/doc/1">approval letter</a></p>'
  );
}

test.describe("mixed-content pastes", () => {
  test("Word section with text, embedded image, list and table SAVES to Appian", async ({
    page,
  }) => {
    // The reported real-world failure: a Word doc with an embedded screenshot
    // pasted perfectly but silently never saved, because the data: image had
    // no upload path and base64 blocks the save.
    await openEditor(page, { allowImages: true });
    await pasteInto(page, { html: wordDocWithImage() });

    // The embedded image uploads and its src becomes a document URL
    await page.waitForFunction(() =>
      /mock\.appian\.local\/doc\//.test(window.$("#summernote").summernote("code"))
    );
    await page.waitForFunction(() => !!window.__harness.saved.richText);

    const harness = await getHarness(page);
    const saved = harness.saved.richText;
    expect(saved).toContain("MOST RECENTLY APPROVED MODEL LABELING");
    expect(saved).toContain("Supplement Approval Date: 09/16/2026");
    expect(saved).toContain("https://mock.appian.local/doc/1");
    expect(saved).not.toContain("data:image");
    expect(saved).toContain("<li>Warnings and Precautions updated</li>");
    expect(saved).toMatch(/<table[\s\S]*208246/);
    expect(saved).toContain('href="https://darrts.example.gov/doc/1"');
    // One image pasted -> exactly one upload, one bookkeeping entry
    expect(harness.clientApiCalls).toHaveLength(1);
    expect(harness.saved.uploadedImages).toHaveLength(1);
  });

  test("pasted base64 image with NO connected system: paste still works, save stays blocked", async ({
    page,
  }) => {
    // Without a connected system there is nowhere to upload to. The paste must
    // not crash; the image renders; the save is withheld (base64 must never
    // reach Appian) and the existing misconfiguration validation stands.
    await openEditor(page, { allowImages: true, imageStorageConnectedSystem: "" });
    await pasteInto(page, {
      html: `<p>text stays</p><img src="${TINY_PNG_BASE64}">`,
    });

    const html = await getEditorHtml(page);
    expect(html).toContain("text stays");
    expect(html).toContain("data:image/png");

    const saved = await blurAndGetSaved(page);
    expect(saved.richText || "").not.toContain("data:image");
    const harness = await getHarness(page);
    expect(harness.clientApiCalls).toHaveLength(0);
  });

  test("web article with image: text before and after the image, list and link all retained", async ({
    page,
  }) => {
    await openEditor(page, { allowImages: true });
    await pasteInto(page, {
      html:
        "<h2>Release Notes</h2><p>Intro paragraph.</p>" +
        '<img src="https://cdn.example.com/diagram.png">' +
        "<ol><li>First change</li><li>Second change</li></ol>" +
        '<p>See the <a href="https://example.com/full">full notes</a>.</p>',
    });

    const html = await getEditorHtml(page);
    expect(html).toMatch(/<h2>\s*Release Notes/);
    expect(html).toContain("Intro paragraph.");
    expect(html).toContain('src="https://cdn.example.com/diagram.png"');
    expect(html).toMatch(/<ol>[\s\S]*First change[\s\S]*Second change/);
    expect(html).toContain('href="https://example.com/full"');
  });

  test("image directly before a table, table trailing: both retained, caret below the table", async ({
    page,
  }) => {
    await openEditor(page, { allowImages: true });
    await pasteInto(page, {
      html:
        '<p>figure:</p><img src="https://cdn.example.com/fig.png">' +
        "<table><tbody><tr><td>A</td><td>B</td></tr></tbody></table>",
    });

    const html = await getEditorHtml(page);
    expect(html).toContain('src="https://cdn.example.com/fig.png"');
    expect(html).toMatch(/<table[\s\S]*<td>A<\/td>/);
    // Trailing-table contract still holds with an image in the mix
    expect(html.replace(/\s+/g, "")).toMatch(/<\/table><p><br><\/p>/);
    await page.keyboard.type("below");
    expect((await getEditorHtml(page)).replace(/\s+/g, "")).toMatch(/<\/table><p>below<\/p>$/);
  });

  test("sequential pastes from different sources accumulate: Word text, Excel table, image file", async ({
    page,
  }) => {
    await openEditor(page, { allowImages: true });
    // 1. Word-style paragraph
    await pasteInto(page, { html: '<p class="MsoNormal">Summary written in Word.</p>' });
    // 2. Excel range after it
    await setCursorInEditor(page, "Summary written in Word.", "after");
    await pasteInto(page, { html: web.EXCEL_TABLE }, { preserveSelection: true });
    // 3. A screenshot file
    await pasteInto(page, { imageDataUri: TINY_PNG_BASE64 });
    await page.waitForFunction(() =>
      /mock\.appian\.local\/doc\//.test(window.$("#summernote").summernote("code"))
    );

    const text = await getEditorText(page);
    expect(text).toContain("Summary written in Word.");
    expect(text).toContain("North");
    const html = await getEditorHtml(page);
    expect(html).toMatch(/<table/);
    expect((html.match(/<img/g) || []).length).toBe(1);
    expect(html).not.toContain("MsoNormal");
  });

  test("table pasted INTO existing text with an image following it keeps document order", async ({
    page,
  }) => {
    await openEditor(page, { richText: "<p>before</p><p>after</p>" });
    await setCursorInEditor(page, "before", "after");
    await pasteInto(
      page,
      {
        html:
          "<table><tbody><tr><td>T1</td></tr></tbody></table>" +
          '<img src="https://cdn.example.com/after-table.png">',
      },
      { preserveSelection: true }
    );

    const html = (await getEditorHtml(page)).replace(/\s+/g, "");
    // Order: before, table, image, after — nothing swallowed or reordered
    const order = ["<p>before</p>", "<td>T1</td>", "after-table.png", ">after</p>"];
    let pos = -1;
    for (const piece of order) {
      const next = html.indexOf(piece);
      expect(next).toBeGreaterThan(pos);
      pos = next;
    }
  });
});
