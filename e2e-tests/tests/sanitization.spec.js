/**
 * Verifies hostile clipboard content is neutralized when pasted — scripts,
 * event handlers, iframes, javascript: links, and style tags must never make
 * it into the editor or execute.
 */
const { test, expect } = require("@playwright/test");
const { openEditor, pasteInto, getEditorHtml, getEditorText } = require("./helpers");
const samples = require("../fixtures/samples");

test.describe("paste sanitization", () => {
  test("script tags are removed with their contents and never execute", async ({ page }) => {
    await openEditor(page);
    await pasteInto(page, { html: samples.HOSTILE_SCRIPT });

    const html = await getEditorHtml(page);
    expect(html).toContain("before");
    expect(html).toContain("after");
    expect(html).not.toContain("<script");
    expect(html).not.toContain("__pwned");

    const pwned = await page.evaluate(() => window.__pwned);
    expect(pwned).toBeUndefined();
  });

  test("inline event handlers are stripped", async ({ page }) => {
    await openEditor(page);
    await pasteInto(page, { html: samples.HOSTILE_EVENT_HANDLER });

    const html = await getEditorHtml(page);
    expect(html).toContain("clickable");
    expect(html).not.toContain("onclick");
    expect(html).not.toContain("onmouseover");

    // Clicking the pasted content must not run anything
    await page.locator(".note-editable").click();
    const pwned = await page.evaluate(() => window.__pwned);
    expect(pwned).toBeUndefined();
  });

  test("iframes are removed entirely", async ({ page }) => {
    await openEditor(page);
    await pasteInto(page, { html: samples.HOSTILE_IFRAME });

    const html = await getEditorHtml(page);
    expect(html).toContain("text");
    expect(html).not.toContain("<iframe");
    expect(html).not.toContain("evil.example.com");
  });

  test("javascript: links are unwrapped to plain text", async ({ page }) => {
    await openEditor(page);
    await pasteInto(page, { html: samples.HOSTILE_JS_LINK });

    const html = await getEditorHtml(page);
    expect(html).toContain("bad link");
    expect(html).not.toContain("javascript:");
  });

  test("style tags are removed with their contents", async ({ page }) => {
    await openEditor(page);
    await pasteInto(page, { html: samples.HOSTILE_STYLE_TAG });

    const html = await getEditorHtml(page);
    expect(html).toContain("visible text");
    expect(html).not.toContain("<style");
    expect(html).not.toContain("display:none");
  });

  test("only https/file/mailto hyperlinks survive", async ({ page }) => {
    await openEditor(page);
    await pasteInto(page, {
      html:
        '<p><a href="https://good.example.com">good</a></p>' +
        '<p><a href="mailto:someone@example.com">mail</a></p>',
    });

    const html = await getEditorHtml(page);
    expect(html).toContain('href="https://good.example.com"');
    expect(html).toContain('href="mailto:someone@example.com"');
    expect(await getEditorText(page)).toContain("good");
  });
});
