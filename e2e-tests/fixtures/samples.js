/**
 * Generic HTML samples: RTE-to-RTE content, hostile/sanitization payloads, images.
 */

// Representative content another Summernote-based RTE would put on the clipboard
const RTE_RICH_CONTENT = [
  "<h3>Section Title</h3>",
  '<p style="">Plain paragraph with <b>bold</b>, <i>italic</i>, <u>underline</u> and <strike>strike</strike>.</p>',
  "<ul><li>Bullet one</li><li>Bullet two</li></ul>",
  "<ol><li>Number one</li><li>Number two</li></ol>",
  '<p><a href="https://example.com" target="_blank">A link</a></p>',
  "<table><tbody><tr><td>R1C1</td><td>R1C2</td></tr><tr><td>R2C1</td><td>R2C2</td></tr></tbody></table>",
].join("");

// Kitchen-sink retention fixture: every content type the editor supports,
// as another Summernote RTE would serialize it
const RTE_KITCHEN_SINK = [
  "<h3>Document Title</h3>",
  "<p>First paragraph with plain text.</p>",
  "<p>Second paragraph with <b>bold</b>, <i>italic</i>, <u>underline</u>, <strike>strike</strike>, <sup>sup</sup> and <sub>sub</sub>.</p>",
  '<p><span style="font-size: 18px;">Large text</span> and <span style="background-color: rgb(255, 255, 0);">highlighted text</span>.</p>',
  "<ul><li>Bullet A</li><li>Bullet B</li></ul>",
  "<ol><li>Step 1</li><li>Step 2</li></ol>",
  '<p>Visit <a href="https://example.com/page" target="_blank">the site</a> or <a href="mailto:me@example.com">email me</a>.</p>',
  "<table><tbody><tr><td>H1</td><td>H2</td></tr><tr><td>C1</td><td>C2</td></tr></tbody></table>",
  "<p>Closing paragraph.</p>",
].join("");

// Payloads that must be neutralized by cleanHtml on paste
const HOSTILE_SCRIPT = '<p>before</p><script>window.__pwned = true;</script><p>after</p>';
const HOSTILE_EVENT_HANDLER = '<p onclick="window.__pwned=true" onmouseover="window.__pwned=true">clickable</p>';
const HOSTILE_IFRAME = '<p>text</p><iframe src="https://evil.example.com"></iframe>';
const HOSTILE_JS_LINK = '<p><a href="javascript:window.__pwned=true">bad link</a></p>';
const HOSTILE_STYLE_TAG = "<style>body{display:none}</style><p>visible text</p>";

// 1x1 red PNG (68 bytes decoded) — plus padding comment to exceed the 100-char
// base64 threshold in uploadBase64Img so the upload path actually triggers.
const TINY_PNG_BASE64 =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

module.exports = {
  RTE_RICH_CONTENT,
  RTE_KITCHEN_SINK,
  HOSTILE_SCRIPT,
  HOSTILE_EVENT_HANDLER,
  HOSTILE_IFRAME,
  HOSTILE_JS_LINK,
  HOSTILE_STYLE_TAG,
  TINY_PNG_BASE64,
};
