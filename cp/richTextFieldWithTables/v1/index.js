/* Internationalization */
/* NOTE: this file depends on, and must be loaded after, i18n.js */
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

var locale = Appian.getLocale();
if (supportedLocales.indexOf(locale) < 0) {
  locale = "en-US"; // see https://issues.appian.com/browse/AN-193624
}
window.locale = locale;

// Load summernote initially because all future loading & destroying must be done off this variable
var summernote = $("#summernote").summernote({
  lang: locale, // default: 'en-US'
});

// Create a style element for dynamic CSS attributes
var styleEl = document.createElement("style");
document.head.appendChild(styleEl);

// Set event handlers
summernote.on("summernote.blur", function () {
  window.hasFocus = false;
  setAppianValue();
});
summernote.on("summernote.focus", function () {
  window.hasFocus = true;
});
summernote.on(
  "summernote.change", 
    debounceOnChange(function () {
      // Only run if the editor still has focus
      if (window.hasFocus) {
        setAppianValue();
      }
    }, 500)

);
summernote.on("summernote.paste", function (we, e) {
  e.preventDefault();
  summernote.summernote("pasteHTML", cleanHtml(readClipboard(e), true));
});

// After investigating, we determined that only these tags & attributes are necessary/supported in order to render all supported styles of the editor
const ALLOWED_TAGS = [
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "p",
  "span",
  "b",
  "strong",
  "i",
  "em",
  "u",
  "strike",
  "font",
  "ol",
  "ul",
  "li",
  "br",
  "table",
  "tbody",
  "th",
  "tr",
  "td",
  "a",
];
const ALLOWED_ATTRIBUTES = ["style", "color", "href", "target"];
const ALLOWED_STYLE_ATTRIBUTES = [
  "font-size",
  "background-color",
  "text-align",
  "margin-left",
];
const MAX_SIZE_DEFAULT = 10000;
const DISPLAY_PARAMS = [
  "height",
  "readOnly",
  "disabled",
  "placeholder",
  "tableBorderStyle",
  "insertableItemsLabel",
  "insertableItems",
];

window.allParameters;
window.hasFocus = false;
window.currentDisplayParameters = returnDisplayParams();
window.currentValidations = [];
window.lastSaveOutValue = "";
window.lastSaveTime = Date.now()+1000;
window.lastOnchangeTime = Date.now();

/**
 * Initializes summernote editor and handles all new values passed from Appian SAIL to the component
 */
Appian.Component.onNewValue(function (allParameters) {
  window.allParameters = allParameters;

  // First immediately set the contents before even building to avoid triggering onChange events
  setEditorContents();

  // Then, rebuild the editor if the display parameters have changed
  if (haveDisplayParamsChanged()) {
    // Since the display parameters have changed, re-build the editor
    buildEditor();
    // Set the table width in the dynanmic CSS if the readOnly-ness has changed
    setDynamicCss();
    // Update styles for accessibility compliance
    setA11yCss();
    // And then cache the displayParams to avoid rebuilding if they do not change
    window.currentDisplayParameters = returnDisplayParams();
  }

  // Finally validate, only forcing validation updates if it's not readOnly
  // NOTE: The reason we ALWAYS need to force validation updates when editable is because of Appian "caching" validations & complex SAIL interfaces
  // This type of pattern typically comes  up with very "dynamic" forms, such as a comment feed similar to Github/Facebook,
  // where individual editors are flipping between readOnly, editable & are being generated on the page with interactions (e.g. "Edit", "Add Comment")
  // Example Steps:
  // 1. Render the component with too much text (validation triggered)
  // 2. Have your SAIL interface hide the component (showWhen: false)
  // 3. Update the value of the component to be something smaller, with less text
  // 4. Re-show the component (showWhen: true)
  // 5. The validation previously triggered is still there (on the Appian-side)
  validate(!isReadOnly());

  // Always set the Appian value after setting the editor content to pass back out the formatted html (this will only run if the value actually changed)
  setAppianValue();
});

/**
 * Creates the summernote editor based on the display parameters
 */
function buildEditor() {
  // Always destroy the editor before recreating (or leaving destroyed if readOnly)
  summernote.summernote("destroy");

  // Initialize the editor if not readOnly
  if (!isReadOnly()) {
    // 72px is arbitrarily determined based on the height of the toolbar
    var height =
      window.allParameters.height === "auto"
        ? "auto"
        : parseInt(window.allParameters.height) - 72;

    // Code for the insertable items button
    var insertableItemsFiltered = [];
    if (window.allParameters.insertableItems) {
      insertableItemsFiltered = window.allParameters.insertableItems.filter(
        function (i) {
          return i.label && i.value;
        }
      );
    }
    var insertableItemsButton = function (context) {
      var ui = $.summernote.ui;
      var event = ui.buttonGroup([
        ui.button({
          contents:
            cleanHtml(window.allParameters.insertableItemsLabel, true) +
            ' <span class="note-icon-caret"></span>',
          tooltip: cleanHtml(window.allParameters.insertableItemsLabel, true),
          data: { toggle: "dropdown" },
        }),
        ui.dropdown({
          items: insertableItemsFiltered
            ? insertableItemsFiltered.map(function (i) {
                return cleanHtml(i.label, true);
              })
            : [],
          callback: function (items) {
            $(items)
              .find(".dropdown-item")
              .on("click", function (e) {
                var selectedItem = $(this).html();
                insertableItemsFiltered.map(function (i) {
                  if (selectedItem == cleanHtml(i.label, true)) {
                    context.invoke("editor.insertText", i.value);
                  }
                });
                e.preventDefault();
              });
          },
        }),
      ]);
      return event.render();
    };

    var toolbar = [
      // [groupName, [list of button]]
      // Note, list of available buttons can be found here: https://summernote.org/deep-dive/#custom-toolbar-popover
      ["group0", ["style"]],
      ["group1", ["fontsize"]],
      ["group2", ["bold", "italic", "underline", "strikethrough"]],
      ["group3", ["forecolor", "backcolor"]],
      ["group4", ["ol", "ul"]],
      ["group5", ["paragraph", "table"]],
      ["group6", ["link"]],
      ["group7", ["clear"]],
    ];
    if (window.allParameters.insertableItemsLabel.length > 0) {
      toolbar.splice(7, 0, ["insertableItems", ["insertableItems"]]);
    }

    summernote.summernote({
      lang: locale,
      placeholder: window.allParameters.placeholder,
      height: height,
      disableDragAndDrop: true,
      toolbar: toolbar,
      buttons: {
        insertableItems: insertableItemsButton,
      },
      styleTags: [
        "p",
        // Leaving out headers that aren't part of Appian's Rich Text Header component for the time being
        // "h1",
        // "h2",
        {
          title: getTranslation("textHeaderLarge"),
          tag: "h3",
          className: "h3",
          value: "h3",
        },
        {
          title: getTranslation("textHeaderMedium"),
          tag: "h4",
          className: "h4",
          value: "h4",
        },
        {
          title: getTranslation("textHeaderSmall"),
          tag: "h5",
          className: "h5",
          value: "h5",
        },
        // "h6",
      ],
      fontSizes: ["10", "14", "18", "32"],
    });

    // Hide the resize bar and status bar, we will handle height automatically based on the input
    $(".note-resizebar").hide();
    $(".note-status-output").hide();

    // Hide the link input boxes checkbox since all tabs must open in a new window anways
    $(".sn-checkbox-use-protocol").hide();
    $(".sn-checkbox-open-in-new-window").hide();

    // Hide the custom color button & boxes
    $(".note-color-select").hide();
    $(".note-holder-custom").hide();

    // Set the minHeight to an arbitrarily determined height 188px that looks good
    $(".note-editable").css("min-height", "188px");

    // Remove tabindex attribute of buttons so that a user can tab through them (accessibility)
    $("button").removeAttr("tabindex");
  }
}

/**
 * Return only the display parameters into an object
 * @return {object} The display parameters as an object
 */
function returnDisplayParams() {
  var displayParams = {};
  for (var i = 0; i < DISPLAY_PARAMS.length; i++) {
    var param = DISPLAY_PARAMS[i];
    displayParams[param] = !window.allParameters
      ? ""
      : window.allParameters[param];
  }
  return displayParams;
}

/**
 * Checks if any of the display params have changed
 * @return {boolean} True if any of the display params have changed
 */
function haveDisplayParamsChanged() {
  for (var i = 0; i < DISPLAY_PARAMS.length; i++) {
    var param = DISPLAY_PARAMS[i];
    if (
      JSON.stringify(window.currentDisplayParameters[param]) !==
      JSON.stringify(window.allParameters[param])
    ) {
      return true;
    }
  }
  return false;
}

/**
 * Saves the editor content back to Appian SAIL, validating the content first
 */
function setAppianValue() {
  if (!isReadOnly() && validate(false)) {
    var newSaveOutValue = cleanHtml(getEditorContents());
    // Always save-out unless the new value we would be saving out matches the last value we saved out
    if (window.lastSaveOutValue !== newSaveOutValue) {
      window.lastSaveTime = Date.now();
      Appian.Component.saveValue("richText", newSaveOutValue);
      window.lastSaveOutValue = newSaveOutValue;
    }
  }
}

/**
 * Updates the editor content HTML value from the Appian SAIL parameter, only updating if there is a change
 */
function setEditorContents() {
  if (isReadOnly()) {
    // For readonly or non-existant summernote, always set the contents since it won't trigger the onChange event
    // Then immediately destroy since setting the contents creates it
    summernote.summernote("code", cleanHtml(window.allParameters.richText));
    summernote.summernote("destroy");
  } else {
    // Otherwise, only update the contents if they've actually changed to avoid triggering the onChange event
    if (
      window.allParameters.richText !== window.lastSaveOutValue &&
      window.allParameters.richText !== getEditorContents()
    ) {
      // Only update the contents if the last save occurred after the last onChange
      if (window.lastSaveTime >= (window.lastOnchangeTime + 600)) {
        summernote.summernote("code", cleanHtml(window.allParameters.richText));
      } 
    } else {
      // Reset the lastSaveTime
      window.lastSaveTime = window.lastOnchangeTime + 600;
    }
  }
}

/**
 * Get the HTML contents from the editor
 * @return {string} The HTML contents from the editor as a string
 */
function getEditorContents() {
  if (summernote.summernote("isEmpty")) {
    return "";
  } else {
    return summernote.summernote("code");
  }
}

/**
 * Sets dynamic CSS for the table-layout (fixed/auto) and table border-width (STANDARD, LIGHT, NONE)
 */
function setDynamicCss() {
  var cssStyles = [];

  // table-layout
  var tableLayout = isReadOnly() ? "auto" : "fixed";
  cssStyles.push("table {table-layout: " + tableLayout + " !important}");
  var backgroundColor = isReadOnly() ? "transparent" : "#ffffff";
  cssStyles.push("body {background-color: " + backgroundColor + " !important}");

  // border-width
  var tableBorderWidth;
  if (window.allParameters.tableBorderStyle === "NONE") {
    // NONE
    tableBorderWidth = "0px";
  } else if (window.allParameters.tableBorderStyle === "LIGHT") {
    // LIGHT
    tableBorderWidth = "1px 0px";
    cssStyles.push(
      "table, table tr:last-child, table tr:last-child td {border-bottom: 0px !important}"
    );
    cssStyles.push(
      "table, th, table tr:first-child, table tr:first-child td {border-top: 0px !important}"
    );
  } else {
    // STANDARD
    tableBorderWidth = "1px";
  }
  cssStyles.push(
    "table, td, th, tr {border-width: " + tableBorderWidth + " !important}"
  );

  // set styles
  styleEl.innerHTML = cssStyles.join("\n");
}

/**
 * Updates to CSS for A11y compliance
 */
function setA11yCss() {
  // set aria-hidden to false for the close buttons
  var close_buttons = document.getElementsByClassName("btn-close");
  for (var i = 0; i < close_buttons.length; i++) {
    close_buttons[i].setAttribute("aria-hidden", "false");
  }
  // set aria-expanded to false for buttons that will expand
  var dropdowns = document.querySelectorAll('[data-bs-toggle="dropdown"]');
  for (var i = 0; i < dropdowns.length; i++) {
    dropdowns[i].setAttribute("aria-expanded", "false");
  }
  // set aria-label to "formatting options" for toolbars
  var toolbars = document.querySelectorAll('[role="toolbar"]');
  for (var i = 0; i < toolbars.length; i++) {
    toolbars[i].setAttribute("aria-label", "formatting options");
  }
}

/**
 * Checks if the editor is set to readOnly
 * @return {boolean} True if readOnly, false if not
 */
function isReadOnly() {
  return window.allParameters.readOnly === true;
}

/**
 * Enforce validations (currently just size validation)
 * @param {boolean} forceUpdate - If true, will execute setValidations() regardless of validation change (because of Appian caching of validations)
 * @return {boolean} Whether the component is valid
 */
function validate(forceUpdate) {
  var newValidations = [];
  var maxSize = window.allParameters.maxSize || MAX_SIZE_DEFAULT;
  if (!isReadOnly() && getEditorContents().length > maxSize) {
    newValidations.push("Content exceeds maximum allowed size");
  }
  if (
    forceUpdate ||
    newValidations.toString() !== window.currentValidations.toString()
  ) {
    Appian.Component.setValidations(newValidations);
  }
  window.currentValidations = newValidations;
  return window.currentValidations.length === 0;
}

/**
 * Cleans an HTML string for only allowed tags & attributes, and formats as HTML if not
 * @param {string} html - HTML string to clean & format
 * @param {boolean} isPartialHtml - True if the input should be considered "partial", meaning not the entire editor contents. This is from a paste event.
 * @return {string} Cleaned html string
 */
function cleanHtml(html, isPartialHtml) {
  var out = html;
  isPartialHtml = isPartialHtml || false;

  // Return nothing if HTML is empty
  if (out === "") {
    return "";
  }

  // Step 1: Convert to HTML
  var isContentHtml = out.charAt(0) === "<";
  if (isContentHtml) {
    // If the content is HTML, just remove carriage returns
    out = out.replace(/\r?\n/g, "");
  } else {
    if (isPartialHtml) {
      // If the content is partial HTML (from a paste event), replace carriage returns with <br>s
      out = out.split(/\r?\n/g).join("<br>");
    } else {
      // If the content is not partial HTML (from an input SAIL  value), replace carriage returns with <p> separators
      out = "<p>" + out.split(/\r?\n/g).join("</p><p>") + "</p>";
    }
  }

  // START TEMPORARY REFACTOR FOR IE -- BELOW WILL BE UNCOMMENTED ONCE IE IS DEPRECATED

  // NOTE: Non-IE can use more enhanced regex with lookbehind,
  // however the regex expression throws an error in IE, so we cannot use this until we deprecate IE support

  // Step 2: Remove all unnecessary HTML tags
  // Any HTML tag that isn't in our allowed list will be stripped (i.e. those unrelated to the formatting the editor supports)
  // Test this Regex here: https://regexr.com/64goc
  // out = out.replace(/<\/?([\w-]+)[^>]*>/g, function ($0, $1) {
  //   return ALLOWED_TAGS.indexOf($1) > -1 ? $0 : "";
  // });

  // // Step 3: Remove all unnecessary HTML attributes
  // // Any HTML attribute that isn't in our allowed list will be stripped (i.e. those unrelated to the formatting the editor supports)
  // // Test this Regex here: https://regexr.com/64goi
  // out = out.replace(
  //   /(?<=<(?:[^>]|".*")* )([\w-]+)="[^"]+?"(?=(?:[^<]|".*")*>)/g,
  //   function ($0, $1) {
  //     return ALLOWED_ATTRIBUTES.indexOf($1) > -1 ? $0 : "";
  //   }
  // );

  // // Step 4: Remove all unnecessary HTML style attributes
  // // Any HTML style attribute that isn't in our allowed list will be stripped (i.e. those unrelated to the formatting the editor supports)
  // // Test this Regex here: https://regexr.com/64gol
  // out = out.replace(
  //   /(?<=<[^>]*style="[^"]*)([\w-]+): ?(?:[^;]|&quot;)*?(?<!&quot); ?/g,
  //   function ($0, $1) {
  //     return ALLOWED_STYLE_ATTRIBUTES.indexOf($1) > -1 ? $0 : "";
  //   }
  // );

  // TEMPORARY REFACTOR FOR IE -- ABOVE WILL BE UNCOMMENTED, BELOW WILL BE DELETED ONCE IE IS DEPREACTED

  // Step 2: Remove all unnecessary HTML tags
  // Test this Regex here: https://regexr.com/64goc
  out = out.replace(/<\/?([\w-]+)[^>]*>/g, function ($0, $1) {
    if (ALLOWED_TAGS.indexOf($1) > -1) {
      // Step 3: Remove all unnecessary HTML attributes
      // Test this Regex here: https://regexr.com/64gq8
      return $0.replace(/([\w-]+)="[^"]+?"/g, function ($0, $1) {
        if (ALLOWED_ATTRIBUTES.indexOf($1) > -1) {
          if ($1 === "style") {
            // Step 4: Remove all unnecessary HTML style attributes
            // Test this Regex here: https://regexr.com/64gqb
            return $0.replace(
              /([\w-]+): ?(?:[^;]|&quot;)*?;? ?(?=[^;]*:|")/g,
              function ($0, $1) {
                return ALLOWED_STYLE_ATTRIBUTES.indexOf($1) > -1 ? $0 : "";
              }
            );
          } else {
            return $0;
          }
        } else {
          return "";
        }
      });
    } else {
      return "";
    }
  });

  // END TEMPORARY REFACTOR FOR IE -- ABOVE WILL BE DELETED ONCE IE IS DEPRECATED

  // Step 5: Strip non-external links
  // Any hyperlink that isn't to an external URL or mailto URL will not work as expected anyways, so this will strip those hyperlinks
  // Test this Regex here: https://regexr.com/64iom
  out = out.replace(/<a.*?href="(.*?)">(.*?)<\/a>/g, function ($0, $1, $2) {
    // Test this Regex here: https://regexr.com/6blub
    return $1.match(/^(?:[A-Za-z0-9+\-.]+:)?(?:https:\/\/?|mailto:).*$/g)
      ? $0
      : $2;
  });

  // Step 6: Remove any HTML comments
  out = out.replace(/<!--.*?-->/g, "");

  // Step 7: Trim extra spaces
  out = out.trim().replace(/ +/g, " ");

  return out;
}

/**
 * Returns the clipboard data after a paste event
 * NOTE, this is referenced from here: https://github.com/DiemenDesign/summernote-cleaner/blob/master/summernote-cleaner.js#L143-L151
 * @param {event} e - The paste event passed from summernote.paste
 * @return {string} Returns either the text or html value of the pasted content
 */
function readClipboard(e) {
  if (isInternetExplorer()) {
    return window.clipboardData.getData("Text");
  } else {
    return (
      e.originalEvent.clipboardData.getData("text/html") ||
      e.originalEvent.clipboardData.getData("text/plain")
    );
  }
}

/**
 * Returns true if the user agent/browser is Internet Explorer
 * @return {boolean} True if Internet Explorer
 */
function isInternetExplorer() {
  var ua = window.navigator.userAgent;
  var msie = ua.indexOf("MSIE ");
  msie = msie > 0 || !!navigator.userAgent.match(/Trident.*rv\:11\./);
  var ffox = navigator.userAgent.toLowerCase().indexOf("firefox") > -1;
  return msie;
}

/**
 * Debounce utility https://codeburst.io/throttling-and-debouncing-in-javascript-b01cad5c8edf
 * @param {function} func - Function to run on a delay
 * @param {integer} delay - MS to delay re-execution of the function
 */
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

function debounceOnChange(func, delay) {
  var inDebounce;
  return function () {
    window.lastOnchangeTime = Date.now();
    const context = this;
    const args = arguments;
    clearTimeout(inDebounce);
    inDebounce = setTimeout(function () {
      func.apply(context, args);
    }, delay);
  };
}

function getTranslation(key) {
  var locale = window.locale;
  var translationMap = supportedTranslations[locale];
  var message = translationMap[key];
  return message;
}
