/**
 * Tests for utility functions from richTextFieldWithTables/v1/index.js
 */

const {
  debounce,
  debounceOnChange,
  getTranslation,
  returnDisplayParams,
  haveDisplayParamsChanged,
  isSummernoteActive,
  isReadOnly,
  cleanHtml,
  DISPLAY_PARAMS,
  MAX_SIZE_DEFAULT,
} = require("../../richTextFieldWithTables/v1/index.js");

describe("debounce", () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  test("delays function execution", () => {
    const fn = jest.fn();
    const debounced = debounce(fn, 500);
    debounced();
    expect(fn).not.toHaveBeenCalled();
    jest.advanceTimersByTime(500);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  test("resets timer on subsequent calls", () => {
    const fn = jest.fn();
    const debounced = debounce(fn, 500);
    debounced();
    jest.advanceTimersByTime(300);
    debounced();
    jest.advanceTimersByTime(300);
    expect(fn).not.toHaveBeenCalled();
    jest.advanceTimersByTime(200);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  test("only calls function once for rapid calls", () => {
    const fn = jest.fn();
    const debounced = debounce(fn, 100);
    for (let i = 0; i < 10; i++) debounced();
    jest.advanceTimersByTime(100);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  test("passes arguments to the debounced function", () => {
    const fn = jest.fn();
    const debounced = debounce(fn, 100);
    debounced("arg1", "arg2");
    jest.advanceTimersByTime(100);
    expect(fn).toHaveBeenCalledWith("arg1", "arg2");
  });
});

describe("debounceOnChange", () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  test("works the same as debounce", () => {
    const fn = jest.fn();
    const debounced = debounceOnChange(fn, 200);
    debounced();
    expect(fn).not.toHaveBeenCalled();
    jest.advanceTimersByTime(200);
    expect(fn).toHaveBeenCalledTimes(1);
  });
});

describe("getTranslation", () => {
  test("returns English translation", () => {
    expect(getTranslation("textHeaderLarge")).toBe("Large Header");
  });

  test("returns undefined for missing key", () => {
    expect(getTranslation("nonExistentKey")).toBeUndefined();
  });
});

describe("returnDisplayParams", () => {
  test("returns empty strings when allParameters is not set", () => {
    const result = returnDisplayParams();
    expect(result.height).toBe("");
    expect(result.readOnly).toBe("");
  });
});

describe("haveDisplayParamsChanged", () => {
  test("returns false when allParameters matches current", () => {
    // Set window.allParameters to match currentDisplayParameters (both empty defaults)
    window.allParameters = {};
    DISPLAY_PARAMS.forEach((p) => (window.allParameters[p] = ""));
    expect(haveDisplayParamsChanged()).toBe(false);
  });
});

describe("isSummernoteActive", () => {
  test("returns false when body is active element", () => {
    expect(isSummernoteActive()).toBe(false);
  });

  test("returns true when note-editable element is focused", () => {
    const div = document.createElement("div");
    div.className = "note-editable";
    div.tabIndex = 0;
    document.body.appendChild(div);
    div.focus();
    expect(isSummernoteActive()).toBe(true);
    document.body.removeChild(div);
  });
});

describe("constants", () => {
  test("MAX_SIZE_DEFAULT is 10000", () => {
    expect(MAX_SIZE_DEFAULT).toBe(10000);
  });

  test("DISPLAY_PARAMS contains expected keys", () => {
    expect(DISPLAY_PARAMS).toContain("height");
    expect(DISPLAY_PARAMS).toContain("readOnly");
    expect(DISPLAY_PARAMS).toContain("tableBorderStyle");
  });
});

describe("insertableItems", () => {
  // This replicates the filtering logic from buildEditor():
  //   insertableItemsFiltered = allParameters.insertableItems.filter(i => i.label && i.value)
  function filterInsertableItems(items) {
    return (items || []).filter(function (i) {
      return i.label && i.value;
    });
  }

  test("filters out items missing label", () => {
    const items = [
      { label: "Name", value: "{name}" },
      { label: "", value: "{empty}" },
      { value: "{noLabel}" },
    ];
    const result = filterInsertableItems(items);
    expect(result).toHaveLength(1);
    expect(result[0].value).toBe("{name}");
  });

  test("filters out items missing value", () => {
    const items = [
      { label: "Name", value: "{name}" },
      { label: "NoValue", value: "" },
      { label: "AlsoNoValue" },
    ];
    const result = filterInsertableItems(items);
    expect(result).toHaveLength(1);
    expect(result[0].label).toBe("Name");
  });

  test("keeps items with both label and value", () => {
    const items = [
      { label: "First Name", value: "{firstName}" },
      { label: "Last Name", value: "{lastName}" },
      { label: "Email", value: "{email}" },
    ];
    const result = filterInsertableItems(items);
    expect(result).toHaveLength(3);
  });

  test("returns empty array for null/undefined input", () => {
    expect(filterInsertableItems(null)).toEqual([]);
    expect(filterInsertableItems(undefined)).toEqual([]);
  });

  test("returns empty array when all items are invalid", () => {
    const items = [{ label: "", value: "" }, { label: null, value: null }, {}];
    expect(filterInsertableItems(items)).toHaveLength(0);
  });

  test("insertable item labels are sanitized through cleanHtml", () => {
    // buildEditor passes labels through cleanHtml(label, true)
    const maliciousLabel = '<script>alert("xss")</script>Legit Label';
    const cleaned = cleanHtml(maliciousLabel, true);
    expect(cleaned).not.toContain("<script>");
    expect(cleaned).toContain("Legit Label");
  });

  test("insertable item labels with HTML formatting are cleaned", () => {
    const htmlLabel = "<b>Bold</b> <div>wrapped</div>";
    const cleaned = cleanHtml(htmlLabel, true);
    expect(cleaned).toContain("<b>Bold</b>");
    expect(cleaned).not.toContain("<div>");
    expect(cleaned).toContain("wrapped");
  });

  test("insertable item label with special characters is preserved", () => {
    const label = "Customer's Name & Address";
    const cleaned = cleanHtml(label, true);
    expect(cleaned).toBe("Customer's Name & Address");
  });
});
