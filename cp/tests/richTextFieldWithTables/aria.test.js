/**
 * Tests for aria-labelledby and aria-describedby from richTextFieldWithTables/v1/index.js
 */

describe("aria attributes - richTextFieldWithTables", () => {
  var onNewValueCallback;
  var noteEditable;

  var defaultParams = {
    readOnly: true,
    richText: "",
    allowImages: false,
    height: "auto",
    placeholder: "",
    tableBorderStyle: "STANDARD",
    insertableItemsLabel: "",
    insertableItems: [],
    maxSize: 10000,
  };

  beforeEach(() => {
    Appian.Component.getAriaLabelledBy = jest.fn(() => "label-id-123");
    Appian.Component.getAriaDescribedBy = jest.fn(() => "desc-id-456");
    Appian.Component.onNewValue.mockReset();
    jest.resetModules();

    noteEditable = document.querySelector(".note-editable");
    if (!noteEditable) {
      noteEditable = document.createElement("div");
      noteEditable.className = "note-editable";
      document.body.appendChild(noteEditable);
    }
    noteEditable.removeAttribute("aria-labelledby");
    noteEditable.removeAttribute("aria-describedby");

    require("../../richTextFieldWithTables/v1/index.js");
    onNewValueCallback = Appian.Component.onNewValue.mock.calls[0][0];
  });

  afterEach(() => {
    delete Appian.Component.getAriaLabelledBy;
    delete Appian.Component.getAriaDescribedBy;
  });

  test("sets aria-describedby on .note-editable", () => {
    onNewValueCallback(defaultParams);
    expect(noteEditable.getAttribute("aria-describedby")).toBe("desc-id-456");
  });

  test("updates aria-describedby on subsequent onNewValue calls", () => {
    onNewValueCallback(defaultParams);
    expect(noteEditable.getAttribute("aria-describedby")).toBe("desc-id-456");

    Appian.Component.getAriaDescribedBy.mockReturnValue("desc-id-789");
    onNewValueCallback(defaultParams);
    expect(noteEditable.getAttribute("aria-describedby")).toBe("desc-id-789");
  });

  test("does not set aria-describedby when SDK method does not exist", () => {
    delete Appian.Component.getAriaDescribedBy;
    onNewValueCallback(defaultParams);
    expect(noteEditable.hasAttribute("aria-describedby")).toBe(false);
  });

  test("does not set aria-labelledby when SDK method does not exist", () => {
    delete Appian.Component.getAriaLabelledBy;
    onNewValueCallback(defaultParams);
    expect(noteEditable.hasAttribute("aria-labelledby")).toBe(false);
  });

  test("does not crash when .note-editable is missing", () => {
    noteEditable.remove();
    expect(() => onNewValueCallback(defaultParams)).not.toThrow();

    // Restore
    noteEditable = document.createElement("div");
    noteEditable.className = "note-editable";
    document.body.appendChild(noteEditable);
  });

  test("does not crash when both SDK methods are missing", () => {
    delete Appian.Component.getAriaDescribedBy;
    delete Appian.Component.getAriaLabelledBy;
    expect(() => onNewValueCallback(defaultParams)).not.toThrow();
  });
});
