/**
 * Tests for utility functions from richTextField/v1/index.js
 */

const {
  revertIndentInlineToClass,
  debounce,
  buildCssSelector,
  getBrowserAndVersion,
  returnParentWindowUrl,
  doesBase64ImageExist,
  isImageNewBase64,
  getTranslation,
  availableFormats,
  availableFormatsFlattened,
  defaultFormats,
  MAX_SIZE_DEFAULT,
} = require("../../richTextField/v1/index.js");

describe("revertIndentInlineToClass", () => {
  test("converts single indent to class", () => {
    expect(revertIndentInlineToClass('<p style="margin-left: 1em;">text</p>')).toBe(
      '<p class="ql-indent-1">text</p>'
    );
  });

  test("converts double indent to class", () => {
    expect(revertIndentInlineToClass('<p style="margin-left: 2em;">text</p>')).toBe(
      '<p class="ql-indent-2">text</p>'
    );
  });

  test("converts large indent values", () => {
    expect(revertIndentInlineToClass('<p style="margin-left: 10em;">text</p>')).toBe(
      '<p class="ql-indent-10">text</p>'
    );
  });

  test("handles multiple indented paragraphs", () => {
    const input = '<p style="margin-left: 1em;">one</p><p style="margin-left: 3em;">three</p>';
    const expected = '<p class="ql-indent-1">one</p><p class="ql-indent-3">three</p>';
    expect(revertIndentInlineToClass(input)).toBe(expected);
  });

  test("does not modify non-indent styles", () => {
    const input = '<p style="color: red;">text</p>';
    expect(revertIndentInlineToClass(input)).toBe(input);
  });

  test("does not modify margin-left with non-em units", () => {
    const input = '<p style="margin-left: 20px;">text</p>';
    expect(revertIndentInlineToClass(input)).toBe(input);
  });

  test("handles empty html", () => {
    expect(revertIndentInlineToClass("")).toBe("");
  });
});

describe("buildCssSelector", () => {
  test("builds selector for bold", () => {
    expect(buildCssSelector("bold")).toBe("button.ql-bold,span.ql-bold");
  });

  test("builds selector for italic", () => {
    expect(buildCssSelector("italic")).toBe("button.ql-italic,span.ql-italic");
  });

  test("builds selector for image", () => {
    expect(buildCssSelector("image")).toBe("button.ql-image,span.ql-image");
  });
});

describe("debounce", () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  test("executes function after delay", () => {
    const fn = jest.fn();
    const debounced = debounce(fn, 500);
    debounced();
    expect(fn).not.toHaveBeenCalled();
    jest.advanceTimersByTime(500);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  test("cancels previous call on rapid invocation", () => {
    const fn = jest.fn();
    const debounced = debounce(fn, 200);
    debounced();
    debounced();
    debounced();
    jest.advanceTimersByTime(200);
    expect(fn).toHaveBeenCalledTimes(1);
  });
});

describe("getBrowserAndVersion", () => {
  // The real function reads navigator.userAgent directly, not a parameter.
  // We need to mock navigator.userAgent for each test.
  const originalUserAgent = navigator.userAgent;

  afterEach(() => {
    Object.defineProperty(navigator, "userAgent", {
      value: originalUserAgent,
      configurable: true,
    });
  });

  test("detects Chrome", () => {
    Object.defineProperty(navigator, "userAgent", {
      value:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      configurable: true,
    });
    // Also need to mock appName/appVersion for the fallback path
    expect(getBrowserAndVersion()).toBe("Chrome 120");
  });

  test("detects Firefox", () => {
    Object.defineProperty(navigator, "userAgent", {
      value: "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0",
      configurable: true,
    });
    expect(getBrowserAndVersion()).toBe("Firefox 121");
  });

  test("detects IE 11 via Trident", () => {
    Object.defineProperty(navigator, "userAgent", {
      value: "Mozilla/5.0 (Windows NT 10.0; WOW64; Trident/7.0; rv:11.0) like Gecko",
      configurable: true,
    });
    expect(getBrowserAndVersion()).toBe("IE 11");
  });

  test("detects Edge (legacy)", () => {
    Object.defineProperty(navigator, "userAgent", {
      value:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/70.0.3538.102 Safari/537.36 Edge/18",
      configurable: true,
    });
    expect(getBrowserAndVersion()).toBe("Edge 18");
  });

  test("detects Safari", () => {
    Object.defineProperty(navigator, "userAgent", {
      value:
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17 Safari/605.1.15",
      configurable: true,
    });
    expect(getBrowserAndVersion()).toBe("Safari 17");
  });
});

describe("returnParentWindowUrl", () => {
  // The real function reads document.referrer directly
  test("extracts base URL from referrer with /suite/ path", () => {
    Object.defineProperty(document, "referrer", {
      value: "https://site-appiancloud.com/suite/sites/mysite/page/home",
      configurable: true,
    });
    expect(returnParentWindowUrl()).toBe("https://site-appiancloud.com");
  });

  test("extracts base URL from referrer with trailing slash", () => {
    Object.defineProperty(document, "referrer", {
      value: "https://site-appiancloud.com/",
      configurable: true,
    });
    expect(returnParentWindowUrl()).toBe("https://site-appiancloud.com");
  });

  test("extracts base URL from referrer without trailing slash", () => {
    Object.defineProperty(document, "referrer", {
      value: "https://site-appiancloud.com",
      configurable: true,
    });
    expect(returnParentWindowUrl()).toBe("https://site-appiancloud.com");
  });
});

describe("isImageNewBase64", () => {
  test("returns true for new base64 image", () => {
    const img = document.createElement("img");
    img.src = "data:image/png;base64,abc123";
    expect(isImageNewBase64(img)).toBe(true);
  });

  test("returns false when loading class is present", () => {
    const img = document.createElement("img");
    img.src = "data:image/png;base64,abc123";
    img.classList.add("loading");
    expect(isImageNewBase64(img)).toBe(false);
  });

  test("returns false for http URL source", () => {
    const img = document.createElement("img");
    img.src = "https://example.com/photo.jpg";
    expect(isImageNewBase64(img)).toBe(false);
  });
});

describe("getTranslation", () => {
  test("returns English tooltip", () => {
    expect(getTranslation("tooltipBold")).toBe("Bold (%+B)");
  });

  test("returns usage bar text", () => {
    expect(getTranslation("usageBarUsed")).toBe("used");
  });
});

describe("format configuration", () => {
  test("availableFormatsFlattened contains all formats", () => {
    expect(availableFormatsFlattened).toContain("header");
    expect(availableFormatsFlattened).toContain("bold");
    expect(availableFormatsFlattened).toContain("image");
    expect(availableFormatsFlattened).toContain("list");
  });

  test("defaultFormats excludes image", () => {
    expect(defaultFormats).not.toContain("image");
  });

  test("defaultFormats includes all other formats", () => {
    expect(defaultFormats).toContain("header");
    expect(defaultFormats).toContain("bold");
    expect(defaultFormats).toContain("link");
  });

  test("MAX_SIZE_DEFAULT is 10000", () => {
    expect(MAX_SIZE_DEFAULT).toBe(10000);
  });
});
