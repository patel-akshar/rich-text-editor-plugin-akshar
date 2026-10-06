/**
 * Structure-within-structure pastes: nested lists, blocks pasted into list
 * items and table cells, and lists pasted into existing lists. These target
 * insertNode's historical weak spots — the priority is that NO CONTENT IS
 * LOST and the surrounding structure survives; exact nesting shape is pinned
 * where Summernote's behavior is stable.
 */
const { test, expect } = require("@playwright/test");
const {
  openEditor,
  pasteInto,
  getEditorHtml,
  getEditorText,
  setCursorInEditor,
} = require("./helpers");
const word = require("../fixtures/word-clipboard");

test.describe("nested structures", () => {
  test("web nested list: sub-items stay nested under their parents", async ({ page }) => {
    await openEditor(page);
    await pasteInto(page, {
      html:
        "<ul><li>Parent one<ul><li>Child one-a</li><li>Child one-b</li></ul></li>" +
        "<li>Parent two</li></ul>",
    });

    const html = await getEditorHtml(page);
    for (const item of ["Parent one", "Child one-a", "Child one-b", "Parent two"]) {
      expect(html).toContain(item);
    }
    // The inner <ul> survives inside the outer list
    expect(html.replace(/\s+/g, "")).toMatch(/<ul><li>Parentone<ul><li>Childone-a/);
    expect((html.match(/<ul/g) || []).length).toBe(2);
  });

  test("mixed nested list: numbered list inside a bulleted item survives", async ({ page }) => {
    await openEditor(page);
    await pasteInto(page, {
      html:
        "<ul><li>Options<ol><li>First choice</li><li>Second choice</li></ol></li></ul>",
    });

    const html = await getEditorHtml(page);
    expect(html).toContain("Options");
    expect(html).toMatch(/<ol>[\s\S]*First choice[\s\S]*Second choice/);
    expect(html.replace(/\s+/g, "")).toMatch(/<li>Options<ol>/);
  });

  test("Word nested list: every level's items and markers retained in order", async ({
    page,
  }) => {
    // Word expresses nesting as flat paragraphs with mso-list levels and
    // marker glyphs (· for level 1, o for level 2); the component preserves
    // them as marker-prefixed lines
    await openEditor(page);
    await pasteInto(page, { html: word.WORD_NESTED_LIST });

    const text = await getEditorText(page);
    const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
    const order = ["Parent one", "Child one-a", "Child one-b", "Parent two"];
    let pos = -1;
    for (const item of order) {
      const next = lines.findIndex((l) => l.includes(item));
      expect(next).toBeGreaterThan(pos);
      pos = next;
    }
    // Markers stay with their items (level1 ·, level2 o)
    expect(lines.find((l) => l.includes("Parent one"))).toMatch(/·/);
    expect(lines.find((l) => l.includes("Child one-a"))).toMatch(/^o\b/);
    // No mso leftovers
    expect(await getEditorHtml(page)).not.toContain("mso-list");
  });

  test("two paragraphs pasted inside a list item: no content lost, other items intact", async ({
    page,
  }) => {
    await openEditor(page, { richText: "<ul><li>one</li><li>two</li></ul>" });
    await setCursorInEditor(page, "one", "after");
    await pasteInto(
      page,
      { html: "<p>first para</p><p>second para</p>" },
      { preserveSelection: true }
    );

    const text = await getEditorText(page);
    expect(text).toContain("first para");
    expect(text).toContain("second para");
    expect(text).toContain("one");
    expect(text).toContain("two");
    // The untouched item is still a list item
    expect(await getEditorHtml(page)).toContain("<li>two</li>");
  });

  test("table pasted inside a table cell: no content lost, host table intact", async ({
    page,
  }) => {
    await openEditor(page, {
      richText: "<table><tbody><tr><td>host1</td><td>host2</td></tr></tbody></table>",
    });
    await setCursorInEditor(page, "host1", "after");
    await pasteInto(
      page,
      { html: "<table><tbody><tr><td>inner1</td><td>inner2</td></tr></tbody></table>" },
      { preserveSelection: true }
    );

    const text = await getEditorText(page);
    for (const cell of ["host1", "host2", "inner1", "inner2"]) {
      expect(text).toContain(cell);
    }
    const html = await getEditorHtml(page);
    expect(html).toContain("<td>host2</td>");
  });

  test("list pasted inside a list item: all items of both lists retained", async ({ page }) => {
    await openEditor(page, { richText: "<ul><li>existing one</li><li>existing two</li></ul>" });
    await setCursorInEditor(page, "existing one", "after");
    await pasteInto(
      page,
      { html: "<ul><li>pasted a</li><li>pasted b</li></ul>" },
      { preserveSelection: true }
    );

    const text = await getEditorText(page);
    for (const item of ["existing one", "existing two", "pasted a", "pasted b"]) {
      expect(text).toContain(item);
    }
    // Still list-structured: every item renders as a bullet line
    const html = await getEditorHtml(page);
    expect((html.match(/<li/g) || []).length).toBeGreaterThanOrEqual(4);
  });
});
