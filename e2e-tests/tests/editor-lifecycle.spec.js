/**
 * Core editor behavior: typing, initial SAIL value, readOnly mode, and
 * maxSize validation — the surrounding plumbing the paste/image flows rely on.
 */
const { test, expect } = require("@playwright/test");
const { openEditor, getEditorText, blurAndGetSaved, getHarness } = require("./helpers");

test.describe("editor lifecycle", () => {
  test("initial richText from Appian renders in the editor", async ({ page }) => {
    await openEditor(page, { richText: "<p>Initial <b>value</b> from SAIL</p>" });
    const text = await getEditorText(page);
    expect(text).toContain("Initial value from SAIL");
  });

  test("typed text is saved back to Appian on blur", async ({ page }) => {
    await openEditor(page);
    await page.locator(".note-editable").click();
    await page.keyboard.type("Hello from a real keyboard");

    const saved = await blurAndGetSaved(page);
    expect(saved.richText).toContain("Hello from a real keyboard");
  });

  test("readOnly mode renders content without an editable surface", async ({ page }) => {
    await openEditor(page, {
      readOnly: true,
      richText: "<p>read only content</p>",
    });
    await expect(page.locator(".note-editable")).toHaveCount(0);
    await expect(page.locator("#summernote")).toContainText("read only content");
  });

  test("flipping readOnly -> editable rebuilds the editor (SAIL re-render)", async ({
    page,
  }) => {
    await openEditor(page, { readOnly: true, richText: "<p>start locked</p>" });
    await expect(page.locator(".note-editable")).toHaveCount(0);

    await page.evaluate(() => window.__harness.applyParams({ readOnly: false }));
    await expect(page.locator(".note-editable")).toHaveCount(1);
    expect(await getEditorText(page)).toContain("start locked");
  });

  test("content over maxSize triggers a validation and blocks the save", async ({ page }) => {
    await openEditor(page, { maxSize: 50 });
    await page.locator(".note-editable").click();
    await page.keyboard.type("x".repeat(80));
    await page.locator(".note-editable").blur();

    const harness = await getHarness(page);
    expect(harness.validations.length).toBeGreaterThan(0);
    expect(harness.saved.richText).toBeUndefined();
  });

  test("toolbar formatting: bold button produces bold saved output", async ({ page }) => {
    await openEditor(page);
    await page.locator(".note-editable").click();
    await page.keyboard.press("ControlOrMeta+b");
    await page.keyboard.type("emphasized");

    const saved = await blurAndGetSaved(page);
    expect(saved.richText).toMatch(/<(b|strong)>emphasized<\/(b|strong)>/);
  });
});
