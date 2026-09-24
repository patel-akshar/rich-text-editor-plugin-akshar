/**
 * Human-readable descriptions of what each spec file covers, shown as section
 * intros in the generated test report (test-report/index.html). Keyed by spec
 * file basename. Individual test titles serve as the per-test descriptions.
 */
module.exports = {
  "word-paste.spec.js":
    "Simulates pasting content copied from Microsoft Word. The clipboard fixtures mirror " +
    "Word's real text/html flavor (mso-* styles, MsoNormal classes, supportLists list-marker " +
    "conditionals, o:p tags, source newlines). Verifies that text, lists, tables, hyperlinks " +
    "and formatting survive while Word-specific junk is stripped, that hard returns and " +
    "pretty-printed source newlines do not create phantom line breaks, and that dead " +
    "file:/// image references never reach Appian.",

  "pdf-paste.spec.js":
    "Simulates pasting content copied from PDF viewers (Chrome's viewer, macOS Preview, " +
    "Acrobat), which place plain text only on the clipboard. Verifies multi-paragraph text, " +
    "bullet glyphs, hard-wrapped lines, URLs and typographic characters are all retained " +
    "with line structure intact.",

  "web-sources.spec.js":
    "Simulates pasting from ordinary web pages (article markup with wrapper divs, classes " +
    "and inline images) and from Excel (office namespaces, xl classes, colgroups). Verifies " +
    "full content retention — including the regression where an inline https image used to " +
    "cause the entire paste to be dropped — and that source-specific markup is stripped.",

  "rte-to-rte.spec.js":
    "Simulates copying content from one Rich Text Editor instance and pasting into another, " +
    "including one test that drives the real system clipboard with Cmd/Ctrl+C in Chromium. " +
    "Verifies every supported content type (headings, inline formatting, lists, links, " +
    "tables, images) survives the round trip identically.",

  "cursor-position.spec.js":
    "Pastes into EXISTING content rather than an empty editor: at a cursor position " +
    "mid-paragraph, inside list items, inside table cells, and replacing a selected range. " +
    "Verifies inline content inserts at the caret without splitting structure and that " +
    "selections are replaced by the pasted content.",

  "paste-cleanup.spec.js":
    "Verifies the empty-paragraph cleanup around pastes: pressing Enter before pasting " +
    "leaves no stray blank line, repeated pastes do not accumulate trailing blank " +
    "paragraphs, and blank paragraphs the user created intentionally are preserved.",

  "sanitization.spec.js":
    "Verifies hostile clipboard content is neutralized on paste: script/style/iframe tags " +
    "are removed together with their contents and never execute, inline event handlers are " +
    "stripped, javascript: links are unwrapped to plain text, and only https/file/mailto " +
    "hyperlinks survive.",

  "images.spec.js":
    "Covers image workflows: inserting images uploads them through the mocked connected " +
    "system and swaps the base64 src for the returned document URL, uploadedImages " +
    "bookkeeping (including wasRemovedFromField), multiple simultaneous uploads, upload " +
    "failures surfacing validations, allowImages=false stripping, and retention of " +
    "loadable/stored image sources.",

  "editor-lifecycle.spec.js":
    "Covers the editor plumbing the paste flows rely on: initial SAIL value rendering, " +
    "typing and saving on blur, readOnly mode and readOnly-to-editable rebuilds, maxSize " +
    "validation (typed and pasted), undo safety after paste, link creation defaults, and " +
    "toolbar formatting.",
};
