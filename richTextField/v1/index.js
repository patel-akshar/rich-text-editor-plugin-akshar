const MAX_SIZE_DEFAULT = 10000;
const IS_MAC = navigator.platform.indexOf("Mac") > -1;
window.quillMaxSize = MAX_SIZE_DEFAULT;
window.isQuillActive = false;
window.currentValidations = [];
window.isReadOnly = false;
// Exclude formats that don't match parity with Appian Rich Text Display Field
// Won't be able to paste unsupported formats
// Note this is separate from what toolbar allows
// https://quilljs.com/docs/formats/
// Also see getContentsFromHTML() where unsupported formats are removed
// from the incoming HTML value if present
const availableFormats = [
  ["header", "size"],
  ["bold", "italic", "underline", "strike", "color", "background"],
  ["link"],
  ["align", "indent"],
  ["list"]
];
const availableFormatsFlattened = availableFormats.reduce(function(acc, val) {
  return acc.concat(val, []);
});
var parentContainer = document.getElementById("parent-container");
var quillContainer = document.getElementById("quill-container");
var quill;

Appian.Component.onNewValue(function(allParameters) {
  const maxSize = allParameters.maxSize;
  const richText = allParameters.richText;
  const enableProgressBar = allParameters.enableProgressBar;
  const height = allParameters.height;
  const placeholder = allParameters.placeholder;
  window.isReadOnly = allParameters.readOnly;

  /* Initialize Quill and set allowed formats and toolbar */
  if (!quill) {
    var allowedFormats =
      !allParameters.allowedFormats || !allParameters.allowedFormats.length
        ? availableFormatsFlattened
        : allParameters.allowedFormats;
    quill = new Quill(quillContainer, {
      formats: allowedFormats,
      modules: {
        toolbar: "#quill-toolbar",
        history: {
          delay: 500,
          maxStack: 500,
          userOnly: true
        }
      },
      placeholder: "",
      theme: "snow"
    });

    insertAccentColor(Appian.getAccentColor());

    /* Hide/show toolbar options based on if they are allowed formats */
    availableFormatsFlattened.forEach(function(format) {
      var nodeArray = Array.prototype.slice.call(document.querySelectorAll(buildCssSelector(format)));
      nodeArray.forEach(function(element) {
        element.style.display = allowedFormats.indexOf(format) >= 0 ? "block" : "none";
      });
    });

    /* Add spacing to the toolbar based on visibilities */
    availableFormats.forEach(function(formatList) {
      var cssSelectors = [];
      formatList.forEach(function(format) {
        if (allowedFormats.indexOf(format) >= 0) {
          cssSelectors.push(buildCssSelector(format));
        }
      });
      if (cssSelectors.length > 0) {
        var elementsOfFormatList = document.querySelectorAll(cssSelectors.join(","));
        var lastElementOfFormatList = elementsOfFormatList[elementsOfFormatList.length - 1];
        lastElementOfFormatList.classList.add("ql-spacer");
      }
    });

    /* Update tooltips for Mac vs. PC */
    var tooltipArray = Array.prototype.slice.call(document.querySelectorAll("[tooltip]"));
    tooltipArray.forEach(function(element) {
      element.setAttribute("tooltip", element.getAttribute("tooltip").replace("%", IS_MAC ? "Cmd" : "Ctrl"));
    });

    quill.on("text-change", function(delta, oldDelta, source) {
      if (source == "user") {
        window.isQuillActive = true;
        validate(false);
      }
    });

    /* only update when focus is lost (when relatedTarget == null) */
    quill.root.addEventListener("blur", function(focusEvent) {
      // See https://github.com/quilljs/quill/issues/1951#issuecomment-408990849
      if (focusEvent && !focusEvent.relatedTarget) {
        window.isQuillActive = false;
        updateValue();
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
  }

  /* Check max size */
  validate(true);
});

function updateValue() {
  if (validate(false)) {
    const contents = quill.getContents();
    /* Save value (Quill always adds single newline at end, so treat that as null) */
    if (quill.getText() === "\n") {
      Appian.Component.saveValue("richText", null);
    } else {
      const html = getHTMLFromContents(contents);
      Appian.Component.saveValue("richText", html);
    }
  }
}

/************ Utility Methods *************/
function insertAccentColor(color) {
  var styleEl = document.createElement("style");
  document.head.appendChild(styleEl);
  var styleSheet = styleEl.sheet;
  styleSheet.insertRule("h3" + "{" + "color: " + color + "}", styleSheet.cssRules.length);
}

function handleDisplay(enableProgressBar, height, placeholder) {
  quill.enable(!window.isReadOnly);
  /* Toolbar */
  var toolbar = document.querySelector(".ql-toolbar");
  toolbar.style.display = window.isReadOnly ? "none" : "block";
  /* Progress Bar */
  var progressBar = document.getElementById("sizeBar");
  progressBar.style.display = enableProgressBar === false || window.isReadOnly ? "none" : "block";
  /* Height */
  parentContainer.style.height = window.isReadOnly ? "auto" : height;
  parentContainer.style.minHeight = window.isReadOnly ? "" : "200px";
  /* Placeholder */
  quill.root.dataset.placeholder = placeholder && !window.isReadOnly ? placeholder : "";
}

function getContentsFromHTML(html) {
  var richTextContents = quill.clipboard.convert(html);
  richTextContents.ops.forEach(function(element) {
    // Remove unsupported attributes because clipboard.convert() doesn't strip unsupported
    // formats despite being specified above in availableFormats
    // https://quilljs.com/docs/formats/
    if (element.attributes) {
      delete element.attributes.font;
      delete element.attributes.script;
      delete element.attributes.blockquote;
      delete element.attributes.code;
      delete element.attributes.formula;
      delete element.attributes.image;
      delete element.attributes.video;
      const headerLevel = element.attributes.header;
      if (headerLevel && headerLevel !== 3 && headerLevel !== 4 && headerLevel !== 5) {
        delete element.attributes.header;
      }
    }
    /* compensate for bug in Quill where it keeps adding newlines before block elements when converting from HTML */
    var text = element.insert;
    if (typeof text === "string" && text.endsWith("\n\n")) {
      const endingBreaksIndex = text.lastIndexOf("\n\n");
      if (endingBreaksIndex >= 0) {
        text = text.substring(0, endingBreaksIndex) + "\n";
        element.insert = text;
      }
    }
  });
  return richTextContents;
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
  if (size > window.quillMaxSize && !window.isReadOnly) {
    newValidations.push("Content exceeds maximum allowed size");
  }
  if (forceUpdate || !(newValidations.toString() === window.currentValidations.toString())) {
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

function updateUsageBar(size) {
  var usageBar = document.getElementById("usageBar");
  var usageMessage = document.getElementById("usageMessage");
  const usage = Math.round((100 * size) / window.quillMaxSize);
  const usagePercent = usage <= 100 ? usage + "%" : "100%";
  /* update usage message */
  const message = " " + usagePercent + " used";
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

function buildCssSelector(format) {
  return "button.ql-" + format + ",span.ql-" + format;
}
