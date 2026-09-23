/**
 * Simulates pasting content copied from Microsoft Word — the clipboard HTML
 * fixtures mirror Word's real text/html flavor (mso-* styles, MsoNormal
 * classes, supportLists conditionals, o:p tags, source newlines).
 */
const { test, expect } = require("@playwright/test");
const {
  openEditor,
  pasteInto,
  getEditorHtml,
  getEditorText,
  blurAndGetSaved,
} = require("./helpers");
const word = require("../fixtures/word-clipboard");

test.describe("MS Word paste", () => {
  test("simple paragraphs: text survives, Word junk is stripped", async ({ page }) => {
    await openEditor(page);
    await pasteInto(page, { html: word.WORD_SIMPLE_PARAGRAPHS });

    const text = await getEditorText(page);
    expect(text).toContain("First paragraph from Word.");
    expect(text).toContain("Bold second paragraph.");

    const html = await getEditorHtml(page);
    expect(html).not.toContain("MsoNormal");
    expect(html).not.toContain("mso-");
    expect(html).not.toMatch(/<o:p/i);
    expect(html).toMatch(/<b>[\s\S]*Bold second paragraph/);
  });

  test("bulleted list: items and markers preserved without mso remnants", async ({ page }) => {
    await openEditor(page);
    await pasteInto(page, { html: word.WORD_BULLETED_LIST });

    const text = await getEditorText(page);
    expect(text).toContain("Alpha item");
    expect(text).toContain("Beta item");
    expect(text).toContain("Gamma item");

    const html = await getEditorHtml(page);
    expect(html).not.toContain("mso-list");
    expect(html).not.toContain("supportLists");
    expect(html).not.toContain("MsoListParagraph");
  });

  test("numbered list: marker stays on the same line as its item text", async ({ page }) => {
    await openEditor(page);
    await pasteInto(page, { html: word.WORD_NUMBERED_LIST });

    const text = await getEditorText(page);
    // Source newlines inside <![if !supportLists]> blocks are Word formatting,
    // not user line breaks — "1." must not end up on its own line
    const lines = text
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);
    const stepOneLine = lines.find((l) => l.includes("Step one"));
    const stepTwoLine = lines.find((l) => l.includes("Step two"));
    expect(stepOneLine).toBeTruthy();
    expect(stepTwoLine).toBeTruthy();
    expect(stepOneLine).toMatch(/^1\./);
    expect(stepTwoLine).toMatch(/^2\./);
  });

  test("hard returns (Shift+Enter) become a single <br>, not extra paragraphs", async ({
    page,
  }) => {
    await openEditor(page);
    await pasteInto(page, { html: word.WORD_HARD_RETURNS });

    const text = await getEditorText(page);
    expect(text).toContain("Line one before break");
    expect(text).toContain("Line two after break");

    const html = await getEditorHtml(page);
    // Both lines share one paragraph separated by exactly one <br>
    expect(html).toMatch(/Line one before break\s*<br[^>]*>\s*Line two after break/);
  });

  test("Word table: structure and cell content preserved, mso attributes stripped", async ({
    page,
  }) => {
    await openEditor(page);
    await pasteInto(page, { html: word.WORD_TABLE });

    const html = await getEditorHtml(page);
    expect(html).toMatch(/<table/);
    expect((html.match(/<tr/g) || []).length).toBe(2);
    expect((html.match(/<td/g) || []).length).toBe(4);

    const text = await getEditorText(page);
    expect(text).toContain("Header A");
    expect(text).toContain("Header B");
    expect(text).toContain("Cell one");
    expect(text).toContain("Cell two");

    expect(html).not.toContain("mso-");
    expect(html).not.toContain("windowtext");
    expect(html).not.toMatch(/\svalign=/);
  });

  test("unquoted Word attributes (border=1 width=400) are stripped by the allowlist", async ({
    page,
  }) => {
    await openEditor(page);
    await pasteInto(page, { html: word.WORD_UNQUOTED_ATTRS });

    const html = await getEditorHtml(page);
    expect(html).toContain("Unquoted cell");
    expect(html).not.toMatch(/border=/);
    expect(html).not.toMatch(/cellspacing=/);
    expect(html).not.toMatch(/cellpadding=/);
    expect(html).not.toMatch(/width=/);
  });

  test("hyperlinks: https and mailto URLs retained as working links", async ({ page }) => {
    await openEditor(page);
    await pasteInto(page, { html: word.WORD_HYPERLINK });

    const text = await getEditorText(page);
    expect(text).toContain("Read the full guide before continuing.");
    expect(text).toContain("Contact the team with questions.");

    const html = await getEditorHtml(page);
    expect(html).toContain('href="https://docs.example.com/guide"');
    expect(html).toContain('href="mailto:team@example.com"');
    expect(html).not.toContain("mso-themecolor");
  });

  test("formatting styles: bold/italic/underline/sup/sub/font-size retained", async ({
    page,
  }) => {
    await openEditor(page);
    await pasteInto(page, { html: word.WORD_FORMATTING_STYLES });

    // All text survives regardless of formatting
    const text = await getEditorText(page);
    expect(text).toContain("Bold text");
    expect(text).toContain("italic text");
    expect(text).toContain("underlined text");
    expect(text).toContain("struck text");
    expect(text).toContain("Red text");
    expect(text).toContain("large text");
    expect(text).toContain("superscript");
    expect(text).toContain("subscript");

    const html = await getEditorHtml(page);
    expect(html).toMatch(/<b>Bold text<\/b>/);
    expect(html).toMatch(/<i>italic text<\/i>/);
    expect(html).toMatch(/<u>underlined text<\/u>/);
    expect(html).toMatch(/<sup>superscript<\/sup>/);
    expect(html).toMatch(/<sub>subscript<\/sub>/);
    // font-size is on the style allowlist and survives
    expect(html).toMatch(/font-size:\s*18(\.0)?pt/);
    // NOTE (current, intended behavior): Word's <s> strike tag is not on the
    // tag allowlist (only <strike> is) and color: is not on the style
    // allowlist, so struck/red text keeps its TEXT but loses that formatting.
    expect(html).not.toContain("mso-");
  });

  test("embedded image: surrounding text retained; dead file:/// reference does not reach Appian", async ({
    page,
  }) => {
    await openEditor(page);
    await pasteInto(page, { html: word.WORD_EMBEDDED_IMAGE });

    // The text around the image must never be lost
    const text = await getEditorText(page);
    expect(text).toContain("Text before the image.");
    expect(text).toContain("Text after the image.");

    // Word's image arrives as file:///...clip_image001.png — a path on the
    // COPIER's machine that no browser can load from a web page. Whatever the
    // editor shows, the dead reference must not be saved out to Appian as if
    // it were a working image.
    const saved = await blurAndGetSaved(page);
    expect(saved.richText).toContain("Text before the image.");
    expect(saved.richText).not.toContain("file:///C:/Users");
  });

  test("Word paste saves clean HTML back to Appian", async ({ page }) => {
    await openEditor(page);
    await pasteInto(page, { html: word.WORD_SIMPLE_PARAGRAPHS });

    const saved = await blurAndGetSaved(page);
    expect(saved.richText).toContain("First paragraph from Word.");
    expect(saved.richText).not.toContain("mso-");
    expect(saved.richText).not.toContain("MsoNormal");
  });
});
