/**
 * Tests for makeInsDelAccessible() from richTextFieldWithTables/v1/index.js
 *
 * makeInsDelAccessible injects visually-hidden text markers at the boundaries
 * of added/removed blocks and replaces <ins>/<del> with plain <span>s.
 * This is the only method with full screen reader support across NVDA, JAWS, and VoiceOver.
 */

const { makeInsDelAccessible } = require("../../richTextFieldWithTables/v1/index.js");

describe("makeInsDelAccessible - visually-hidden markers", () => {
  let container;

  beforeEach(() => {
    container = document.getElementById("summernote");
    container.innerHTML = "";
  });

  test("replaces <ins> with visually-hidden markers and plain span", () => {
    container.innerHTML = '<p>before <ins><font color="#117C00">added word</font></ins> after</p>';
    makeInsDelAccessible();

    // No role="img" or aria-label should exist
    expect(container.querySelector('[role="img"]')).toBeNull();
    expect(container.querySelector("[aria-label]")).toBeNull();

    // Should have visually-hidden markers
    var hiddenSpans = container.querySelectorAll(".visually-hidden");
    expect(hiddenSpans.length).toBe(2);
    expect(hiddenSpans[0].textContent).toBe("Begin added text");
    expect(hiddenSpans[1].textContent).toBe("End added text");

    // The <ins> should be replaced with a plain <span>
    expect(container.querySelector("ins")).toBeNull();
  });

  test("replaces <del> with visually-hidden markers and plain span", () => {
    container.innerHTML =
      '<p>before <del><font color="#9F0019"><strike>removed word</strike></font></del> after</p>';
    makeInsDelAccessible();

    expect(container.querySelector('[role="img"]')).toBeNull();
    expect(container.querySelector("[aria-label]")).toBeNull();

    var hiddenSpans = container.querySelectorAll(".visually-hidden");
    expect(hiddenSpans.length).toBe(2);
    expect(hiddenSpans[0].textContent).toBe("Begin removed text");
    expect(hiddenSpans[1].textContent).toBe("End removed text");

    expect(container.querySelector("del")).toBeNull();
  });

  test("consecutive same-type elements get single begin/end pair", () => {
    container.innerHTML =
      "<p><del><strike>word1</strike></del><del><strike>word2</strike></del>" +
      "<del><strike>word3</strike></del></p>";
    makeInsDelAccessible();

    var hiddenSpans = container.querySelectorAll(".visually-hidden");
    // One begin + one end for the entire run
    expect(hiddenSpans.length).toBe(2);
    expect(hiddenSpans[0].textContent).toBe("Begin removed text");
    expect(hiddenSpans[1].textContent).toBe("End removed text");
  });

  test("non-consecutive blocks get separate markers", () => {
    container.innerHTML = "<p><ins>added1</ins> unchanged text <ins>added2</ins></p>";
    makeInsDelAccessible();

    var hiddenSpans = container.querySelectorAll(".visually-hidden");
    // Two separate groups = 2 begin + 2 end = 4 markers
    expect(hiddenSpans.length).toBe(4);
    expect(hiddenSpans[0].textContent).toBe("Begin added text");
    expect(hiddenSpans[1].textContent).toBe("End added text");
    expect(hiddenSpans[2].textContent).toBe("Begin added text");
    expect(hiddenSpans[3].textContent).toBe("End added text");
  });

  test("mixed ins and del get independent markers", () => {
    container.innerHTML = "<p><del>removed</del><ins>added</ins></p>";
    makeInsDelAccessible();

    var hiddenSpans = container.querySelectorAll(".visually-hidden");
    expect(hiddenSpans.length).toBe(4);
    expect(hiddenSpans[0].textContent).toBe("Begin removed text");
    expect(hiddenSpans[1].textContent).toBe("End removed text");
    expect(hiddenSpans[2].textContent).toBe("Begin added text");
    expect(hiddenSpans[3].textContent).toBe("End added text");
  });

  test("preserves inline styles on replacement spans", () => {
    container.innerHTML = '<p><ins style="color: green;">styled</ins></p>';
    makeInsDelAccessible();

    var spans = container.querySelectorAll("p > span:not(.visually-hidden)");
    var styledSpan = Array.from(spans).find(function (s) {
      return s.getAttribute("style");
    });
    expect(styledSpan).not.toBeNull();
    expect(styledSpan.getAttribute("style")).toBe("color: green;");
  });

  test("does not crash when no ins/del elements exist", () => {
    container.innerHTML = "<p>plain text with no diff markers</p>";
    expect(() => makeInsDelAccessible()).not.toThrow();
    expect(container.querySelectorAll(".visually-hidden").length).toBe(0);
  });

  test("does not crash when summernote container is missing", () => {
    container.remove();
    expect(() => makeInsDelAccessible()).not.toThrow();

    // Restore for other tests
    var div = document.createElement("div");
    div.id = "summernote";
    document.body.appendChild(div);
  });

  test("removes all <ins> and <del> elements from the DOM", () => {
    container.innerHTML = "<ins>a</ins><del>b</del>";
    makeInsDelAccessible();

    expect(container.querySelectorAll("ins")).toHaveLength(0);
    expect(container.querySelectorAll("del")).toHaveLength(0);
  });

  test("handles empty <ins> element", () => {
    container.innerHTML = "<ins></ins>";
    makeInsDelAccessible();

    var hiddenSpans = container.querySelectorAll(".visually-hidden");
    expect(hiddenSpans.length).toBe(2);
    expect(hiddenSpans[0].textContent).toBe("Begin added text");
    expect(hiddenSpans[1].textContent).toBe("End added text");
  });

  test("preserves inner HTML (nested elements) within replaced spans", () => {
    container.innerHTML = "<ins><b>bold</b> and <i>italic</i></ins>";
    makeInsDelAccessible();

    var spans = container.querySelectorAll("span:not(.visually-hidden)");
    expect(spans.length).toBe(1);
    expect(spans[0].innerHTML).toBe("<b>bold</b> and <i>italic</i>");
  });
});
