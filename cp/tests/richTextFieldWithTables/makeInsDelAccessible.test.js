/**
 * Tests for makeInsDelAccessible() and escapeAttr() from richTextFieldWithTables/v1/index.js
 *
 * makeInsDelAccessible replaces <ins> and <del> elements in the readOnly DOM
 * with aria-labeled <span> elements so screen readers announce "Added:" or
 * "Removed:" without VoiceOver double-reading the content.
 */

const { makeInsDelAccessible, escapeAttr } = require("../../richTextFieldWithTables/v1/index.js");

describe("escapeAttr", () => {
  test("escapes double quotes", () => {
    expect(escapeAttr('say "hello"')).toBe("say &quot;hello&quot;");
  });

  test("returns empty string for null/undefined", () => {
    expect(escapeAttr(null)).toBe("");
    expect(escapeAttr(undefined)).toBe("");
    expect(escapeAttr("")).toBe("");
  });

  test("leaves strings without quotes unchanged", () => {
    expect(escapeAttr("plain text")).toBe("plain text");
  });

  test("escapes multiple double quotes", () => {
    expect(escapeAttr('"a" and "b"')).toBe("&quot;a&quot; and &quot;b&quot;");
  });
});

describe("makeInsDelAccessible", () => {
  let container;

  beforeEach(() => {
    container = document.getElementById("summernote");
    container.innerHTML = "";
  });

  test("replaces <ins> with accessible span", () => {
    container.innerHTML = "<ins>inserted text</ins>";
    makeInsDelAccessible();

    const spans = container.querySelectorAll("span");
    expect(spans).toHaveLength(1);
    expect(spans[0].getAttribute("role")).toBe("img");
    expect(spans[0].getAttribute("aria-label")).toBe("Added: inserted text");
    expect(spans[0].innerHTML).toBe("inserted text");
  });

  test("replaces <del> with accessible span", () => {
    container.innerHTML = "<del>deleted text</del>";
    makeInsDelAccessible();

    const spans = container.querySelectorAll("span");
    expect(spans).toHaveLength(1);
    expect(spans[0].getAttribute("role")).toBe("img");
    expect(spans[0].getAttribute("aria-label")).toBe("Removed: deleted text");
    expect(spans[0].innerHTML).toBe("deleted text");
  });

  test("preserves style attribute from <ins>", () => {
    container.innerHTML = '<ins style="color: red;">styled insert</ins>';
    makeInsDelAccessible();

    const span = container.querySelector("span");
    expect(span.getAttribute("style")).toBe("color: red;");
  });

  test("preserves style attribute from <del>", () => {
    container.innerHTML = '<del style="text-decoration: line-through;">styled delete</del>';
    makeInsDelAccessible();

    const span = container.querySelector("span");
    expect(span.getAttribute("style")).toBe("text-decoration: line-through;");
  });

  test("does not add style attribute when element has none", () => {
    container.innerHTML = "<ins>no style</ins>";
    makeInsDelAccessible();

    const span = container.querySelector("span");
    expect(span.hasAttribute("style")).toBe(false);
  });

  test("handles multiple <ins> and <del> elements", () => {
    container.innerHTML =
      "<p><ins>added A</ins> normal <del>removed B</del> more <ins>added C</ins></p>";
    makeInsDelAccessible();

    const spans = container.querySelectorAll("span[role='img']");
    expect(spans).toHaveLength(3);
    expect(spans[0].getAttribute("aria-label")).toBe("Added: added A");
    expect(spans[1].getAttribute("aria-label")).toBe("Removed: removed B");
    expect(spans[2].getAttribute("aria-label")).toBe("Added: added C");
  });

  test("preserves inner HTML (nested elements) within <ins>", () => {
    container.innerHTML = "<ins><b>bold</b> and <i>italic</i></ins>";
    makeInsDelAccessible();

    const span = container.querySelector("span");
    expect(span.innerHTML).toBe("<b>bold</b> and <i>italic</i>");
    // aria-label uses textContent, so it flattens the nested HTML
    expect(span.getAttribute("aria-label")).toBe("Added: bold and italic");
  });

  test("preserves inner HTML (nested elements) within <del>", () => {
    container.innerHTML = "<del><b>bold</b> removed</del>";
    makeInsDelAccessible();

    const span = container.querySelector("span");
    expect(span.innerHTML).toBe("<b>bold</b> removed");
    expect(span.getAttribute("aria-label")).toBe("Removed: bold removed");
  });

  test("escapes double quotes in aria-label", () => {
    container.innerHTML = '<ins>say "hello"</ins>';
    makeInsDelAccessible();

    const span = container.querySelector("span");
    expect(span.getAttribute("aria-label")).toBe("Added: say &quot;hello&quot;");
  });

  test("no-ops when #summernote container does not exist", () => {
    container.remove();
    expect(() => makeInsDelAccessible()).not.toThrow();

    // Restore for other tests
    const div = document.createElement("div");
    div.id = "summernote";
    document.body.appendChild(div);
  });

  test("no-ops when container has no <ins> or <del>", () => {
    container.innerHTML = "<p>just a paragraph</p>";
    makeInsDelAccessible();

    expect(container.innerHTML).toBe("<p>just a paragraph</p>");
  });

  test("handles empty <ins> element", () => {
    container.innerHTML = "<ins></ins>";
    makeInsDelAccessible();

    const span = container.querySelector("span");
    expect(span.getAttribute("aria-label")).toBe("Added: ");
    expect(span.innerHTML).toBe("");
  });

  test("handles empty <del> element", () => {
    container.innerHTML = "<del></del>";
    makeInsDelAccessible();

    const span = container.querySelector("span");
    expect(span.getAttribute("aria-label")).toBe("Removed: ");
    expect(span.innerHTML).toBe("");
  });

  test("removes all <ins> and <del> elements from the DOM", () => {
    container.innerHTML = "<ins>a</ins><del>b</del>";
    makeInsDelAccessible();

    expect(container.querySelectorAll("ins")).toHaveLength(0);
    expect(container.querySelectorAll("del")).toHaveLength(0);
  });
});
