/**
 * cleanHtml must remove images whose source cannot load in a browser context —
 * chiefly Word's file:///...clip_image001.png clipboard references, which point
 * at a temp file on the copier's machine and would otherwise be saved out to
 * Appian as permanently broken images.
 *
 * NOTE: in this unit environment allowImages is false (onNewValue is never
 * fired), so <img> is stripped by the tag allowlist regardless. These tests
 * assert the guarantee that matters at this level: dead references never
 * survive, and surrounding content does. The keep-side (https/data images
 * surviving when allowImages is true) is covered by the browser e2e suite.
 */

const { cleanHtml } = require("../../richTextFieldWithTables/v1/index.js");

describe("cleanHtml - image source filtering", () => {
  test("file:/// image from Word is removed, surrounding text kept", () => {
    const input =
      '<p>before</p><p><img width=160 height=120 src="file:///C:/Users/AKSHAR~1/AppData/Local/Temp/msohtmlclip1/01/clip_image002.png"></p><p>after</p>';
    const out = cleanHtml(input, true);
    expect(out).not.toContain("<img");
    expect(out).not.toContain("file:///");
    expect(out).toContain("before");
    expect(out).toContain("after");
  });

  test("src-less image is removed", () => {
    const out = cleanHtml("<p>text<img alt=broken></p>", true);
    expect(out).not.toContain("<img");
    expect(out).toContain("text");
  });

  test("javascript: image source is removed", () => {
    const out = cleanHtml('<p>x<img src="javascript:alert(1)"></p>', true);
    expect(out).not.toContain("<img");
    expect(out).not.toContain("javascript:");
  });
});
