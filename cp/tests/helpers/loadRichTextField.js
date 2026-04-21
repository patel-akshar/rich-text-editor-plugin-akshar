/**
 * Test helper: loads richTextField/v1/index.js in a sandboxed
 * context with mocked browser globals so Jest can instrument it for coverage.
 *
 * Returns an object with all the functions declared in the source file.
 */

const fs = require("fs");
const path = require("path");
const vm = require("vm");

function loadModule() {
  // Load i18n first
  const i18nSource = fs.readFileSync(
    path.resolve(__dirname, "../../richTextField/v1/i18n.js"),
    "utf8",
  );

  // Load the main source
  const mainSource = fs.readFileSync(
    path.resolve(__dirname, "../../richTextField/v1/index.js"),
    "utf8",
  );

  // Mock Quill
  const mockQuillInstance = {
    on: jest.fn(),
    root: Object.assign(document.createElement("div"), {
      dataset: {},
      addEventListener: jest.fn(),
    }),
    getContents: jest.fn(() => ({ ops: [] })),
    setContents: jest.fn(),
    getText: jest.fn(() => "\n"),
    getLength: jest.fn(() => 1),
    enable: jest.fn(),
    format: jest.fn(),
    container: document.createElement("div"),
    update: jest.fn(),
  };

  const MockQuill = jest.fn(() => mockQuillInstance);
  MockQuill.import = jest.fn(() => {
    // Return a mock class for blots/block, formats/link, attributors, etc.
    const MockBlot = function () {};
    MockBlot.tagName = "p";
    MockBlot.PROTOCOL_WHITELIST = ["http", "https"];
    return MockBlot;
  });
  MockQuill.register = jest.fn();
  MockQuill.sources = { USER: "user" };

  // Set up DOM elements the source expects
  const parentContainer = document.createElement("div");
  parentContainer.id = "parent-container";
  document.body.appendChild(parentContainer);

  const quillToolbar = document.createElement("div");
  quillToolbar.id = "quill-toolbar";
  parentContainer.appendChild(quillToolbar);

  const quillContainer = document.createElement("div");
  quillContainer.id = "quill-container";
  parentContainer.appendChild(quillContainer);

  const sizeBar = document.createElement("div");
  sizeBar.id = "sizeBar";
  parentContainer.appendChild(sizeBar);

  const usageBar = document.createElement("div");
  usageBar.id = "usageBar";
  sizeBar.appendChild(usageBar);

  const usageMessage = document.createElement("div");
  usageMessage.id = "usageMessage";
  sizeBar.appendChild(usageMessage);

  // Build sandbox
  const sandbox = {
    window: global.window,
    document: global.document,
    navigator: global.navigator,
    console: global.console,
    setTimeout: global.setTimeout,
    clearTimeout: global.clearTimeout,
    setInterval: global.setInterval,
    clearInterval: global.clearInterval,
    FileReader: global.FileReader,
    Array: global.Array,
    Object: global.Object,
    JSON: global.JSON,
    Math: global.Math,
    parseInt: global.parseInt,
    RegExp: global.RegExp,
    String: global.String,
    Error: global.Error,
    Promise: global.Promise,

    Quill: MockQuill,

    Appian: {
      getLocale: jest.fn(() => "en-US"),
      getAccentColor: jest.fn(() => "#1a73e8"),
      Component: {
        onNewValue: jest.fn(),
        saveValue: jest.fn(),
        setValidations: jest.fn(),
        invokeClientApi: jest.fn(() => Promise.resolve({ payload: {} })),
      },
    },
  };

  vm.createContext(sandbox);

  // Execute i18n
  vm.runInContext(i18nSource, sandbox, {
    filename: "richTextField/v1/i18n.js",
  });

  // Execute main source with exports wrapper
  const wrappedSource = `
    ${mainSource}

    var __exports = {
      revertIndentInlineToClass: revertIndentInlineToClass,
      getContentsFromHTML: getContentsFromHTML,
      getHTMLFromContents: getHTMLFromContents,
      debounce: debounce,
      buildCssSelector: buildCssSelector,
      getBrowserAndVersion: getBrowserAndVersion,
      returnParentWindowUrl: returnParentWindowUrl,
      doesBase64ImageExist: doesBase64ImageExist,
      isImageNewBase64: isImageNewBase64,
      getTranslation: getTranslation,
      translateToolbar: translateToolbar,
      validate: validate,
      getSize: getSize,
      isTextPresent: isTextPresent,
      updateUsageBar: updateUsageBar,
      updateColors: updateColors,
      handleDisplay: handleDisplay,
      updateValue: updateValue,
      initializeCopyPaste: initializeCopyPaste,
      uploadBase64Img: uploadBase64Img,
      outputUploadedImages: outputUploadedImages,
      availableFormats: availableFormats,
      availableFormatsFlattened: availableFormatsFlattened,
      defaultFormats: defaultFormats,
      MAX_SIZE_DEFAULT: MAX_SIZE_DEFAULT,
    };
  `;

  vm.runInContext(wrappedSource, sandbox, {
    filename: "richTextField/v1/index.js",
  });

  return {
    exports: sandbox.__exports,
    sandbox,
    mockQuillInstance,
    MockQuill,
  };
}

module.exports = { loadModule };
