/**
 * Tests for cleanHtml() paste enhancements from richTextFieldWithTables/v1/index.js
 *
 * Covers: empty span replacement, orphan table row repair,
 * newline-in-attributes handling, updated link regex, Word list cleanup.
 */

const { cleanHtml } = require("../../richTextFieldWithTables/v1/index.js");

describe("cleanHtml - empty span replacement", () => {
  test("replaces empty span with a space", () => {
    const input = "<p>before<span></span>after</p>";
    const result = cleanHtml(input);
    expect(result).not.toContain("<span></span>");
    expect(result).toContain("before");
    expect(result).toContain("after");
  });

  test("replaces empty span with attributes with a space", () => {
    const input = '<p>before<span style="font-size: 14px;"> </span>after</p>';
    const result = cleanHtml(input);
    expect(result).toContain("before");
    expect(result).toContain("after");
  });

  test("replaces multiple empty spans", () => {
    const input = "<p><span></span>text<span></span></p>";
    const result = cleanHtml(input);
    expect(result).toContain("text");
    // Should not have any empty spans left
    expect(result).not.toMatch(/<span[^>]*>\s*<\/span>/);
  });
});

describe("cleanHtml - orphan table row repair", () => {
  test("wraps bare <tr> in <table> tags", () => {
    const input = "<tr><td>cell 1</td><td>cell 2</td></tr>";
    const result = cleanHtml(input);
    expect(result).toMatch(/^<table>.*<\/table>$/);
    expect(result).toContain("<tr>");
    expect(result).toContain("<td>cell 1</td>");
  });

  test("wraps multiple bare <tr> rows in <table>", () => {
    const input = "<tr><td>A</td></tr><tr><td>B</td></tr>";
    const result = cleanHtml(input);
    expect(result).toMatch(/^<table>.*<\/table>$/);
    expect(result).toContain("<td>A</td>");
    expect(result).toContain("<td>B</td>");
  });

  test("does not double-wrap when <table> already exists", () => {
    const input = "<table><tr><td>cell</td></tr></table>";
    const result = cleanHtml(input);
    expect(result).not.toContain("<table><table>");
    expect(result).toContain("<table><tr>");
  });

  test("does not add <table> when no <tr> present", () => {
    const input = "<p>no table here</p>";
    const result = cleanHtml(input);
    expect(result).not.toContain("<table>");
  });
});

describe("cleanHtml - newline inside tag attributes", () => {
  test("strips newlines from inside tag attributes during partial paste", () => {
    const input = '<span style="font-size: 14px;\ncolor: red;">text</span>';
    const result = cleanHtml(input, true);
    // The newline inside the tag should become a space, not a <br>
    expect(result).not.toContain("<br>");
    expect(result).toContain("text");
  });

  test("preserves newlines in text content as <br> during partial paste", () => {
    const input = "<p>line one\nline two</p>";
    const result = cleanHtml(input, true);
    expect(result).toContain("<br>");
    expect(result).toContain("line one");
    expect(result).toContain("line two");
  });

  test("handles mixed: newlines in attributes and in text", () => {
    const input =
      '<p style="margin-left: 1em;\ntext-align: center;">before\nafter</p>';
    const result = cleanHtml(input, true);
    // Newline in attribute should not produce <br>
    expect(result).not.toMatch(/style="[^"]*<br>[^"]*"/);
    // Newline in text content should produce <br>
    expect(result).toContain("before<br>after");
  });
});

describe("cleanHtml - updated link regex", () => {
  test("preserves file:// links", () => {
    const input = '<a href="file://server/share/doc.pdf">doc</a>';
    const result = cleanHtml(input);
    expect(result).toContain('href="file://server/share/doc.pdf"');
  });

  test("preserves file:\\\\ UNC links", () => {
    const input = '<a href="file:\\\\server\\share\\doc.pdf">doc</a>';
    const result = cleanHtml(input);
    expect(result).toContain("href=");
    expect(result).toContain("doc</a>");
  });

  test("preserves https links", () => {
    const input = '<a href="https://example.com">link</a>';
    expect(cleanHtml(input)).toBe(input);
  });

  test("preserves mailto links", () => {
    const input = '<a href="mailto:user@example.com">email</a>';
    expect(cleanHtml(input)).toBe(input);
  });

  test("preserves links with custom protocol scheme", () => {
    const input =
      '<a href="Microsoft-edge:https://www.google.com">edge link</a>';
    const result = cleanHtml(input);
    expect(result).toContain("href=");
    expect(result).toContain("edge link</a>");
  });

  test("strips http:// links (not https)", () => {
    const input = '<a href="http://example.com">link</a>';
    const result = cleanHtml(input);
    expect(result).toBe("link");
  });

  test("strips relative links", () => {
    const input = '<a href="/page">link</a>';
    expect(cleanHtml(input)).toBe("link");
  });

  test("strips javascript: links", () => {
    const input = '<a href="javascript:alert(1)">click</a>';
    expect(cleanHtml(input)).toBe("click");
  });
});

describe("cleanHtml - Word ordered list cleanup", () => {
  test("Word conditional comments are removed by cleanHtml", () => {
    // The mso-list newline cleanup happens in the paste handler BEFORE cleanHtml.
    // cleanHtml itself strips the HTML comments (<!--[if]-->...<!--[endif]-->).
    const input =
      '<p style="margin-left: 1em;"><!--[if !supportLists]--><span>1.</span><!--[endif]-->Item one</p>';
    const result = cleanHtml(input, true);
    expect(result).toContain("Item one");
    expect(result).not.toContain("<!--");
    expect(result).not.toContain("[if");
  });
});
