/**
 * Tests for cleanHtml() from richTextFieldWithTables/v1/index.js
 */

const { cleanHtml } = require("../../richTextFieldWithTables/v1/index.js");

describe("cleanHtml", () => {
  // ── Empty / null-ish input ──────────────────────────────────────────
  describe("empty and minimal input", () => {
    test("returns empty string for empty input", () => {
      expect(cleanHtml("")).toBe("");
    });

    test("wraps plain text in <p> tags for full clean", () => {
      expect(cleanHtml("hello")).toBe("<p>hello</p>");
    });

    test("single space is preserved", () => {
      expect(cleanHtml(" ")).toBe("<p> </p>");
    });
  });

  // ── Step 1: HTML conversion / newline handling ─────────────────────
  describe("Step 1: HTML conversion and newline handling", () => {
    describe("full clean of HTML (isPartialHtml=false, starts with <)", () => {
      test("removes \\n from HTML content", () => {
        expect(cleanHtml("<p>hello\nworld</p>")).toBe("<p>helloworld</p>");
      });

      test("removes \\r\\n from HTML content", () => {
        expect(cleanHtml("<p>hello\r\nworld</p>")).toBe("<p>helloworld</p>");
      });
    });

    describe("full clean of raw text (isPartialHtml=false, no <)", () => {
      test("wraps in <p> and converts newlines to <br>", () => {
        expect(cleanHtml("line1\nline2")).toBe("<p>line1<br>line2</p>");
      });

      test("handles \\r\\n in raw text", () => {
        expect(cleanHtml("line1\r\nline2")).toBe("<p>line1<br>line2</p>");
      });

      test("handles multiple newlines", () => {
        expect(cleanHtml("a\nb\nc")).toBe("<p>a<br>b<br>c</p>");
      });
    });

    describe("partial HTML paste (isPartialHtml=true, starts with <)", () => {
      test("replaces \\r\\n with space (Word-style)", () => {
        expect(cleanHtml("<p>hello\r\nworld</p>", true)).toBe("<p>hello world</p>");
      });

      test("replaces \\n with <br>", () => {
        expect(cleanHtml("<p>hello\nworld</p>", true)).toBe("<p>hello<br>world</p>");
      });

      test("removes whitespace between tags", () => {
        expect(cleanHtml("<p>hello</p>  <p>world</p>", true)).toBe("<p>hello</p><p>world</p>");
      });

      test("removes MsoNormal class (Word paste)", () => {
        expect(cleanHtml('<p class="MsoNormal">hello</p>', true)).toBe("<p>hello</p>");
      });

      test("removes MsoNormal with single quotes", () => {
        expect(cleanHtml("<p class='MsoNormal'>hello</p>", true)).toBe("<p>hello</p>");
      });

      test("removes MsoNormal without quotes", () => {
        expect(cleanHtml("<p class=MsoNormal>hello</p>", true)).toBe("<p>hello</p>");
      });
    });

    describe("partial raw text paste (isPartialHtml=true, no <)", () => {
      test("converts newlines to <br>", () => {
        expect(cleanHtml("line1\nline2", true)).toBe("line1<br>line2");
      });

      test("does NOT wrap in <p> tags", () => {
        const result = cleanHtml("just text", true);
        expect(result).toBe("just text");
        expect(result).not.toContain("<p>");
      });
    });
  });

  // ── Step 2: Tag stripping ──────────────────────────────────────────
  describe("Step 2: Disallowed tag removal", () => {
    test("preserves allowed tags: p, b, i, u, strong, em", () => {
      const input =
        "<p><b>bold</b> <i>italic</i> <u>underline</u> <strong>strong</strong> <em>em</em></p>";
      expect(cleanHtml(input)).toBe(input);
    });

    test("preserves heading tags h1-h6", () => {
      expect(cleanHtml("<h1>heading</h1>")).toBe("<h1>heading</h1>");
      expect(cleanHtml("<h3>heading</h3>")).toBe("<h3>heading</h3>");
      expect(cleanHtml("<h6>heading</h6>")).toBe("<h6>heading</h6>");
    });

    test("preserves list tags", () => {
      expect(cleanHtml("<ul><li>item</li></ul>")).toBe("<ul><li>item</li></ul>");
      expect(cleanHtml("<ol><li>item</li></ol>")).toBe("<ol><li>item</li></ol>");
    });

    test("preserves table tags", () => {
      const input = "<table><tbody><tr><th>H</th><td>D</td></tr></tbody></table>";
      expect(cleanHtml(input)).toBe(input);
    });

    test("preserves br tags", () => {
      expect(cleanHtml("<p>line1<br>line2</p>")).toBe("<p>line1<br>line2</p>");
    });

    test("preserves span and font tags", () => {
      expect(cleanHtml("<span>text</span>")).toBe("<span>text</span>");
      expect(cleanHtml("<font>text</font>")).toBe("<font>text</font>");
    });

    test("preserves strike, sup, sub tags", () => {
      expect(cleanHtml("<strike>text</strike>")).toBe("<strike>text</strike>");
      expect(cleanHtml("<sup>text</sup>")).toBe("<sup>text</sup>");
      expect(cleanHtml("<sub>text</sub>")).toBe("<sub>text</sub>");
    });

    test("strips <script> tags", () => {
      expect(cleanHtml("<p>hello</p><script>alert('xss')</script>")).toBe(
        "<p>hello</p>alert('xss')"
      );
    });

    test("strips <style> tags", () => {
      expect(cleanHtml("<style>.red{color:red}</style><p>text</p>")).toBe(
        ".red{color:red}<p>text</p>"
      );
    });

    test("strips <div> tags (content preserved)", () => {
      expect(cleanHtml("<div>content</div>")).toBe("content");
    });

    test("strips <section> tags", () => {
      expect(cleanHtml("<section>content</section>")).toBe("content");
    });

    test("strips <iframe> tags", () => {
      expect(cleanHtml('<iframe src="evil.com"></iframe><p>ok</p>')).toBe("<p>ok</p>");
    });

    test("strips <form> and <input> tags", () => {
      expect(cleanHtml('<form action="/steal"><input type="text"></form><p>ok</p>')).toBe(
        "<p>ok</p>"
      );
    });

    test("strips nested disallowed tags", () => {
      expect(cleanHtml("<div><span><div>deep</div></span></div>")).toBe("<span>deep</span>");
    });

    test("strips <img> tags when not in ALLOWED_TAGS", () => {
      expect(cleanHtml('<p>text</p><img src="photo.jpg">')).toBe("<p>text</p>");
    });
  });

  // ── Step 3: Attribute stripping ────────────────────────────────────
  describe("Step 3: Disallowed attribute removal", () => {
    test("preserves href attribute on <a>", () => {
      expect(cleanHtml('<a href="https://example.com">link</a>')).toBe(
        '<a href="https://example.com">link</a>'
      );
    });

    test("preserves target attribute", () => {
      expect(cleanHtml('<a href="https://example.com" target="_blank">link</a>')).toBe(
        '<a href="https://example.com" target="_blank">link</a>'
      );
    });

    test("preserves color attribute on font", () => {
      expect(cleanHtml('<font color="#ff0000">red</font>')).toBe(
        '<font color="#ff0000">red</font>'
      );
    });

    test("preserves colspan and rowspan on td", () => {
      expect(cleanHtml('<td colspan="2" rowspan="3">cell</td>')).toBe(
        '<td colspan="2" rowspan="3">cell</td>'
      );
    });

    test("strips class attribute", () => {
      const result = cleanHtml('<p class="fancy">text</p>');
      expect(result).not.toContain("class");
      expect(result).toContain("text</p>");
    });

    test("strips id attribute", () => {
      const result = cleanHtml('<p id="main">text</p>');
      expect(result).not.toContain('id="');
      expect(result).toContain("text</p>");
    });

    test("strips data-* attributes", () => {
      const result = cleanHtml('<p data-custom="value">text</p>');
      expect(result).not.toContain("data-custom");
      expect(result).toContain("text</p>");
    });

    test("strips onclick and other event handlers", () => {
      const result = cleanHtml('<p onclick="alert(1)">text</p>');
      expect(result).not.toContain("onclick");
      expect(result).toContain("text</p>");
    });

    test("strips onerror attribute", () => {
      const result = cleanHtml('<p onerror="alert(1)">text</p>');
      expect(result).not.toContain("onerror");
      expect(result).toContain("text</p>");
    });
  });

  // ── Step 4: Style attribute filtering ──────────────────────────────
  describe("Step 4: Style attribute filtering", () => {
    test("preserves allowed style: font-size", () => {
      const input = '<span style="font-size: 18px;">big</span>';
      expect(cleanHtml(input)).toContain("font-size");
    });

    test("preserves allowed style: background-color", () => {
      const input = '<span style="background-color: yellow;">highlight</span>';
      expect(cleanHtml(input)).toContain("background-color");
    });

    test("preserves allowed style: text-align", () => {
      const input = '<p style="text-align: center;">centered</p>';
      expect(cleanHtml(input)).toContain("text-align");
    });

    test("preserves allowed style: margin-left", () => {
      const input = '<p style="margin-left: 2em;">indented</p>';
      expect(cleanHtml(input)).toContain("margin-left");
    });

    test("preserves allowed style: width and height", () => {
      const input = '<td style="width: 100px; height: 50px;">cell</td>';
      const result = cleanHtml(input);
      expect(result).toContain("width");
      expect(result).toContain("height");
    });

    test("preserves allowed style: float", () => {
      const input = '<span style="float: left;">floated</span>';
      expect(cleanHtml(input)).toContain("float");
    });
  });

  // ── Step 5: Link stripping ─────────────────────────────────────────
  describe("Step 5: Non-external link stripping", () => {
    test("preserves https links", () => {
      const input = '<a href="https://example.com">link</a>';
      expect(cleanHtml(input)).toBe(input);
    });

    test("preserves file:// links", () => {
      const input = '<a href="file://server/share/doc.pdf">doc</a>';
      expect(cleanHtml(input)).toBe(input);
    });

    test("preserves mailto: links", () => {
      const input = '<a href="mailto:user@example.com">email</a>';
      expect(cleanHtml(input)).toBe(input);
    });

    test("strips relative links (keeps text)", () => {
      expect(cleanHtml('<a href="/page">link</a>')).toBe("link");
    });

    test("strips anchor-only links (keeps text)", () => {
      expect(cleanHtml('<a href="#section">link</a>')).toBe("link");
    });

    test("strips javascript: links (keeps text)", () => {
      expect(cleanHtml('<a href="javascript:alert(1)">click</a>')).toBe("click");
    });

    test("strips links with no protocol (keeps text)", () => {
      expect(cleanHtml('<a href="example.com">link</a>')).toBe("link");
    });

    test("preserves http links (has scheme)", () => {
      const input = '<a href="http://example.com">link</a>';
      expect(cleanHtml(input)).toBe("link");
    });
  });

  // ── Step 6: HTML comment removal ───────────────────────────────────
  describe("Step 6: HTML comment removal", () => {
    test("removes single-line comments", () => {
      expect(cleanHtml("<p>text</p><!-- comment -->")).toBe("<p>text</p>");
    });

    test("removes multi-word comments", () => {
      expect(cleanHtml("<p>text</p><!-- this is a long comment -->")).toBe("<p>text</p>");
    });

    test("removes comments between tags", () => {
      expect(cleanHtml("<p>a</p><!-- mid --><p>b</p>")).toBe("<p>a</p><p>b</p>");
    });
  });

  // ── Step 7: Whitespace trimming ────────────────────────────────────
  describe("Step 7: Whitespace trimming", () => {
    test("trims leading and trailing whitespace from HTML", () => {
      expect(cleanHtml("<p>text</p>  ")).toBe("<p>text</p>");
    });

    test("trims leading whitespace from raw text (wraps in p)", () => {
      const result = cleanHtml("  hello  ");
      expect(result).toBe("<p> hello </p>");
    });

    test("collapses multiple spaces to single space", () => {
      expect(cleanHtml("<p>too   many   spaces</p>")).toBe("<p>too many spaces</p>");
    });
  });

  // ── Complex / real-world scenarios ─────────────────────────────────
  describe("real-world paste scenarios", () => {
    test("cleans Word paste with MsoNormal and extra attributes", () => {
      const wordHtml =
        '<p class="MsoNormal" style="font-size: 14px; font-family: Calibri;"><b>Title</b></p>';
      const result = cleanHtml(wordHtml, true);
      expect(result).toContain("<b>Title</b>");
      expect(result).not.toContain("MsoNormal");
      expect(result).toContain("font-size");
      expect(result).not.toContain("font-family");
    });

    test("cleans Google Docs paste with spans and data attributes", () => {
      const googleHtml =
        '<span data-sheets-value="test" style="font-size: 10px; font-weight: bold;">text</span>';
      const result = cleanHtml(googleHtml, true);
      expect(result).toContain("<span");
      expect(result).not.toContain("data-sheets-value");
      expect(result).toContain("font-size");
    });

    test("handles nested formatting", () => {
      const input = "<p><b><i><u>formatted</u></i></b></p>";
      expect(cleanHtml(input)).toBe(input);
    });

    test("handles table with styles", () => {
      const input =
        '<table><tr><td style="width: 100px; text-align: center;">cell</td></tr></table>';
      const result = cleanHtml(input);
      expect(result).toContain("<table>");
      expect(result).toContain("width");
      expect(result).toContain("text-align");
    });

    test("strips XSS attempts in tags", () => {
      const xss = "<p>safe</p><script>document.cookie</script>";
      const result = cleanHtml(xss);
      expect(result).not.toContain("<script>");
      expect(result).toContain("<p>safe</p>");
    });

    test("strips XSS in event handlers", () => {
      const xss = '<p onmouseover="alert(1)">hover me</p>';
      const result = cleanHtml(xss);
      expect(result).not.toContain("onmouseover");
    });

    test("strips XSS in javascript: links", () => {
      const xss = '<a href="javascript:alert(document.cookie)">click</a>';
      const result = cleanHtml(xss);
      expect(result).not.toContain("javascript:");
    });

    test("handles complex Word paste with \\r\\n and comments", () => {
      const wordPaste =
        '<p class="MsoNormal">Line 1\r\nLine 2</p><!-- Word comment --><p class="MsoNormal">Line 3</p>';
      const result = cleanHtml(wordPaste, true);
      expect(result).not.toContain("MsoNormal");
      expect(result).not.toContain("<!--");
      expect(result).toContain("Line 1 Line 2");
      expect(result).toContain("Line 3");
    });
  });

  // ── Regression / acceptance tests ──────────────────────────────────
  describe("regression tests", () => {
    test("Remove Javascript", () => {
      expect(cleanHtml("<script>window.open('https://www.google.com');</script>")).toBe(
        "window.open('https://www.google.com');"
      );
    });

    test("Remove image", () => {
      expect(
        cleanHtml(
          '<img src="https://dtplugin8.appianci.net/suite/applications/img/obj_sites144px.png" alt="Site Icon"/>'
        )
      ).toBe("");
    });

    test("Remove bad HTML tags, keep good ones", () => {
      expect(
        cleanHtml(
          '<p><span style="font-size: 14px;"><div style="font-size: 14px;">Hi <b>there</b></div></span><br></p>'
        )
      ).toBe('<p><span style="font-size: 14px;">Hi <b>there</b></span><br></p>');
    });

    test("Remove bad attributes, keep good ones, regardless of whether attributes have tag characters in them (<>)", () => {
      // NOTE: Attributes with > in their values break the tag-matching regex (known IE-compat limitation)
      expect(
        cleanHtml(
          '<p>hi="you"<span a-b="1" c-d="2>>3" e-f="4">Open tags</span><br></p><p><span z-y="1" x-w="2<<3" v-u="4">Close tags</span><br></p>'
        )
      ).toBe(
        '<p>hi="you"<span c-d="2>>3" e-f="4">Open tags</span><br></p><p><span >Close tags</span><br></p>'
      );
    });

    test("Strip style attributes copied from an Appian web page (including &quot; in an attribute)", () => {
      expect(
        cleanHtml(
          '<meta charset=\'utf-8\'><span style="color: rgb(34, 34, 34); font-family: &quot;Appian Open Sans&quot;, sans-serif; font-size: 24.0002px; font-style: normal; font-variant-ligatures: normal; font-variant-caps: normal; font-weight: 400; letter-spacing: normal; orphans: 2; text-align: left; text-indent: 0px; text-transform: none; white-space: pre-wrap; widows: 2; word-spacing: 0px; -webkit-text-stroke-width: 0px; background-color: rgb(255, 255, 255); text-decoration-thickness: initial; text-decoration-style: initial; text-decoration-color: initial; display: inline !important; float: none;">interface style="inhtml: here; "</span>'
        )
      ).toBe(
        '<span style="font-size: 24.0002px; text-align: left; background-color: rgb(255, 255, 255); float: none;">interface style="inhtml: here; "</span>'
      );
    });

    test("Strip style attributes that don't have spaces between them", () => {
      expect(
        cleanHtml(
          '<span style="color:rgb(34,34,34);font-family:&quot;AppianOpenSans&quot;,sans-serif;font-size:24.0002px;font-style:normal;font-variant-ligatures:normal;font-variant-caps:normal;font-weight:400;letter-spacing:normal;orphans:2;text-align:left;text-indent:0px;text-transform:none;white-space:pre-wrap;widows:2;word-spacing:0px;-webkit-text-stroke-width:0px;background-color:rgb(255,255,255);text-decoration-thickness:initial;text-decoration-style:initial;text-decoration-color:initial;display:inline!important;float:none;">interface style="inhtml:here;"</span>'
        )
      ).toBe(
        '<span style="font-size:24.0002px;text-align:left;background-color:rgb(255,255,255);float:none;">interface style="inhtml:here;"</span>'
      );
    });

    test("Strip trailing style attributes that don't end in semi-colon", () => {
      expect(
        cleanHtml(
          '<p style="margin-left: 25px; line-height:normal">Line 1</p><p style="margin-left: 25px; line-height:normal">Line 2</p>'
        )
      ).toBe('<p style="margin-left: 25px; ">Line 1</p><p style="margin-left: 25px; ">Line 2</p>');
    });

    test("Strip non-external hyperlinks", () => {
      expect(
        cleanHtml(
          '<a class="xref fm:ParaNumOnly" href="#FAR_3_1004"><span>Internal Link</span></a><a href="https://www.google.com">Go to Google</a><a href="http://www.google.com">Go to Google http</a><a href="file://some-file">Download a file</a><a href="Microsoft-edge:https://www.google.com">Link with Protocol</a><a href="mailto:dan.tobias@appian.com">Email Dan!</a>'
        )
      ).toBe(
        '<span>Internal Link</span><a href="https://www.google.com">Go to Google</a>Go to Google http<a href="file://some-file">Download a file</a><a href="Microsoft-edge:https://www.google.com">Link with Protocol</a><a href="mailto:dan.tobias@appian.com">Email Dan!</a>'
      );
    });
  });
});
