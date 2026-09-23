/**
 * Simulates copying content from a PDF and pasting into the RTE.
 *
 * PDF viewers put plain text only on the clipboard (no text/html flavor),
 * so these pastes exercise the plain-text path: newline-to-<br> conversion,
 * bullet glyph retention, and typographic character fidelity.
 */
const { test, expect } = require("@playwright/test");
const {
  openEditor,
  pasteInto,
  getEditorHtml,
  getEditorText,
  blurAndGetSaved,
} = require("./helpers");
const pdf = require("../fixtures/pdf-clipboard");

test.describe("PDF paste", () => {
  test("multi-paragraph text: all paragraphs retained with line breaks", async ({ page }) => {
    await openEditor(page);
    await pasteInto(page, { text: pdf.PDF_MULTI_PARAGRAPH });

    const text = await getEditorText(page);
    expect(text).toContain("Executive Summary");
    expect(text).toContain("quarterly results");
    expect(text).toContain("final recommendation");

    // Paragraph separation survives: heading and body are not fused together
    const html = await getEditorHtml(page);
    expect(html).not.toContain("Summary This document");
    expect((html.match(/<br/g) || []).length).toBeGreaterThanOrEqual(4);
  });

  test("bulleted list: bullet glyphs and every item retained on separate lines", async ({
    page,
  }) => {
    await openEditor(page);
    await pasteInto(page, { text: pdf.PDF_BULLETED_LIST });

    const text = await getEditorText(page);
    expect(text).toContain("Key findings:");
    expect(text).toContain("• Adoption increased in the first quarter");
    expect(text).toContain("• Support tickets decreased measurably");
    expect(text).toContain("• Two teams requested table support");

    // Each bullet on its own line, not fused into one
    const lines = text
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);
    expect(lines.filter((l) => l.startsWith("•")).length).toBe(3);
  });

  test("hard-wrapped lines: no text lost across the wraps", async ({ page }) => {
    await openEditor(page);
    await pasteInto(page, { text: pdf.PDF_HARD_WRAPPED_TEXT });

    const text = await getEditorText(page);
    expect(text).toContain("wrapped by the PDF layout engine");
    expect(text).toContain("continues here");
    expect(text).toContain("without any manual line breaks");
  });

  test("URLs and email addresses retained as text", async ({ page }) => {
    await openEditor(page);
    await pasteInto(page, { text: pdf.PDF_WITH_URL });

    const text = await getEditorText(page);
    expect(text).toContain("https://docs.example.com/rich-text-editor/guide");
    expect(text).toContain("support@example.com");
  });

  test("typographic characters (smart quotes, dashes, ligatures) retained", async ({
    page,
  }) => {
    await openEditor(page);
    await pasteInto(page, { text: pdf.PDF_TYPOGRAPHIC_CHARS });

    const text = await getEditorText(page);
    expect(text).toContain("“efficiency”");
    expect(text).toContain("—");
    expect(text).toContain("ﬁnal");
    expect(text).toContain("40%");
  });

  test("PDF paste saves back to Appian", async ({ page }) => {
    await openEditor(page);
    await pasteInto(page, { text: pdf.PDF_BULLETED_LIST });

    const saved = await blurAndGetSaved(page);
    expect(saved.richText).toContain("Key findings:");
    expect(saved.richText).toContain("Adoption increased");
  });
});
