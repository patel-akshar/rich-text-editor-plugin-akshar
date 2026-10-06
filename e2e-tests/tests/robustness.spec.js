/**
 * Robustness under awkward conditions: pastes during in-flight uploads,
 * active formatting states, rapid repetition, very large content, and
 * malformed clipboard markup. Assertions pin bounded, user-visible claims
 * (nothing lost, editor still works, save settles) rather than timing.
 */
const { test, expect } = require("@playwright/test");
const {
  openEditor,
  pasteInto,
  getEditorHtml,
  getEditorText,
  getHarness,
  blurAndGetSaved,
} = require("./helpers");
const { TINY_PNG_BASE64 } = require("../fixtures/samples");

test.describe("paste robustness", () => {
  test("pasting text while an image upload is in flight: both survive, save settles once", async ({
    page,
  }) => {
    await openEditor(page, { allowImages: true });
    await page.evaluate(() => {
      window.__harness.uploadDelayMs = 1200;
    });
    // First paste starts a slow upload
    await pasteInto(page, { html: `<p>before image</p><img src="${TINY_PNG_BASE64}">` });
    // Second paste lands while the upload is still pending
    await pasteInto(page, { html: "<p>pasted during upload</p>" });

    await page.waitForFunction(() =>
      /mock\.appian\.local\/doc\//.test(window.$("#summernote").summernote("code"))
    );
    await page.waitForFunction(() => !!window.__harness.saved.richText);

    const harness = await getHarness(page);
    expect(harness.saved.richText).toContain("before image");
    expect(harness.saved.richText).toContain("pasted during upload");
    expect(harness.saved.richText).toContain("https://mock.appian.local/doc/1");
    expect(harness.saved.richText).not.toContain("data:image");
    expect(harness.clientApiCalls).toHaveLength(1);
  });

  test("link pasted while bold formatting is active keeps its href", async ({ page }) => {
    await openEditor(page);
    await page.locator(".note-editable").click();
    await page.keyboard.type("intro ");
    await page.keyboard.press("ControlOrMeta+b");
    await pasteInto(
      page,
      { html: '<a href="https://example.com/ref">reference link</a>' },
      { preserveSelection: true }
    );

    const html = await getEditorHtml(page);
    expect(html).toContain('href="https://example.com/ref"');
    expect(html).toContain("reference link");
  });

  test("10 rapid pastes without settling: all content present, save settles to the full value", async ({
    page,
  }) => {
    await openEditor(page);
    for (let i = 1; i <= 10; i++) {
      await pasteInto(page, { html: `<p>chunk ${i}</p>` });
    }

    // All ten chunks present AND in paste order - repeated pastes used to
    // land out of order
    const text = await getEditorText(page);
    let pos = -1;
    for (let i = 1; i <= 10; i++) {
      const next = text.indexOf(`chunk ${i}`);
      expect(next).toBeGreaterThan(pos);
      pos = next;
    }
    const saved = await blurAndGetSaved(page);
    pos = -1;
    for (let i = 1; i <= 10; i++) {
      const next = saved.richText.indexOf(`chunk ${i}`);
      expect(next).toBeGreaterThan(pos);
      pos = next;
    }
  });

  test("paste adds no styling beyond what the copied content carried", async ({ page }) => {
    // The editor must not decorate pasted content with its own fonts, spans,
    // classes or inline styles - what you copy is what gets stored
    await openEditor(page);
    await pasteInto(page, { html: "<p>plain text with <b>bold</b> and <i>italic</i></p>" });

    const saved = await blurAndGetSaved(page);
    expect(saved.richText).toContain("plain text with <b>bold</b> and <i>italic</i>");
    expect(saved.richText).not.toContain("style=");
    expect(saved.richText).not.toContain("class=");
    expect(saved.richText).not.toContain("<span");
    expect(saved.richText).not.toContain("<font");
  });

  test("pasting the same table three times leaves exactly three tables, none empty", async ({
    page,
  }) => {
    // Orphan-table guard: repeated table pastes must not leave empty table
    // shells or fragments behind
    await openEditor(page);
    for (let i = 1; i <= 3; i++) {
      await pasteInto(page, {
        html: `<table><tbody><tr><td>copy ${i}</td></tr></tbody></table>`,
      });
    }

    const html = (await getEditorHtml(page)).replace(/\s+/g, "");
    expect((html.match(/<table/g) || []).length).toBe(3);
    for (let i = 1; i <= 3; i++) {
      expect(html).toContain(`copy${i}`);
    }
    expect(html).not.toMatch(/<table[^>]*>(<tbody><\/tbody>)?<\/table>/);
  });

  test("large paste: a 600-row table and 150 paragraphs arrive intact", async ({ page }) => {
    await openEditor(page, { maxSize: 1000000 });
    const rows = Array.from(
      { length: 600 },
      (_, i) => `<tr><td>row ${i}</td><td>value ${i}</td></tr>`
    ).join("");
    const paragraphs = Array.from(
      { length: 150 },
      (_, i) => `<p>Paragraph ${i} of a long document with a sentence of real text.</p>`
    ).join("");
    await pasteInto(page, { html: `${paragraphs}<table><tbody>${rows}</tbody></table>` });

    const html = await getEditorHtml(page);
    expect(html).toContain("Paragraph 0 ");
    expect(html).toContain("Paragraph 149 ");
    expect(html).toContain("<td>row 0</td>");
    expect(html).toContain("<td>row 599</td>");
    expect((html.match(/<tr>/g) || []).length).toBe(600);
    // The editor is still responsive afterwards
    await page.keyboard.type("still alive");
    expect(await getEditorText(page)).toContain("still alive");
  });

  test("malformed clipboard HTML: no crash, text content retained", async ({ page }) => {
    await openEditor(page);
    await pasteInto(page, {
      html: "<p>good text<b>unclosed bold</div><table><tr><td>stray cell<p>trailing",
      text: "good text unclosed bold stray cell trailing",
    });

    const text = await getEditorText(page);
    expect(text).toContain("good text");
    expect(text).toContain("unclosed bold");
    // Editor still functional
    await page.keyboard.type(" and typing works");
    expect(await getEditorText(page)).toContain("and typing works");
  });
});
