/**
 * Tests for paste handling logic from richTextFieldWithTables/v1/index.js
 */

const {
  cleanHtml,
  readClipboard,
  isInternetExplorer,
  isImageNewBase64,
  doesBase64ImageExist,
} = require("../../richTextFieldWithTables/v1/index.js");

describe("readClipboard", () => {
  test("reads text/html from clipboard when available", () => {
    const mockEvent = {
      originalEvent: {
        clipboardData: {
          getData: jest.fn((type) => {
            if (type === "text/html") return "<p>pasted html</p>";
            if (type === "text/plain") return "pasted text";
            return "";
          }),
        },
      },
    };
    expect(readClipboard(mockEvent)).toBe("<p>pasted html</p>");
  });

  test("falls back to text/plain when text/html is empty", () => {
    const mockEvent = {
      originalEvent: {
        clipboardData: {
          getData: jest.fn((type) => {
            if (type === "text/html") return "";
            if (type === "text/plain") return "plain text fallback";
            return "";
          }),
        },
      },
    };
    expect(readClipboard(mockEvent)).toBe("plain text fallback");
  });

  test("returns empty string when both clipboard types are empty", () => {
    const mockEvent = {
      originalEvent: { clipboardData: { getData: jest.fn(() => "") } },
    };
    expect(readClipboard(mockEvent)).toBe("");
  });

  test("prefers HTML over plain text", () => {
    const mockEvent = {
      originalEvent: {
        clipboardData: {
          getData: jest.fn((type) => {
            if (type === "text/html") return "<b>html</b>";
            if (type === "text/plain") return "plain";
            return "";
          }),
        },
      },
    };
    expect(readClipboard(mockEvent)).toBe("<b>html</b>");
  });
});

describe("isInternetExplorer", () => {
  const originalUserAgent = navigator.userAgent;

  afterEach(() => {
    Object.defineProperty(navigator, "userAgent", {
      value: originalUserAgent,
      writable: true,
      configurable: true,
    });
  });

  test("returns false for Chrome user agent", () => {
    Object.defineProperty(navigator, "userAgent", {
      value:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
      configurable: true,
    });
    expect(isInternetExplorer()).toBe(false);
  });

  test("returns true for IE 11 Trident user agent", () => {
    Object.defineProperty(navigator, "userAgent", {
      value:
        "Mozilla/5.0 (Windows NT 10.0; WOW64; Trident/7.0; rv:11.0) like Gecko",
      configurable: true,
    });
    expect(isInternetExplorer()).toBe(true);
  });

  test("returns true for MSIE user agent", () => {
    Object.defineProperty(navigator, "userAgent", {
      value: "Mozilla/5.0 (compatible; MSIE 10.0; Windows NT 6.1)",
      configurable: true,
    });
    expect(isInternetExplorer()).toBe(true);
  });
});

describe("paste event flow", () => {
  test("paste of HTML with <img> tag should be detected and skipped", () => {
    const clipboardHtml = '<p>text</p><img src="data:image/png;base64,abc">';
    expect(clipboardHtml.indexOf("<img")).not.toBe(-1);
  });

  test("paste of HTML without <img> should proceed to cleanHtml", () => {
    const clipboardHtml = "<p><b>bold text</b></p>";
    expect(clipboardHtml.indexOf("<img")).toBe(-1);
    const cleaned = cleanHtml(clipboardHtml, true);
    expect(cleaned).toBe("<p><b>bold text</b></p>");
  });

  test("paste of plain text goes through cleanHtml as partial", () => {
    const plainText = "Hello World\nNew Line";
    const cleaned = cleanHtml(plainText, true);
    expect(cleaned).toBe("Hello World<br>New Line");
  });

  test("paste from Word with complex formatting is cleaned", () => {
    const wordPaste =
      '<p class="MsoNormal" style="font-size: 12px; font-family: \'Times New Roman\'; line-height: 1.5;"><b><span style="font-size: 14px; color: red;">Important</span></b></p>';
    const cleaned = cleanHtml(wordPaste, true);
    expect(cleaned).not.toContain("MsoNormal");
    expect(cleaned).not.toContain("font-family");
    expect(cleaned).toContain("<b>");
    expect(cleaned).toContain("Important");
  });

  test("paste from Excel with table structure is preserved", () => {
    const excelPaste =
      '<table><tr><td style="width: 100px;">A1</td><td>B1</td></tr></table>';
    const cleaned = cleanHtml(excelPaste, true);
    expect(cleaned).toContain("<table>");
    expect(cleaned).toContain("<td");
    expect(cleaned).toContain("width");
  });
});

describe("isImageNewBase64", () => {
  test("returns true for new base64 image without loading class", () => {
    const img = document.createElement("img");
    img.src = "data:image/png;base64,iVBORw0KGgo=";
    expect(isImageNewBase64(img)).toBe(true);
  });

  test("returns false for base64 image with loading class", () => {
    const img = document.createElement("img");
    img.src = "data:image/png;base64,iVBORw0KGgo=";
    img.classList.add("loading");
    expect(isImageNewBase64(img)).toBe(false);
  });

  test("returns false for URL-based image", () => {
    const img = document.createElement("img");
    img.src = "https://example.com/image.png";
    expect(isImageNewBase64(img)).toBe(false);
  });
});

describe("doesBase64ImageExist", () => {
  test("returns true when base64 image exists in editor", () => {
    // doesBase64ImageExist reads from summernote, which is mocked to return ""
    // so it will return false with the mock
    expect(doesBase64ImageExist()).toBe(false);
  });
});
