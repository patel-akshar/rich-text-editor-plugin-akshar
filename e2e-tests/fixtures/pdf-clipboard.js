/**
 * PDF clipboard fixtures.
 *
 * PDF viewers (Chrome's built-in viewer, macOS Preview, Acrobat Reader,
 * Firefox pdf.js) place PLAIN TEXT on the clipboard — no text/html flavor.
 * Characteristics mimicked here:
 *   - lines hard-wrapped where they visually wrapped on the PDF page
 *   - paragraphs separated by blank lines
 *   - bullet lists as literal glyph characters (•, -, ▪)
 *   - URLs as bare text (no anchor markup)
 *   - typographic characters (smart quotes, en/em dashes, ligatures)
 */

const PDF_MULTI_PARAGRAPH = [
  "Executive Summary",
  "",
  "This document describes the quarterly results for the rich text",
  "editor component and its adoption across business units.",
  "",
  "The second paragraph continues on a new page and includes the",
  "final recommendation for next quarter.",
].join("\n");

const PDF_BULLETED_LIST = [
  "Key findings:",
  "• Adoption increased in the first quarter",
  "• Support tickets decreased measurably",
  "• Two teams requested table support",
].join("\n");

const PDF_HARD_WRAPPED_TEXT = [
  "This sentence was wrapped by the PDF layout engine at an arbitrary",
  "width and continues here even though the author wrote it as one",
  "single sentence without any manual line breaks.",
].join("\n");

const PDF_WITH_URL = [
  "Full documentation is available at",
  "https://docs.example.com/rich-text-editor/guide",
  "and questions can be sent to support@example.com.",
].join("\n");

const PDF_TYPOGRAPHIC_CHARS =
  "The team said “efficiency” improved — specifically the ﬁnal workflow – by 40%.";

module.exports = {
  PDF_MULTI_PARAGRAPH,
  PDF_BULLETED_LIST,
  PDF_HARD_WRAPPED_TEXT,
  PDF_WITH_URL,
  PDF_TYPOGRAPHIC_CHARS,
};
