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

  test("Word paste saves clean HTML back to Appian", async ({ page }) => {
    await openEditor(page);
    await pasteInto(page, { html: word.WORD_SIMPLE_PARAGRAPHS });

    const saved = await blurAndGetSaved(page);
    expect(saved.richText).toContain("First paragraph from Word.");
    expect(saved.richText).not.toContain("mso-");
    expect(saved.richText).not.toContain("MsoNormal");
  });
});
