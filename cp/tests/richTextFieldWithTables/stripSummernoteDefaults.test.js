/**
 * Tests for stripSummernoteDefaults() from richTextFieldWithTables/v1/index.js
 */

const {
  stripSummernoteDefaults,
} = require("../../richTextFieldWithTables/v1/index.js");

describe("stripSummernoteDefaults", () => {
  test("returns empty string for empty input", () => {
    expect(stripSummernoteDefaults("")).toBe("");
  });

  test("returns empty string for null input", () => {
    expect(stripSummernoteDefaults(null)).toBe("");
  });

  test("returns empty string for undefined input", () => {
    expect(stripSummernoteDefaults(undefined)).toBe("");
  });

  test("strips default background-color rgb(255,255,255)", () => {
    const input =
      '<span style="background-color: rgb(255, 255, 255);">text</span>';
    const result = stripSummernoteDefaults(input);
    expect(result).not.toContain("background-color");
    expect(result).toContain("text");
  });

  test("strips default font-size 14px", () => {
    const input = '<span style="font-size: 14px;">text</span>';
    const result = stripSummernoteDefaults(input);
    expect(result).not.toContain("font-size: 14px");
    expect(result).toContain("text");
  });

  test("strips default text-align start", () => {
    const input = '<p style="text-align: start;">text</p>';
    const result = stripSummernoteDefaults(input);
    expect(result).not.toContain("text-align: start");
  });

  test("strips default float none", () => {
    const input = '<span style="float: none;">text</span>';
    const result = stripSummernoteDefaults(input);
    expect(result).not.toContain("float: none");
  });

  test("preserves non-default styles", () => {
    const input = '<span style="font-size: 18px; color: red;">text</span>';
    const result = stripSummernoteDefaults(input);
    expect(result).toContain("font-size: 18px");
    expect(result).toContain("color: red");
  });

  test("strips defaults but keeps other styles in same attribute", () => {
    const input =
      '<span style="background-color: rgb(255, 255, 255); font-size: 14px; color: blue;">text</span>';
    const result = stripSummernoteDefaults(input);
    expect(result).not.toContain("background-color");
    expect(result).not.toContain("font-size: 14px");
    expect(result).toContain("color: blue");
  });

  test("removes empty style attributes after stripping", () => {
    const input = '<span style="font-size: 14px;">text</span>';
    const result = stripSummernoteDefaults(input);
    expect(result).not.toContain('style=""');
  });

  test("removes empty spans", () => {
    const input = "<p>before<span></span>after</p>";
    const result = stripSummernoteDefaults(input);
    expect(result).not.toContain("<span");
    expect(result).toContain("beforeafter");
  });

  test("unwraps attribute-less spans", () => {
    const input = "<p><span>unwrap me</span></p>";
    const result = stripSummernoteDefaults(input);
    expect(result).not.toContain("<span");
    expect(result).toContain("unwrap me");
  });

  test("preserves spans with remaining attributes", () => {
    const input = '<span style="color: red;">keep me</span>';
    const result = stripSummernoteDefaults(input);
    expect(result).toContain("<span");
    expect(result).toContain("color: red");
  });

  test("handles nested empty spans", () => {
    const input = "<p><span><span></span></span>text</p>";
    const result = stripSummernoteDefaults(input);
    expect(result).not.toContain("<span");
    expect(result).toContain("text");
  });

  test("cleans up extra whitespace", () => {
    const input = '<p  style="font-size: 14px;"  >text</p>';
    const result = stripSummernoteDefaults(input);
    expect(result).not.toContain("  ");
  });

  test("passes through plain HTML without summernote defaults", () => {
    const input = "<p><b>bold</b> and <i>italic</i></p>";
    expect(stripSummernoteDefaults(input)).toBe(input);
  });
});
