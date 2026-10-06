# Paste-Handling Fixes — richTextFieldWithTables

All changes are confined to `cp/richTextFieldWithTables/v1/index.js` (plus unit
tests under `cp/tests/richTextFieldWithTables/`). Each fix below was verified in
real browsers on the Chromium, Firefox and WebKit engines; "before" describes
the behavior of the current upstream component.

---

## 1. Content containing images pasted as nothing

**Before:** Pasting any HTML content that contained a web-hosted image — a news
article, another editor's content, a document with an uploaded image — inserted
**nothing at all**. The paste handler returned early on seeing an external
`<img>`, deferring to the `onImageUpload` callback — but that callback only
fires for image *files* on the clipboard, never for `<img>` tags inside HTML.

**Fix:** The early return is now keyed on the actual clipboard contents: it
applies only when the clipboard carries an image **file** and the HTML flavor
holds no visible text (the "right-click → Copy image" case, which Summernote's
own file path handles). All other HTML flows through `cleanHtml` and inserts
normally.

| Before (upstream) | After (this branch) |
|---|---|
| ![before](https://raw.githubusercontent.com/patel-akshar/rich-text-editor-plugin-akshar/master/docs/fixes/01-image-content-paste-before.png) | ![after](https://raw.githubusercontent.com/patel-akshar/rich-text-editor-plugin-akshar/master/docs/fixes/01-image-content-paste-after.png) |

## 2. Images embedded in pasted HTML never saved (silent data loss)

**Before:** Modern Word and Outlook embed images in clipboard HTML as base64
`data:` URIs. Such pastes rendered perfectly — and then **silently never saved**
to Appian: `setAppianValue` refuses to save while base64 image data is present
(correctly — raw image data must not be stored in SAIL), but nothing ever
uploaded an image that arrived inside HTML, so the save was blocked forever
with no error shown.

**Fix:** After inserting a paste, the handler scans for base64 images and runs
them through the same flow `onImageUpload` uses: `loading` marker →
`uploadBase64Img` → swap in the returned document URL → `setAppianValue`. The
content saves as soon as the upload round-trips, exactly like a screenshot
paste. `isImageNewBase64` skips images already uploading, so nothing is
processed twice.

| Before (upstream) | After (this branch) |
|---|---|
| ![before](https://raw.githubusercontent.com/patel-akshar/rich-text-editor-plugin-akshar/master/docs/fixes/02-embedded-image-saves-before.png) | ![after](https://raw.githubusercontent.com/patel-akshar/rich-text-editor-plugin-akshar/master/docs/fixes/02-embedded-image-saves-after.png) |

## 3. Double image paste from PDF viewers / text loss from Outlook

**Before:** Copying an image from a PDF viewer (file + html flavors on the
clipboard) pasted the image twice. Copying text with an inline image from
Outlook (file + text-bearing html) dropped the text.

**Fix:** When an image file is on the clipboard, the HTML flavor is skipped
only if it contains no visible text; otherwise the text proceeds and the image
still arrives exactly once via `onImageUpload`.

| Before (upstream) | After (this branch) |
|---|---|
| ![before](https://raw.githubusercontent.com/patel-akshar/rich-text-editor-plugin-akshar/master/docs/fixes/03-pdf-image-once-before.png) | ![after](https://raw.githubusercontent.com/patel-akshar/rich-text-editor-plugin-akshar/master/docs/fixes/03-pdf-image-once-after.png) |

## 4. Multi-line plain text lost lines after the first break

**Before:** Pasting multi-line plain text (Notepad, terminal, PDF viewers —
which put text-only clipboards) lost everything after the first line break, or
fused lines together: Summernote's `insertNode` derails on bare text + `<br>`
sequences.

**Fix:** Plain-text newlines convert to `<br>` and multi-line results are
wrapped in a single `<p>` before insertion; single-line text stays unwrapped so
it inserts inline without splitting the destination paragraph.

| Before (upstream) | After (this branch) |
|---|---|
| ![before](https://raw.githubusercontent.com/patel-akshar/rich-text-editor-plugin-akshar/master/docs/fixes/04-multiline-text-before.png) | ![after](https://raw.githubusercontent.com/patel-akshar/rich-text-editor-plugin-akshar/master/docs/fixes/04-multiline-text-after.png) |

## 5. Word pastes gained phantom line breaks

**Before:** Step 1 of `cleanHtml` converted leftover source newlines in
clipboard HTML into `<br>` tags. Word's HTML is pretty-printed, so sentences
arrived broken mid-line (the originally reported bug: newlines between inline
`<span>`s became visible breaks).

**Fix:** CR/LF in HTML clipboards is treated as ordinary whitespace — real line
breaks are already represented structurally (`<br>`, `<p>`). The one exception
is preformatted content: newlines inside `<pre>` blocks (code snippets copied
from web pages) *are* line breaks, and convert to `<br>` wrapped in a `<p>`.
The mso-list newline clearing also handles lone `\r` (previously `\r?\n` only).

| Before (upstream) | After (this branch) |
|---|---|
| ![before](https://raw.githubusercontent.com/patel-akshar/rich-text-editor-plugin-akshar/master/docs/fixes/05-word-phantom-breaks-before.png) | ![after](https://raw.githubusercontent.com/patel-akshar/rich-text-editor-plugin-akshar/master/docs/fixes/05-word-phantom-breaks-after.png) |

## 6. Whitespace between blocks derailed insertion

**Before:** Whitespace-only text nodes between block elements (newlines between
`<p>`s in the clipboard source) were inserted as nodes, derailing `insertNode` —
pasting a web article could insert only its heading and drop the body.

**Fix:** Whitespace-only text nodes adjacent to a block element on either side
are dropped (they are source formatting); whitespace between inline elements is
preserved as the real space it is.

## 7. Cursor landed inside/against pasted tables; content after tables swallowed

**Before:** After pasting a table the caret rendered against the table edge or
in its last cell until the first keystroke. Worse, any *inline* content (an
image, text) following a table in the same paste was inserted **into the
table's last cell** — `insertNode` leaves the caret there, and an "after the
table" range normalizes back into the cell. Mid-content table pastes also left
two blank lines instead of one.

**Fix:** After inserting a table mid-paste, the caret is parked inside an empty
paragraph below the table and Summernote's internal `lastRange` is synced (it
reads `lastRange`, not the live selection), so following inline content lands
below the table. For trailing tables, the split-remnant blank paragraph is
reused instead of adding a second one, and the selection is explicitly
collapsed at offset 0 of that paragraph so the caret renders on the blank line
below the table, ready to type.

| Before (upstream) | After (this branch) |
|---|---|
| ![before](https://raw.githubusercontent.com/patel-akshar/rich-text-editor-plugin-akshar/master/docs/fixes/07-tables-and-caret-before.png) | ![after](https://raw.githubusercontent.com/patel-akshar/rich-text-editor-plugin-akshar/master/docs/fixes/07-tables-and-caret-after.png) |

## 8. Paste side effects left stray blank paragraphs

**Before:** Pressing Enter and then pasting block content left a stray blank
line above the paste; repeated pastes accumulated empty trailing paragraphs —
dead weight against the field's character limit.

**Fix:** `removePasteArtifacts` removes the still-empty caret paragraph and any
*new* trailing empty paragraphs after a paste, while blank paragraphs that
existed beforehand (intentional spacing) are preserved via a pre-paste
snapshot.

| Before (upstream) | After (this branch) |
|---|---|
| ![before](https://raw.githubusercontent.com/patel-akshar/rich-text-editor-plugin-akshar/master/docs/fixes/08-stray-blank-lines-before.png) | ![after](https://raw.githubusercontent.com/patel-akshar/rich-text-editor-plugin-akshar/master/docs/fixes/08-stray-blank-lines-after.png) |

## 9. Script/style contents leaked into pasted text

**Before:** The tag-stripping pass removed dangerous tags but kept their inner
text — pasting content containing `<script>alert('xss')</script>` left
`alert('xss')` as visible text (and `<style>` bodies as stray CSS text).

**Fix:** A pre-pass (Step 0) strips `script`, `style`, `iframe`, `object`,
`embed` and `noscript` **together with their contents** before any other
processing.

| Before (upstream) | After (this branch) |
|---|---|
| ![before](https://raw.githubusercontent.com/patel-akshar/rich-text-editor-plugin-akshar/master/docs/fixes/09-script-leak-before.png) | ![after](https://raw.githubusercontent.com/patel-akshar/rich-text-editor-plugin-akshar/master/docs/fixes/09-script-leak-after.png) |

## 10. Word's unquoted attributes bypassed the sanitizer

**Before:** The attribute allowlist regex only matched double-quoted values
(`attr="v"`). Word emits unquoted attributes (`border=1 cellspacing=0`), which
slipped past the allowlist untouched.

**Fix:** The regex now matches double-quoted, single-quoted and unquoted
attribute forms, so every attribute faces the allowlist. (Maintainer note: the
commented-out IE refactor block still contains the old regex; port this change
if that block is ever revived.)

## 11. Dead image references reached Appian

**Before:** Word and Excel represent embedded images/charts in clipboard HTML
as references to temp files on the source machine
(`file:///C:/...clip_image001.png`) — unloadable for every other user. These
pasted as broken images and were saved.

**Fix:** A paste-time-only pass (Step 6.5) keeps `http(s):` and `data:` image
sources and drops everything else (`file:///`, `cid:`, relative paths). Scoped
to pastes via `isPartialHtml`, so stored content — e.g. relative document URLs
rendered from Appian — is never altered on render or save.

| Before (upstream) | After (this branch) |
|---|---|
| ![before](https://raw.githubusercontent.com/patel-akshar/rich-text-editor-plugin-akshar/master/docs/fixes/11-dead-image-refs-before.png) | ![after](https://raw.githubusercontent.com/patel-akshar/rich-text-editor-plugin-akshar/master/docs/fixes/11-dead-image-refs-after.png) |

## 12. Multi-line HTML comments survived sanitization

**Before:** Step 7's comment-removal regex (`/<!--.*?-->/g`) could not match
across line breaks, so Word's multi-line conditional comments survived.

**Fix:** `[\s\S]*?` makes the removal multi-line safe.

## 13. `allowImages=false` bypassed by image-file pastes

**Before:** `allowImages` gated the toolbar button and HTML-paste cleaning, but
pasting a screenshot (an image **file**) reached `onImageUpload` unchecked: the
image was inserted *and uploaded* in a field configured to disallow images.

**Fix:** `onImageUpload` itself now enforces `allowImages`, covering every
entry point to the callback.

| Before (upstream) | After (this branch) |
|---|---|
| ![before](https://raw.githubusercontent.com/patel-akshar/rich-text-editor-plugin-akshar/master/docs/fixes/13-allowimages-bypass-before.png) | ![after](https://raw.githubusercontent.com/patel-akshar/rich-text-editor-plugin-akshar/master/docs/fixes/13-allowimages-bypass-after.png) |

## 14. False "content too big" error during image uploads

**Before:** The maxSize validation counted an uploading image's base64 data
URI, so pasting an image into a size-limited field flashed a "content exceeds
maximum size" error that disappeared once the upload returned the short
document URL.

**Fix:** The size check measures content as it would be *saved*, excluding
in-flight `data:` image sources (base64 is never saved out). Genuinely
oversized text still validates, and the computation stays behind the readOnly
guard (`getEditorContents` throws when the editor is destroyed in readOnly
mode).

| Before (upstream) | After (this branch) |
|---|---|
| ![before](https://raw.githubusercontent.com/patel-akshar/rich-text-editor-plugin-akshar/master/docs/fixes/14-maxsize-flash-before.png) | ![after](https://raw.githubusercontent.com/patel-akshar/rich-text-editor-plugin-akshar/master/docs/fixes/14-maxsize-flash-after.png) |

## 15. Modern strikethrough stripped

**Before:** The tag allowlist had `<strike>` (legacy) but not `<s>` — the tag
current web pages actually emit — so strikethrough copied from the web pasted
as plain text.

**Fix:** `<s>` added to the allowlist.

---

### Verification

The identical browser test suite (Chromium, Firefox and WebKit engines) was run
against the upstream component and this branch:

| | Upstream | This branch |
|---|---|---|
| Test executions passing | 198 | 298 |
| Test executions failing | 100 | 0 |

Every upstream failure maps to one of the fixes above; every scenario that
passes on upstream also passes on this branch, confirming existing behavior was
preserved. Unit tests: 240 passing (`cd cp && npx jest`).

🤖 Generated with [Claude Code](https://claude.com/claude-code)

| Before (upstream) | After (this branch) |
|---|---|
| ![before](https://raw.githubusercontent.com/patel-akshar/rich-text-editor-plugin-akshar/master/docs/fixes/15-formatting-before.png) | ![after](https://raw.githubusercontent.com/patel-akshar/rich-text-editor-plugin-akshar/master/docs/fixes/15-formatting-after.png) |

