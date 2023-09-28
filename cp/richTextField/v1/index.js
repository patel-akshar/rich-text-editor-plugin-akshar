const MAX_SIZE_DEFAULT = 10000;
const IS_MAC = navigator.platform.indexOf("Mac") > -1;
const CLIENT_API_FRIENDLY_NAME = "ImageStorageClientApi";
window.quillMaxSize = MAX_SIZE_DEFAULT;
window.isQuillActive = false;
window.isQuillBlurred = false;
window.currentValidations = [];
window.isReadOnly = false;
window.allowImages = false;
window.connectedSystem;
window.uploadedImages = [];

/* Internationalization */
/* NOTE: this file depends on, and must be loaded after, i18n.js */
window.locale = "en-US"; // see https://issues.appian.com/browse/AN-193624
/* Use dashes not underscores because of https://issues.appian.com/browse/AN-193624 */
const supportedTranslations = {
  "en-US": english_translations,
  "fr-FR": french_translations,
  "fr-CA": french_translations,
};
const supportedLocales = [];
for (var localeKey in supportedTranslations) {
  supportedLocales.push(localeKey);
}

// Exclude formats that don't match parity with Appian Rich Text Display Field
// Won't be able to paste unsupported formats
// Note this is separate from what toolbar allows
// https://quilljs.com/docs/formats/
// Also see getContentsFromHTML() where unsupported formats are removed
// from the incoming HTML value if present
const availableFormats = [
  ["header", "size"],
  ["bold", "italic", "underline", "strike", "color", "background"],
  ["link", "image"],
  ["align", "indent"],
  ["list"],
];
const availableFormatsFlattened = availableFormats.reduce(function (acc, val) {
  return acc.concat(val, []);
});
const defaultFormats = availableFormatsFlattened.filter(function (format) {
  return format !== "image";
});
var allowedFormats = defaultFormats;

// This mimics the default Quill.js keyboard module with some slight modifications for "Tab" handling
// https://github.com/quilljs/quill/blob/master/modules/keyboard.js
var bindings = {
  tab: {
    key: "Tab",
    handler: function (range, context) {
      return true;
    },
  },
  "custom-indent": {
    key: 221, // this key: ]
    shiftKey: false,
    shortKey: true,
    handler: function (range, context) {
      this.quill.format("indent", "+1", Quill.sources.USER);
      return false;
    },
  },
  "custom-outdent": {
    key: 219, // this key: [
    shiftKey: false,
    shortKey: true,
    handler: function (range, context) {
      this.quill.format("indent", "-1", Quill.sources.USER);
      return false;
    },
  },
  "custom-ol": {
    key: "7",
    shiftKey: true,
    shortKey: true,
    handler: function (range, context) {
      if (context.format.list !== "ordered") {
        this.quill.format("list", "ordered", true, Quill.sources.USER);
      } else {
        this.quill.format("list", false, Quill.sources.USER);
      }
      return false;
    },
  },
  "custom-ul": {
    key: "8",
    shiftKey: true,
    shortKey: true,
    handler: function (range, context) {
      if (context.format.list !== "bullet") {
        this.quill.format("list", "bullet", true, Quill.sources.USER);
      } else {
        this.quill.format("list", false, Quill.sources.USER);
      }
      return false;
    },
  },
};

// Create a style element for dynamic CSS attributes
var styleEl = document.createElement("style");
document.head.appendChild(styleEl);

var parentContainer = document.getElementById("parent-container");
var quillContainer = document.getElementById("quill-container");
var quill;

Appian.Component.onNewValue(function (allParameters) {
  const maxSize = allParameters.maxSize;
  const richText = allParameters.richText;
  const enableProgressBar = allParameters.enableProgressBar;
  const height = allParameters.height;
  const placeholder = allParameters.placeholder;
  window.connectedSystem = allParameters.imageStorageConnectedSystem;
  window.allowImages = allParameters.allowImages;
  window.isReadOnly = allParameters.readOnly;

  // Set dynamic colors on any new value (these change based on read-only-ness)
  updateColors();

  // True on the very first load of the component plugin (before quill is initalized)
  const isFirstInitialization = !quill;

  // True when not readOnly and not disabled
  const isEditable = !allParameters.readOnly && !allParameters.disabled;

  // Determines if we should automatically convert the input to Quill-html format
  // Only do this on first initializaiton, and when the component is editable
  const convertInput = isFirstInitialization && isEditable;

  // If it's the first initialization, only force validations if the component is not readOnly and not disabled
  // -- This is to prevent a SAIL evaluation when attempting to set validations that are unnecessary (we know the default of [] is fine for readOnly or disabled)
  // Otherwise on subsequent newValues, we need to validate & force an update due to Appian caching validations
  const forceValidationUpdate = !isFirstInitialization || isEditable;

  /* Initialize Quill and set allowed formats and toolbar */
  if (!quill) {
    /* Run translations to update Toolbar markup before Quill transforms it */
    var locale = Appian.getLocale();
    if (supportedLocales.indexOf(locale) < 0) {
      locale = "en-US";
    }
    window.locale = locale;
    translateToolbar();
    document.getElementById("quill-container").classList.add(locale);

    var Block = Quill.import("blots/block");
    Block.tagName = "div";
    var Link = Quill.import("formats/link");
    Link.PROTOCOL_WHITELIST.push("file");
    Quill.register(Link, true);
    Quill.register(Block);
    Quill.register(Quill.import("attributors/style/background"), true);
    Quill.register(Quill.import("attributors/style/color"), true);
    Quill.register(Quill.import("attributors/style/size"), true);
    Quill.register(Quill.import("attributors/style/align"), true);
    allowedFormats =
      !allParameters.allowedFormats || !allParameters.allowedFormats.length
        ? defaultFormats
        : allParameters.allowedFormats;
    if (window.allowImages) {
      allowedFormats.push("image");
    }
    quill = new Quill(quillContainer, {
      formats: allowedFormats,
      modules: {
        toolbar: "#quill-toolbar",
        history: {
          delay: 500,
          maxStack: 500,
          userOnly: true,
        },
        keyboard: {
          bindings: bindings,
        },
      },
      placeholder: "",
      theme: "snow",
    });

    /* Hide/show toolbar options based on if they are allowed formats */
    availableFormatsFlattened.forEach(function (format) {
      var nodeArray = Array.prototype.slice.call(
        document.querySelectorAll(buildCssSelector(format))
      );
      nodeArray.forEach(function (element) {
        element.style.display =
          allowedFormats.indexOf(format) >= 0 ? "block" : "none";
      });
    });

    /* Add spacing to the toolbar based on visibilities */
    availableFormats.forEach(function (formatList) {
      var cssSelectors = [];
      formatList.forEach(function (format) {
        if (allowedFormats.indexOf(format) >= 0) {
          cssSelectors.push(buildCssSelector(format));
        }
      });
      if (cssSelectors.length > 0) {
        var elementsOfFormatList = document.querySelectorAll(
          cssSelectors.join(",")
        );
        var lastElementOfFormatList =
          elementsOfFormatList[elementsOfFormatList.length - 1];
        lastElementOfFormatList.classList.add("ql-spacer");
      }
    });

    /* Update tooltips and accessibility labels for Mac vs. PC */
    ["tooltip", "aria-label"].forEach(function (attribute) {
      var elementArray = Array.prototype.slice.call(
        document.querySelectorAll("[" + attribute + "]")
      );
      elementArray.forEach(function (element) {
        element.setAttribute(
          attribute,
          element.getAttribute(attribute).replace("%", IS_MAC ? "Cmd" : "Ctrl")
        );
      });
    });

    /* Add aria-label for nested menu button elements */
    var pickerItemArray = Array.prototype.slice.call(
      document.querySelectorAll(".ql-picker-item")
    );
    pickerItemArray.forEach(function (element) {
      var dataLabel = element.getAttribute("data-label");
      var dataValue = element.getAttribute("data-value");
      if (!dataLabel && !dataValue) {
        element.setAttribute("aria-label", getTranslation("default"));
      } else if (dataLabel) {
        element.setAttribute("aria-label", dataLabel);
      } else if (dataValue) {
        element.setAttribute("aria-label", dataValue);
      }
    });

    quill.on(
      "text-change",
      debounce(function (delta, oldDelta, source) {
        /* Skip if recently blurred */
        if (!window.isQuillBlurred) {
          /* Skip if an image is present that has not been converted to a file yet */
          if (source == "user" && !doesBase64ImageExist(quill.getContents())) {
            window.isQuillActive = true;
            updateValue();
          }
        }
      }, 500)
    );

    /**
     * Additional event handler for inserted images (with no debounce).
     * Uploads the base64 string to Appian, stores the image as a file,
     * and replaces the base64 string in the Quill editor with the document
     * URL from Appian.
     *
     * Reference:
     * https://github.com/quilljs/quill/issues/1089#issuecomment-613640103
     */
    if (window.allowImages) {
      quill.on("text-change", function (delta, oldDelta, source) {
        const images = Array.prototype.slice.call(
          quill.container.querySelectorAll("img")
        );
        images.forEach(function (image) {
          if (isImageNewBase64(image)) {
            image.classList.add("loading");
            uploadBase64Img(image).then(function (source) {
              image.setAttribute("src", source);
              image.classList.remove("loading");
            });
          }
        });
      });
    }

    /* only update when focus is lost (when relatedTarget == null) */
    quill.root.addEventListener("blur", function (focusEvent) {
      // See https://github.com/quilljs/quill/issues/1951#issuecomment-408990849
      if (focusEvent && !focusEvent.relatedTarget) {
        window.isQuillActive = false;
        window.isQuillBlurred = true;
        updateValue();
        setTimeout(function () {
          window.isQuillBlurred = false;
        }, 500);
      }
    });
  }

  /* Update maxSize if specified */
  window.quillMaxSize = maxSize || MAX_SIZE_DEFAULT;

  /* Apply display settings */
  handleDisplay(enableProgressBar, height, placeholder);

  /* update value if user isn't currently editing */
  if (window.isQuillActive) {
    console.warn("Not updating contents because quill is active");
  } else {
    const contents = getContentsFromHTML(richText);
    quill.setContents(contents);
    // Convert the input back to Appian as a save value
    if (convertInput) {
      updateValue();
    }
  }

  // Check validations (max size & image connected system)
  validate(forceValidationUpdate);
});

initializeCopyPaste();

function updateValue() {
  if (validate(false)) {
    const contents = quill.getContents();
    /* Save value (Quill always adds single newline at end, so treat that as null) */
    /* Check getLength() in case an image is added without any text */
    if (quill.getText() === "\n" && quill.getLength() == 1) {
      Appian.Component.saveValue("richText", null);
    } else {
      // Due to race conditions, we were saving out base64 images in some cases
      // This check is run strictly against the actual html that will be output
      if (!doesBase64ImageExist(contents)) {
        const html = getHTMLFromContents(contents);
        Appian.Component.saveValue("richText", html);
      }
    }
  }
  // Always upload the uploaded documents on any update
  outputUploadedImages();
}

/************ Utility Methods *************/
function updateColors() {
  var cssStyles = [];

  // Accent color
  cssStyles.push("h3 {color: " + Appian.getAccentColor() + "}");

  // Transparency
  var backgroundColor = window.isReadOnly ? "transparent" : "#ffffff";
  cssStyles.push(
    "#parent-container {background-color: " + backgroundColor + "}"
  );

  styleEl.innerHTML = cssStyles.join("\n");
}

function handleDisplay(enableProgressBar, height, placeholder) {
  quill.enable(!window.isReadOnly);
  /* Toolbar */
  var toolbar = document.querySelector(".ql-toolbar");
  toolbar.style.display = window.isReadOnly ? "none" : "block";
  /* Progress Bar */
  var progressBar = document.getElementById("sizeBar");
  var showProgressBar = enableProgressBar !== false && !window.isReadOnly;
  progressBar.style.display = showProgressBar ? "block" : "none";
  /* Height
     IE11 doesn't support flexbox so instead manually set heights and minHeights
     https://caniuse.com/#feat=flexbox
  */

  if (window.isReadOnly) {
    /* When readonly, don't specify any minHeight or height to limit height to match the content */
    quillContainer.style.height = "auto";
    parentContainer.style.height = "auto";
    quillContainer.style.minHeight = "";
    parentContainer.style.minHeight = "";
  } else {
    if (height == "auto") {
      /* For "auto" height, start with a min height but allow to grow taller as content increases */
      quillContainer.style.height = "auto";
      parentContainer.style.height = "auto";
      /* Reserve ~60px for toolbar and progressBar. Reserve 45px for toolbar without progressBar */
      quillContainer.style.minHeight = showProgressBar ? "100px" : "115px";
      /* This is a randomly-selected, good looking default */
      parentContainer.style.minHeight = "160px";
    } else {
      /* For designer-specified heights, force height to match exactly and not grow */
      quillContainer.style.minHeight = "";
      parentContainer.style.minHeight = "";
      var heightInt = parseInt(height);
      /* Reserve ~60px for toolbar and progressBar. Reserve 45px for toolbar without progressBar */
      quillContainer.style.height =
        heightInt - (showProgressBar ? 60 : 45) + "px";
      parentContainer.style.height = heightInt + "px";
    }
    var quillEditor = document.getElementsByClassName("ql-editor")[0];
    /* Subtract 2px to account for the 1px border (1px top + 1px bottom = 2px) on quill-container */
    if (quillContainer.style.minHeight) {
      quillEditor.style.minHeight =
        parseInt(quillContainer.style.minHeight) - 2 + "px";
    } else {
      quillEditor.style.height =
        parseInt(quillContainer.style.height) - 2 + "px";
    }
  }

  /* Placeholder */
  quill.root.dataset.placeholder =
    placeholder && !window.isReadOnly ? placeholder : "";
}

function getContentsFromHTML(html) {
  /* Use a new, temporary Quill because update doesn't work if the current Quill is readonly */
  var tempQuill = new Quill(document.createElement("div"), {
    formats: allowedFormats,
  });
  html = revertIndentInlineToClass(html);
  tempQuill.root.innerHTML = html;
  tempQuill.update();
  var richTextContents = tempQuill.getContents();
  return richTextContents;
}

// This function provides backwards compatibility from the inline indentation to the class indentation
// Previously, a single indentation was <p style="margin-left: 1em;">
// Now, a single indentation is <p class="ql-indent-1">
function revertIndentInlineToClass(html) {
  var indentRegex = /style="margin-left: ([0-9]+)em;"/gi;
  return html.replace(indentRegex, replaceIndentRegex);
  function replaceIndentRegex(match) {
    return match
      .replace('style="margin-left: ', 'class="ql-indent-')
      .replace('em;"', '"');
  }
}

function getHTMLFromContents(contents) {
  var tempQuill = new Quill(document.createElement("div"));
  tempQuill.setContents(contents);
  return tempQuill.root.innerHTML;
}

/**
 * Enforce validations (currently just size validation)
 * @param {boolean} forceUpdate - If true, will execute setValidations() regardless of validation change (because of Appian caching of validations)
 * @return {boolean} Whether the component is valid
 */
function validate(forceUpdate) {
  const size = getSize();
  updateUsageBar(size);
  var newValidations = [];
  if (window.allowImages) {
    if (!window.connectedSystem) {
      newValidations.push(
        getTranslation("validationImageStorageConnectedSystemEmpty")
      );
    }
  }
  if (size > window.quillMaxSize && !window.isReadOnly) {
    newValidations.push(getTranslation("validationContentTooBig"));
  }
  if (
    forceUpdate ||
    !(newValidations.toString() === window.currentValidations.toString())
  ) {
    Appian.Component.setValidations(newValidations);
  }
  window.currentValidations = newValidations;
  return window.currentValidations.length === 0;
}

function getSize() {
  if (quill.getText() === "\n") {
    return 0;
  }
  const contents = quill.getContents();
  const html = getHTMLFromContents(contents);
  return html.length;
}

function isTextPresent(text) {
  const contents = quill.getContents();
  const html = getHTMLFromContents(contents);
  return html.includes(text);
}

function updateUsageBar(size) {
  var usageBar = document.getElementById("usageBar");
  var usageMessage = document.getElementById("usageMessage");
  const usage = Math.round((100 * size) / window.quillMaxSize);
  const usagePercent = usage <= 100 ? usage + "%" : "100%";
  /* update usage message */
  const message = " " + usagePercent + " " + getTranslation("usageBarUsed");
  usageMessage.innerHTML = message;
  /* update usage bar width and color */
  usageBar.style.width = usagePercent;
  if (usage <= 75) {
    usageBar.style.backgroundColor = Appian.getAccentColor();
  } else if (usage <= 90) {
    usageBar.style.backgroundColor = "orange";
  } else {
    usageBar.style.backgroundColor = "red";
  }
}

// Returns true if a base64 image exists in the contents
function doesBase64ImageExist(contents) {
  const html = getHTMLFromContents(contents);
  const base64ImgRegex = /\<img src="data:/g;
  return base64ImgRegex.test(html);
}

// Returns true if the image is a NEW base64 image
// -- Checks that its source is base64 & it doesn't have the loading class
// -- This check returning true means it needs to go through the Connected System & get its source replaced
function isImageNewBase64(image) {
  const base64ImgSrcRegex = /^data:/g;
  return (
    base64ImgSrcRegex.test(image.src) && !image.classList.contains("loading")
  );
}

function buildCssSelector(format) {
  return "button.ql-" + format + ",span.ql-" + format;
}

function debounce(func, delay) {
  var inDebounce;
  return function () {
    const context = this;
    const args = arguments;
    clearTimeout(inDebounce);
    inDebounce = setTimeout(function () {
      func.apply(context, args);
    }, delay);
  };
}

function uploadBase64Img(imageSelector) {
  if (!window.connectedSystem) {
    return;
  }
  let docURL;
  let docID;
  let message;

  function handleClientApiResponseForBase64(response) {
    if (response.payload.error) {
      console.error("Connected system response: " + response.payload.error);
      message = getTranslation("validationConnectedSystemResponse");
      Appian.Component.setValidations(message + response.payload.error);
      return;
    }

    docURL = response.payload.docURL;
    docID = response.payload.docID;

    if (docURL == null) {
      message = getTranslation("validationDocURLFailure");
      console.error(message);
      Appian.Component.setValidations(message);
      return;
    } else {
      // Clear any error messages
      Appian.Component.setValidations(window.currentValidations);
      window.uploadedImages.push({ docId: docID, docUrl: docURL });
      return docURL;
    }
  }

  function handleError(response) {
    if (response.error && response.error[0]) {
      console.error(response.error);
      Appian.Component.setValidations([response.error]);
    } else {
      message = "An unspecified error occurred";
      console.error(message);
      Appian.Component.setValidations([message]);
    }
  }

  base64Str = imageSelector.getAttribute("src");
  if (typeof base64Str !== "string" || base64Str.length < 100) {
    return base64Str;
  }
  const payload = {
    base64: base64Str,
  };

  return Appian.Component.invokeClientApi(
    window.connectedSystem,
    CLIENT_API_FRIENDLY_NAME,
    payload
  )
    .then(handleClientApiResponseForBase64)
    .then(function (docURL) {
      return docURL;
    })
    .catch(handleError);
}

/**
 * Handles the output of the `uploadedImages` parameter on any document upload.
 */
function outputUploadedImages() {
  let uploadedImages = [];
  window.uploadedImages.forEach(function (docMap) {
    let uploadedImage = docMap;
    uploadedImage["wasRemovedFromField"] = !isTextPresent(docMap.docUrl);
    uploadedImages.push(uploadedImage);
  });
  Appian.Component.saveValue("uploadedImages", uploadedImages);
}

/**
 * Gets the user's browser and version.
 *
 * Reference:
 * https://stackoverflow.com/questions/5916900/how-can-you-detect-the-version-of-a-browser
 *
 * @return {String} The browser and version, i.e. Chrome 62
 */
function getBrowserAndVersion() {
  var ua = navigator.userAgent,
    tem,
    M =
      ua.match(
        /(opera|chrome|safari|firefox|msie|trident(?=\/))\/?\s*(\d+)/i
      ) || [];
  if (/trident/i.test(M[1])) {
    tem = /\brv[ :]+(\d+)/g.exec(ua) || [];
    return "IE " + (tem[1] || "");
  }
  if (M[1] === "Chrome") {
    tem = ua.match(/\b(OPR|Edge)\/(\d+)/);
    if (tem != null) return tem.slice(1).join(" ").replace("OPR", "Opera");
  }
  M = M[2] ? [M[1], M[2]] : [navigator.appName, navigator.appVersion, "-?"];
  if ((tem = ua.match(/version\/(\d+)/i)) != null) M.splice(1, 1, tem[1]);
  return M.join(" ");
}

/**
 * Enable copy/paste from clipboard for non-html images.
 * Reference: https://github.com/quilljs/quill/issues/137
 */
function initializeCopyPaste() {
  var browserArray = getBrowserAndVersion().split(" ");
  var browser = browserArray[0];
  var browserVersion = browserArray[1];
  if (browser != "Firefox" && browser != "Chrome") {
    var IMAGE_MIME_REGEX = /^image\/(p?jpeg|gif|png)$/i;
    var loadImage = function (file) {
      var reader = new FileReader();
      reader.onload = function (e) {
        var img = document.createElement("img");
        img.src = e.target.result;
        var range = window.getSelection().getRangeAt(0);
        range.deleteContents();
        range.insertNode(img);
      };
      reader.readAsDataURL(file);
    };

    document.onpaste = function (e) {
      var items = e.clipboardData.items;
      items.forEach(function (item) {
        if (IMAGE_MIME_REGEX.test(item.type)) {
          loadImage(item.getAsFile());
          return;
        }
      });
    };
  }
}

// Returns the parent window URL
// Reference: https://stackoverflow.com/questions/3420004/access-parent-url-from-iframe
// NOTE document.referrer varies by browser, with possible outputs:
// - https://site-appiancloud.com/suite/sites/.... (IE)
// - https://site-appiancloud.com/ (Chrome, Firefox)
// - https://site-appiancloud.com (Safari)
function returnParentWindowUrl() {
  return document.referrer.match(/^.*(?=\/suite\/.*)|^.*(?=\/$)|^.*$/g)[0];
}

function translateToolbar() {
  var toolbar = document.getElementById("quill-toolbar");

  var nodesToTranslate = document.querySelectorAll("[data-i18n]");
  var nodeArray = Array.prototype.slice.call(nodesToTranslate);
  for (var i = 0; i < nodeArray.length; i++) {
    var node = nodeArray[i];
    var i18nAttr = node.getAttribute("data-i18n");
    var translatedValue;
    if (i18nAttr === "innerText") {
      var key = node.innerText;
      translatedValue = getTranslation(key);
      if (!translatedValue) continue;
      node.innerText = translatedValue;
    } else {
      var key = node.getAttribute(i18nAttr);
      translatedValue = getTranslation(key);
      if (!translatedValue) continue;
      node.setAttribute(i18nAttr, translatedValue);
    }
    node.setAttribute("aria-label", translatedValue);
  }
}

function getTranslation(key) {
  var locale = window.locale;
  var translations = supportedTranslations[locale];
  var message = translations[key];
  return message;
}
