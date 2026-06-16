/**
 * Custom Jest transform for browser script files.
 *
 * These source files are plain browser scripts (not modules). They declare
 * functions and constants at the top level. Jest wraps require()'d files
 * in a module function scope, so those declarations become module-local.
 *
 * This transform appends a module.exports block that exposes all the
 * declared functions and constants, making them accessible to tests
 * while still being instrumented by Jest for coverage.
 */

"use strict";

const RICH_TEXT_WITH_TABLES_EXPORTS = `

// ── Auto-appended by browserScriptTransform for testing ──
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    cleanHtml: typeof cleanHtml !== 'undefined' ? cleanHtml : undefined,
    readClipboard: typeof readClipboard !== 'undefined' ? readClipboard : undefined,
    handleImagePasteFromFile: typeof handleImagePasteFromFile !== 'undefined' ? handleImagePasteFromFile : undefined,
    isInternetExplorer: typeof isInternetExplorer !== 'undefined' ? isInternetExplorer : undefined,
    isSummernoteActive: typeof isSummernoteActive !== 'undefined' ? isSummernoteActive : undefined,
    isImageNewBase64: typeof isImageNewBase64 !== 'undefined' ? isImageNewBase64 : undefined,
    doesBase64ImageExist: typeof doesBase64ImageExist !== 'undefined' ? doesBase64ImageExist : undefined,
    isTextPresent: typeof isTextPresent !== 'undefined' ? isTextPresent : undefined,
    debounce: typeof debounce !== 'undefined' ? debounce : undefined,
    debounceOnChange: typeof debounceOnChange !== 'undefined' ? debounceOnChange : undefined,
    getTranslation: typeof getTranslation !== 'undefined' ? getTranslation : undefined,
    returnDisplayParams: typeof returnDisplayParams !== 'undefined' ? returnDisplayParams : undefined,
    haveDisplayParamsChanged: typeof haveDisplayParamsChanged !== 'undefined' ? haveDisplayParamsChanged : undefined,
    validate: typeof validate !== 'undefined' ? validate : undefined,
    isReadOnly: typeof isReadOnly !== 'undefined' ? isReadOnly : undefined,
    setDynamicCss: typeof setDynamicCss !== 'undefined' ? setDynamicCss : undefined,
    setA11yCss: typeof setA11yCss !== 'undefined' ? setA11yCss : undefined,
    buildEditor: typeof buildEditor !== 'undefined' ? buildEditor : undefined,
    setEditorContents: typeof setEditorContents !== 'undefined' ? setEditorContents : undefined,
    getEditorContents: typeof getEditorContents !== 'undefined' ? getEditorContents : undefined,
    setAppianValue: typeof setAppianValue !== 'undefined' ? setAppianValue : undefined,
    outputUploadedImages: typeof outputUploadedImages !== 'undefined' ? outputUploadedImages : undefined,
    ALLOWED_TAGS: typeof ALLOWED_TAGS !== 'undefined' ? ALLOWED_TAGS : undefined,
    ALLOWED_ATTRIBUTES: typeof ALLOWED_ATTRIBUTES !== 'undefined' ? ALLOWED_ATTRIBUTES : undefined,
    ALLOWED_STYLE_ATTRIBUTES: typeof ALLOWED_STYLE_ATTRIBUTES !== 'undefined' ? ALLOWED_STYLE_ATTRIBUTES : undefined,
    MAX_SIZE_DEFAULT: typeof MAX_SIZE_DEFAULT !== 'undefined' ? MAX_SIZE_DEFAULT : undefined,
    DISPLAY_PARAMS: typeof DISPLAY_PARAMS !== 'undefined' ? DISPLAY_PARAMS : undefined,
    stripSummernoteDefaults: typeof stripSummernoteDefaults !== 'undefined' ? stripSummernoteDefaults : undefined,
    makeInsDelAccessible: typeof makeInsDelAccessible !== 'undefined' ? makeInsDelAccessible : undefined,
    escapeAttr: typeof escapeAttr !== 'undefined' ? escapeAttr : undefined,
  };
}
`;

const RICH_TEXT_FIELD_EXPORTS = `

// ── Auto-appended by browserScriptTransform for testing ──
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    revertIndentInlineToClass: typeof revertIndentInlineToClass !== 'undefined' ? revertIndentInlineToClass : undefined,
    getContentsFromHTML: typeof getContentsFromHTML !== 'undefined' ? getContentsFromHTML : undefined,
    getHTMLFromContents: typeof getHTMLFromContents !== 'undefined' ? getHTMLFromContents : undefined,
    debounce: typeof debounce !== 'undefined' ? debounce : undefined,
    buildCssSelector: typeof buildCssSelector !== 'undefined' ? buildCssSelector : undefined,
    getBrowserAndVersion: typeof getBrowserAndVersion !== 'undefined' ? getBrowserAndVersion : undefined,
    returnParentWindowUrl: typeof returnParentWindowUrl !== 'undefined' ? returnParentWindowUrl : undefined,
    doesBase64ImageExist: typeof doesBase64ImageExist !== 'undefined' ? doesBase64ImageExist : undefined,
    isImageNewBase64: typeof isImageNewBase64 !== 'undefined' ? isImageNewBase64 : undefined,
    getTranslation: typeof getTranslation !== 'undefined' ? getTranslation : undefined,
    translateToolbar: typeof translateToolbar !== 'undefined' ? translateToolbar : undefined,
    validate: typeof validate !== 'undefined' ? validate : undefined,
    getSize: typeof getSize !== 'undefined' ? getSize : undefined,
    isTextPresent: typeof isTextPresent !== 'undefined' ? isTextPresent : undefined,
    updateUsageBar: typeof updateUsageBar !== 'undefined' ? updateUsageBar : undefined,
    updateColors: typeof updateColors !== 'undefined' ? updateColors : undefined,
    handleDisplay: typeof handleDisplay !== 'undefined' ? handleDisplay : undefined,
    updateValue: typeof updateValue !== 'undefined' ? updateValue : undefined,
    initializeCopyPaste: typeof initializeCopyPaste !== 'undefined' ? initializeCopyPaste : undefined,
    uploadBase64Img: typeof uploadBase64Img !== 'undefined' ? uploadBase64Img : undefined,
    outputUploadedImages: typeof outputUploadedImages !== 'undefined' ? outputUploadedImages : undefined,
    availableFormats: typeof availableFormats !== 'undefined' ? availableFormats : undefined,
    availableFormatsFlattened: typeof availableFormatsFlattened !== 'undefined' ? availableFormatsFlattened : undefined,
    defaultFormats: typeof defaultFormats !== 'undefined' ? defaultFormats : undefined,
    MAX_SIZE_DEFAULT: typeof MAX_SIZE_DEFAULT !== 'undefined' ? MAX_SIZE_DEFAULT : undefined,
  };
}
`;

module.exports = {
  process(sourceText, sourcePath) {
    let code = sourceText;

    if (sourcePath.includes("richTextFieldWithTables") && sourcePath.endsWith("index.js")) {
      code += RICH_TEXT_WITH_TABLES_EXPORTS;
    } else if (sourcePath.includes("richTextField") && sourcePath.endsWith("index.js")) {
      code += RICH_TEXT_FIELD_EXPORTS;
    }

    return { code };
  },
};
