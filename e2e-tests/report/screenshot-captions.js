/**
 * Plain-language captions for the PDF report's screenshot appendix, keyed by
 * each test's full title (describe › title, as recorded in results.json).
 * Each caption describes what the screenshot shows in one or two simple
 * sentences a non-technical reader can follow. Tests without an entry fall
 * back to a generic caption built from the test title.
 */
module.exports = {
  // ── Microsoft Word paste ──────────────────────────────────────────────
  "MS Word paste › simple paragraphs: text survives, Word junk is stripped":
    "Two paragraphs copied from Word, shown after pasting. The text is intact and none of Word's hidden formatting codes came along.",
  "MS Word paste › REGRESSION (original reported bug): source newlines between inline spans stay one sentence":
    "The originally reported bug: a sentence Word had internally split across several pieces. It now pastes as one unbroken sentence on a single line, with its link intact.",
  "MS Word paste › bulleted list: items and markers preserved without mso remnants":
    "A bulleted list copied from Word. All three items appear with their bullet markers, free of Word's internal list codes.",
  "MS Word paste › numbered list: marker stays on the same line as its item text":
    "A numbered list copied from Word. Each number sits on the same line as its step text instead of breaking onto its own line.",
  "MS Word paste › hard returns (Shift+Enter) become a single <br>, not extra paragraphs":
    "A Word paragraph containing a Shift+Enter line break. It pastes as two lines in one paragraph — no extra blank lines added.",
  "MS Word paste › Word table: structure and cell content preserved, mso attributes stripped":
    "A 2×2 table copied from Word. The grid, headers and all cell values are preserved.",
  "MS Word paste › unquoted Word attributes (border=1 width=400) are stripped by the allowlist":
    "A table pasted from older Word markup. Its cells show correctly while Word's non-standard sizing attributes were removed.",
  "MS Word paste › hyperlinks: https and mailto URLs retained as working links":
    "Text pasted from Word containing a web link and an email link. Both remain clickable links after pasting.",
  "MS Word paste › formatting styles: bold/italic/underline/sup/sub/font-size retained":
    "A Word paragraph mixing bold, italic, underline, superscript, subscript and a larger font size. The supported formatting survives the paste.",
  "MS Word paste › embedded image: surrounding text retained; dead file:/// reference does not reach Appian":
    "Word content that included an embedded picture. The text before and after the picture is kept; the picture itself pointed at a file on the copier's computer (unusable on the web) and was safely dropped.",
  "MS Word paste › Word paste saves clean HTML back to Appian":
    "The editor after a Word paste was saved. What goes back to Appian is the clean text with no Word markup.",

  // ── PDF paste ─────────────────────────────────────────────────────────
  "PDF paste › multi-paragraph text: all paragraphs retained with line breaks":
    "Several paragraphs copied from a PDF. Every paragraph appears, separated correctly rather than merged into one block.",
  "PDF paste › bulleted list: bullet glyphs and every item retained on separate lines":
    "A bulleted list copied from a PDF. Each bullet appears on its own line with its bullet symbol.",
  "PDF paste › hard-wrapped lines: no text lost across the wraps":
    "A sentence a PDF had wrapped across three visual lines. All of the text made it into the editor — nothing was cut at the line wraps.",
  "PDF paste › URLs and email addresses retained as text":
    "Text copied from a PDF containing a web address and an email address. Both appear in full.",
  "PDF paste › typographic characters (smart quotes, dashes, ligatures) retained":
    "PDF text containing curly quotes, long dashes and joined letter pairs (ligatures). All the special characters display correctly.",
  "PDF paste › PDF paste saves back to Appian":
    "The editor after PDF content was pasted and saved. The saved value contains the pasted list.",
  "PDF paste › image copied from a PDF viewer pastes exactly once":
    "A picture copied out of a PDF viewer and pasted. Exactly one copy of the picture appears in the editor.",

  // ── Web page & Excel paste ───────────────────────────────────────────
  "web page paste › article copy: headings, paragraphs, formatting and links all retained":
    "A news-style article copied from a web page: its headline, both paragraphs, bold text and the link are all present after pasting.",
  "web page paste › article containing an https image pastes fully — text, link and image":
    "The same article including an inline photo. Everything pastes — headline, paragraphs, link and the image placeholder (the photo's address is a test URL, so the picture box may appear empty).",
  "web page paste › code block: line breaks inside <pre> content are preserved":
    "A three-line code snippet copied from a web page. Each statement stays on its own line instead of collapsing into one.",
  "web page paste › Outlook-style copy (text plus inline image file): the text is not lost":
    "Text copied from an Outlook email together with an inline picture. Both paragraphs of text paste correctly and the picture appears exactly once.",
  "web page paste › relative image URL in pasted HTML is dropped, surrounding text kept":
    "Pasted content referencing an image by a partial address that would not load outside its source page. The text is kept; the unloadable image reference is cleanly dropped.",
  "web page paste › right-click 'Copy image' pastes the image exactly once, not twice":
    "An image copied from a web page with right-click → Copy image. Exactly one copy of the picture appears in the editor — previously this scenario pasted the image twice.",
  "Excel paste › table structure and all cell values retained":
    "A 3-row spreadsheet range copied from Excel. The table grid and every cell value (regions and totals) are preserved.",
  "Excel paste › Excel-specific markup (xl classes, colgroup, office attrs) is stripped":
    "The same Excel table, confirming Excel's internal styling codes were removed while the visible table stayed intact.",
  "Excel paste › range copied with an embedded chart: table retained, dead temp-file image dropped":
    "An Excel range copied along with an embedded chart. The table pastes intact; the chart — which Excel represents as a file on the source computer that no one else can open — is cleanly dropped instead of showing a broken image.",

  // ── RTE-to-RTE copy/paste ────────────────────────────────────────────
  "RTE to RTE copy/paste › rich content pasted from one editor renders identically in another":
    "Content copied from one editor instance into another: heading, formatted text, bulleted and numbered lists, a link and a table all reproduced identically.",
  "RTE to RTE copy/paste › kitchen sink: every supported content type is retained across the paste":
    "A document using every supported feature at once — headings, all text styles, highlights, both list types, links and a table — after being pasted into a second editor. Everything is retained.",
  "RTE to RTE copy/paste › base64 image embedded in copied RTE content is retained and uploaded":
    "Editor content with an embedded picture pasted into another editor. The captions are retained and the picture is uploaded to Appian document storage, appearing exactly once.",
  "RTE to RTE copy/paste › content containing an uploaded (https) image pastes fully — text and image":
    "Content containing an already-uploaded image pasted into another editor. The text and the image reference are kept (the image address is a test URL, so the picture box may appear empty).",
  "RTE to RTE copy/paste › pasting a table adds a trailing paragraph so the cursor can move below it":
    "A pasted table with an automatic blank line added after it, so the user can click below the table and keep typing.",
  "RTE to RTE copy/paste › caret lands on the blank line below a pasted table, ready to type":
    "After pasting a table, the cursor sits on the blank line below it — typed text (“below”) lands under the table, not inside it or stuck at the table's edge.",
  "paste at cursor position › table pasted mid-content leaves exactly one blank line before the following text":
    "A table pasted between two existing paragraphs. Exactly one blank line separates the table from the text that follows — no doubled-up empty lines.",
  "RTE to RTE copy/paste › pasted content is saved back to Appian on blur":
    "Pasted content after clicking out of the editor. Clicking away triggers the save, and the pasted text is what gets stored.",
  "RTE to RTE copy/paste › real clipboard: select-all copy in editor A pastes into editor B (Chromium)":
    "The receiving editor after a real copy shortcut (Cmd/Ctrl+C) in one editor and paste into another — formatting included.",
  "RTE to RTE copy/paste › plain-text paste converts newlines to line breaks":
    "Three lines of plain text pasted from a basic text source. Each line appears on its own line instead of collapsing into one.",

  // ── Paste into existing content ──────────────────────────────────────
  "paste at cursor position › inline HTML pasted mid-paragraph lands at the cursor without splitting it":
    "Bold text pasted into the middle of an existing sentence. It lands exactly at the cursor and the sentence stays as one paragraph.",
  "paste at cursor position › single plain-text word pasted mid-paragraph inserts inline, not as a new paragraph":
    "A single word pasted into the middle of a sentence. The word joins the sentence rather than breaking it into separate paragraphs.",
  "paste at cursor position › paste inside a list item keeps the list structure intact":
    "Content pasted inside the first item of a bulleted list. The list keeps both items; nothing was split or duplicated.",
  "paste at cursor position › paste inside a table cell keeps the table structure intact":
    "Content pasted inside a table cell. The table still has both cells and the pasted text stayed inside the intended cell.",
  "paste at cursor position › paste over a selection replaces the selected text":
    "A word was highlighted and content pasted over it. The highlighted word is gone, replaced by the pasted content, with the surrounding text untouched.",

  // ── Blank-line cleanup on paste ──────────────────────────────────────
  "paste empty-paragraph cleanup › Enter-then-paste leaves no stray empty paragraph at the caret":
    "The user pressed Enter and then pasted a paragraph. The result is two clean paragraphs with no leftover blank line between them.",
  "paste empty-paragraph cleanup › repeated pastes do not accumulate trailing empty paragraphs":
    "Three pastes performed one after another. All three pasted paragraphs appear with no blank lines piling up at the bottom.",
  "paste empty-paragraph cleanup › blank paragraphs that existed before the paste are preserved":
    "The user had deliberately left two blank lines at the end before pasting. Those intentional blank lines are still there after the paste.",

  // ── Security / paste sanitization ────────────────────────────────────
  "paste sanitization › script tags are removed with their contents and never execute":
    "A paste that contained hidden program code (a script). The legitimate text appears; the code was removed entirely and never ran.",
  "paste sanitization › inline event handlers are stripped":
    "A paste with click-triggered code attached to its text. The text appears normally with the hidden code removed.",
  "paste sanitization › iframes are removed entirely":
    "A paste that tried to embed an external page frame. Only the legitimate text remains; the embedded frame was removed.",
  "paste sanitization › javascript: links are unwrapped to plain text":
    "A paste containing a link designed to run code when clicked. It was converted to harmless plain text.",
  "paste sanitization › style tags are removed with their contents":
    "A paste containing hidden page-styling code that could have hidden or altered content. The visible text remains; the styling code was removed.",
  "paste sanitization › only https/file/mailto hyperlinks survive":
    "Pasted links of different kinds. Safe links (secure web addresses and email links) remain clickable; unsafe kinds are reduced to plain text.",

  // ── Image handling & upload ──────────────────────────────────────────
  "image manipulation › inserted image is uploaded via the connected system and its src replaced":
    "An image inserted into the editor. It was automatically uploaded to Appian's document store and now points at the stored document (the tiny red square is the test image).",
  "image manipulation › multiple images inserted together are each uploaded and replaced":
    "Two images inserted at once. Both were uploaded and both now point at their stored documents.",
  "image manipulation › deleting an uploaded image marks it wasRemovedFromField on next save":
    "The editor after a previously uploaded image was deleted and replaced with text. The save correctly records that the image was removed.",
  "image manipulation › base64 image in pasted HTML: save waits for the upload, then goes through":
    "Content pasted with an embedded image. The save is held back while the image uploads (raw image data must never be stored), then goes through automatically with the Appian document link — previously this content never saved at all.",
  "image manipulation › http(s) image in pasted HTML survives paste-time cleaning":
    "A caption and a web-hosted image pasted together. Both are kept (the image address is a test URL, so the picture box may appear empty).",
  "image manipulation › images are stripped on paste when allowImages is false":
    "The same paste performed in a field configured to disallow images: the text is kept and the image was removed, as configured.",
  "image manipulation › stored content with a relative image src survives render and save":
    "Previously saved content whose image uses an Appian-internal address. The image reference is preserved through display and re-save (the address only resolves inside Appian, so the picture box may appear empty here).",
  "image manipulation › screenshot paste (image file only, no html flavor) inserts and uploads the image once":
    "A screenshot pasted straight from the clipboard (Ctrl/Cmd+V after a screen capture). One image appears and is uploaded to Appian document storage.",
  "image manipulation › screenshot paste is blocked when allowImages is false":
    "A screenshot pasted into a field configured to disallow images. Nothing is inserted and no upload occurs — previously the image slipped through even though images were disabled.",
  "image manipulation › multiple image files pasted together are each inserted and uploaded once":
    "Two image files pasted in a single paste. Both appear in the editor and each is uploaded to Appian document storage exactly once.",
  "image manipulation › non-PNG image file (JPEG) pastes and uploads like a PNG":
    "A JPEG photo pasted from the clipboard. It inserts and uploads the same way a PNG screenshot does.",
  "image manipulation › images nested inside pasted tables and lists are retained":
    "Pasted content with pictures inside a table cell and a bulleted list item. Both pictures stay in place within their structures.",
  "image manipulation › connected system failure surfaces a validation message":
    "An image upload that was made to fail on purpose. The editor surfaces a validation message instead of failing silently.",

  // ── Editor core behavior ─────────────────────────────────────────────
  "editor lifecycle › initial richText from Appian renders in the editor":
    "The editor immediately after loading a value provided by Appian. The stored content displays with its formatting.",
  "editor lifecycle › typed text is saved back to Appian on blur":
    "Text typed by keyboard, shown after clicking out of the field. Clicking away triggers the save to Appian.",
  "editor lifecycle › readOnly mode renders content without an editable surface":
    "The component in read-only mode: the content displays, but there is no editing surface or toolbar.",
  "editor lifecycle › flipping readOnly -> editable rebuilds the editor (SAIL re-render)":
    "The component after being switched from read-only to editable by the surrounding form. The toolbar and editing surface appear with the content preserved.",
  "editor lifecycle › content over maxSize triggers a validation and blocks the save":
    "More text typed than the field's configured size limit. A validation is raised and the oversized content is not saved.",
  "editor lifecycle › pasting content over maxSize triggers a validation and blocks the save":
    "A paste larger than the field's size limit. The paste is visible in the editor, a validation is raised, and the save is blocked.",
  "editor lifecycle › maxSize validation does not flash while an image uploads":
    "An image pasted into a field with a small size limit. No 'content too big' error appears while the image uploads — previously the error flashed on screen and disappeared once the upload finished.",
  "editor lifecycle › typed text over maxSize still validates while an image is uploading":
    "Oversized text typed alongside an uploading image. The genuine size violation is still reported — ignoring the uploading image does not blind the size check.",
  "web page paste › modern strikethrough (<s>) copied from a web page is retained":
    "Text with strikethrough formatting copied from a web page (a crossed-out price). The strikethrough survives the paste.",
  "editor lifecycle › undo after paste never corrupts pre-paste content":
    "The editor after pasting and then pressing Undo. Whatever Undo does to the paste, the content that existed beforehand is never lost.",
  "editor lifecycle › toolbar formatting: bold button produces bold saved output":
    "Text typed with the Bold toolbar button active. The text displays bold and is saved as bold.",
  "editor lifecycle › link creation: scheme-less URLs get https://, emails get mailto":
    "Links created through the editor's link tool. A bare address like example.com became a secure https link, and an email address became an email link.",

  // ── Nested structures ────────────────────────────────────────────────
  "nested structures › web nested list: sub-items stay nested under their parents":
    "A two-level bulleted list copied from a web page. The sub-items stay indented under their parent items after pasting.",
  "nested structures › mixed nested list: numbered list inside a bulleted item survives":
    "A numbered list nested inside a bulleted item. Both list types and the nesting are preserved.",
  "nested structures › Word nested list: every level's items and markers retained in order":
    "A two-level Word list (bullets with sub-bullets). Every item keeps its marker and its order; Word's internal list codes are stripped.",
  "nested structures › two paragraphs pasted inside a list item: no content lost, other items intact":
    "Two paragraphs pasted into the middle of a list item. Both paragraphs and both original list items survive.",
  "nested structures › table pasted inside a table cell: no content lost, host table intact":
    "A table pasted into a cell of an existing table. All cells of both tables remain present.",
  "nested structures › list pasted inside a list item: all items of both lists retained":
    "A bulleted list pasted inside an existing bulleted list. All four items — original and pasted — remain as list entries.",

  // ── Paste robustness ─────────────────────────────────────────────────
  "paste robustness › pasting text while an image upload is in flight: both survive, save settles once":
    "New text pasted while an earlier pasted image was still uploading. Both the text and the image make it into the saved value, with exactly one upload.",
  "paste robustness › link pasted while bold formatting is active keeps its href":
    "A hyperlink pasted while the Bold button was active. The link remains clickable with its address intact.",
  "paste robustness › 10 rapid pastes without settling: all content present, save settles to the full value":
    "Ten pastes in quick succession without pausing. All ten chunks appear and the final saved value contains every one.",
  "paste robustness › large paste: a 600-row table and 150 paragraphs arrive intact":
    "A very large paste — 150 paragraphs plus a 600-row table. Everything arrives, and the editor stays responsive afterwards.",
  "paste robustness › malformed clipboard HTML: no crash, text content retained":
    "Deliberately broken clipboard markup (unclosed tags, stray table parts). The text is still pasted and the editor keeps working.",

  // ── Mixed-content pastes ─────────────────────────────────────────────
  "mixed-content pastes › Word section with text, embedded image, list and table SAVES to Appian":
    "A Word document section pasted whole: heading, dates, an embedded screenshot, a bulleted list, a table and a link. Everything is retained, the screenshot is uploaded to Appian document storage, and the content saves — previously content like this rendered but silently never saved.",
  "mixed-content pastes › pasted base64 image with NO connected system: paste still works, save stays blocked":
    "The same embedded-image paste in a field with no image storage configured. The paste still works and nothing crashes; the save is correctly withheld since the image has nowhere to upload.",
  "mixed-content pastes › web article with image: text before and after the image, list and link all retained":
    "A web article pasted with a heading, text on both sides of an image, a numbered list and a link. Everything stays in place (the image address is a test URL, so the picture box may appear empty).",
  "mixed-content pastes › image directly before a table, table trailing: both retained, caret below the table":
    "A figure image followed by a table, pasted together. Both are retained, and the cursor is ready on the blank line below the table.",
  "mixed-content pastes › sequential pastes from different sources accumulate: Word text, Excel table, image file":
    "Three pastes in a row into the same field — a Word paragraph, an Excel range, then a screenshot. All three accumulate correctly and the screenshot uploads once.",
  "mixed-content pastes › multiple tables and images in one paste: all retained in document order":
    "Two tables and two images interleaved with text, pasted in one go. Everything lands in the right order and no image is swallowed into a table.",
  "mixed-content pastes › table pasted INTO existing text with an image following it keeps document order":
    "A table plus an image pasted into the middle of existing text. Everything lands in the right order: original text, table, image, remaining text — previously the image was swallowed into the table's last cell.",
};
