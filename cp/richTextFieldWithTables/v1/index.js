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

// These are directly pulled from summernote-bs5.js
const MAILTO_PATTERN = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
const URL_SCHEME_PATTERN = /^([A-Za-z][A-Za-z0-9+-.]*\:|#|\/)/;

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
  let clipboardHtml = readClipboard(e) || "";

  // An image FILE on the clipboard is sometimes the content (right-click ->
  // Copy image; Outlook pairs text with the real image as a file) and sometimes
  // a redundant snapshot of content the html already carries (Excel/Word range
  // copies attach a bitmap of the selection; some apps attach the file AND embed
  // it in the html). Summernote's own file insertion is disabled
  // (allowClipboardImagePasting: false), so this is the single decision point:
  // insert the files only when the html does not already carry the image.
  var clipboardFiles =
    e.originalEvent && e.originalEvent.clipboardData && e.originalEvent.clipboardData.files;
  // Only image files are pasteable content: a copied document (e.g. a PDF from
  // the file explorer) must not become a broken <img> or an uploaded blob
  var clipboardImageFiles = [];
  for (var fileIndex = 0; clipboardFiles && fileIndex < clipboardFiles.length; fileIndex++) {
    if (/^image\//i.test(clipboardFiles[fileIndex].type)) {
      clipboardImageFiles.push(clipboardFiles[fileIndex]);
    }
  }
  if (clipboardImageFiles.length > 0) {
    var visibleClipboardText = clipboardHtml
      .replace(DANGEROUS_TAGS_PATTERN, "")
      .replace(/<[^>]*>/g, " ")
      .replace(/&nbsp;|&#160;/gi, " ")
      .trim();
    // img whose src is not loadable (cid:, file:///) - the file is its real copy
    var UNLOADABLE_IMG_REGEX = /<img\b[^>]*\ssrc=["']?(?!https?:|data:)[^"'\s>]/i;
    if (visibleClipboardText === "") {
      // Image-only clipboard: the files ARE the content
      summernote.summernote("insertImagesOrCallback", clipboardImageFiles);
      return;
    }
    if (UNLOADABLE_IMG_REGEX.test(clipboardHtml)) {
      // Text plus an unloadable image reference (Outlook): the file is the
      // image's only usable copy - insert it, and the html text proceeds below
      summernote.summernote("insertImagesOrCallback", clipboardImageFiles);
    }
    // Otherwise the html already carries everything (a table, or a loadable
    // embedded image): the file is a snapshot duplicate - ignore it
  }

  // Plain-text clipboard: newlines are real line breaks. Wrap MULTI-line results
  // in one <p> (bare text+<br> sequences derail insertNode, losing later lines);
  // single-line text stays unwrapped so it inserts inline without splitting.
  if (clipboardHtml.charAt(0) !== "<") {
    clipboardHtml = cleanHtml(clipboardHtml, true);
    if (clipboardHtml.indexOf("<br>") !== -1) {
      clipboardHtml = "<p>" + clipboardHtml + "</p>";
    }
  }

  // Clear any newlines present in ordered lists from Word before the DOMParser splits the HTML into nodes and replaces them with <br>
  if (clipboardHtml.indexOf("mso-list") !== -1) {
    var WORD_ORDERED_LIST_REGEX = /<!\[if !supportLists\]>([\s\S]*?)<!\[endif\]>/gi;
    clipboardHtml = clipboardHtml.replace(WORD_ORDERED_LIST_REGEX, function (match, content) {
      return content.replace(/[\r\n]+/g, "");
    });
  }

  var insertNodes = buildInsertNodes(clipboardHtml);

  // Take stock of the editor's blank paragraphs before inserting, so paste
  // artifacts can be cleaned up afterwards without touching intentional ones
  var editor = document.querySelector(".note-editable");
  var emptyPasteParagraph = findCaretEmptyParagraph();
  var existingTrailingEmptyParagraphs = snapshotTrailingEmptyParagraphs(editor);

  // Insert at cursor position using insertNode to avoid splitting existing content
  insertNodes.forEach(function (node, i, arr) {
    $("#summernote").summernote("insertNode", node);
    // insertNode leaves the caret inside a new table's last cell, and an
    // "after the table" range normalizes back into it - a following INLINE node
    // would land in the cell (blocks escape on their own; a trailing table is
    // handled after the loop). Park the caret in an empty paragraph below the
    // table and sync lastRange (insertNode reads it, not the live selection).
    var next = arr[i + 1];
    var inlineFollows = next && !isBlockElement(next);
    if (
      inlineFollows &&
      node.nodeName &&
      node.nodeName.toLowerCase() === "table" &&
      node.parentNode
    ) {
      var paraAfterTable = node.nextSibling;
      if (!isEmptyParagraph(paraAfterTable)) {
        paraAfterTable = document.createElement("p");
        paraAfterTable.innerHTML = "<br>";
        node.parentNode.insertBefore(paraAfterTable, node.nextSibling);
      }
      var afterTableRange = document.createRange();
      afterTableRange.setStart(paraAfterTable, 0);
      afterTableRange.collapse(true);
      var afterTableSelection = window.getSelection();
      afterTableSelection.removeAllRanges();
      afterTableSelection.addRange(afterTableRange);
      summernote.summernote("editor.setLastRange");
    }
  });

  removePasteArtifacts(editor, emptyPasteParagraph, existingTrailingEmptyParagraphs);

  // Upload base64 images that arrived inside the pasted HTML (modern Word embeds
  // them as data: URIs). onImageUpload only fires for image FILES, and saving is
  // blocked while base64 exists - without this, such pastes never save. Same flow
  // as onImageUpload; isImageNewBase64 skips images already uploading.
  // Scans the whole editor, not just the pasted nodes, so an image whose earlier
  // upload failed (left as base64, blocking saves) is retried here too.
  if (editor) {
    Array.from(editor.querySelectorAll("img")).forEach(function (imgNode) {
      if (!window.connectedSystem || !isImageNewBase64(imgNode)) {
        return;
      }
      imgNode.classList.add("loading");
      var upload = uploadBase64Img(imgNode);
      // uploadBase64Img returns a non-promise for sub-100-char data URIs
      if (upload && typeof upload.then === "function") {
        upload.then(function (source) {
          if (source) {
            imgNode.setAttribute("src", source);
          }
          imgNode.classList.remove("loading");
          setAppianValue();
        });
      } else {
        imgNode.classList.remove("loading");
      }
    });
  }

  // Ensure an empty paragraph follows a trailing table so the cursor can sit
  // below it; reuse the split-remnant blank a mid-content paste leaves behind.
  var lastNode = insertNodes[insertNodes.length - 1];
  if (lastNode && lastNode.nodeName.toLowerCase() === "table") {
    var emptyPara = lastNode.nextSibling;
    if (!isEmptyParagraph(emptyPara)) {
      emptyPara = document.createElement("p");
      emptyPara.innerHTML = "<br>";
      summernote.summernote("editor.insertNode", emptyPara);
    }
    // Collapse the caret at offset 0 (BEFORE the <br>): after it, browsers draw
    // the caret against the table's edge until the first keystroke.
    if (emptyPara && emptyPara.parentNode) {
      var caretRange = document.createRange();
      caretRange.setStart(emptyPara, 0);
      caretRange.collapse(true);
      var caretSelection = window.getSelection();
      caretSelection.removeAllRanges();
      caretSelection.addRange(caretRange);
    }
  }
});

/**
 * Builds the DOM nodes to insert for a paste: parses the clipboard HTML,
 * cleans each top-level node, and drops the whitespace-only text nodes that
 * would derail insertion.
 * @param {string} clipboardHtml - The (pre-processed) clipboard HTML
 * @return {Node[]} Nodes ready to pass to summernote insertNode
 */
function buildInsertNodes(clipboardHtml) {
  var parser = new DOMParser();
  var doc = parser.parseFromString(clipboardHtml, "text/html");

  var cleanedHtml = "";
  doc.body.childNodes.forEach(function (node) {
    if (node.nodeType === Node.ELEMENT_NODE) {
      var cleaned = cleanHtml(node.outerHTML, true);
      cleaned = stripSummernoteDefaults(cleaned);
      cleanedHtml += cleaned;
    } else if (node.nodeType === Node.TEXT_NODE) {
      // Keep ALL text nodes - whitespace between inline elements is a real space
      cleanedHtml += node.textContent;
    }
  });

  var insertParser = new DOMParser();
  var insertDoc = insertParser.parseFromString(cleanedHtml, "text/html");
  var insertNodes = Array.from(insertDoc.body.childNodes);

  // Drop whitespace-only text nodes adjacent to a block: they are source
  // formatting, and inserting them derails insertNode (verified in-browser:
  // "<p>a</p> <b>x</b> <p>b</p>" pasted only "a"). Spaces between inlines stay.
  return insertNodes.filter(function (node, i, arr) {
    if (node.nodeType !== Node.TEXT_NODE || node.textContent.trim() !== "") {
      return true;
    }
    return !(isBlockElement(arr[i - 1]) || isBlockElement(arr[i + 1]));
  });
}

var BLOCK_LEVEL_REGEX = /^(P|H[1-6]|UL|OL|TABLE)$/;
/**
 * True if the node is one of the block-level elements the editor supports.
 * @param {Node} node - The node to test
 */
function isBlockElement(node) {
  return !!(node && node.nodeType === Node.ELEMENT_NODE && BLOCK_LEVEL_REGEX.test(node.nodeName));
}

/**
 * True if the element's text is blank once NBSP and zero-width characters are
 * ignored. Does not consider child elements - callers layer their own structural
 * checks (e.g. isEmptyParagraph additionally requires <br> and no media).
 * @param {Node} node - The node to test
 */
function hasBlankText(node) {
  return (
    node.textContent
      .replace(/\u00a0/g, "")
      .replace(/[\u200b-\u200d\ufeff]/g, "")
      .trim() === ""
  );
}

/**
 * Returns true if the node is a visually empty paragraph (<p><br></p>,
 * possibly containing only whitespace or &nbsp;) - the artifact Summernote
 * leaves behind around paste operations.
 * @param {Node} node - The node to test
 */
function isEmptyParagraph(node) {
  return !!(
    node &&
    node.nodeName.toLowerCase() === "p" &&
    hasBlankText(node) &&
    node.querySelector("br")
  );
}

/**
 * Returns the empty paragraph at the caret, if any. Pressing Enter before
 * pasting leaves a <p><br></p> there that would otherwise remain as a stray
 * blank line once block content is inserted after it.
 * @return {Element|null} The empty paragraph at the caret, or null
 */
function findCaretEmptyParagraph() {
  var selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) {
    return null;
  }
  var currentNode = selection.getRangeAt(0).startContainer;
  if (currentNode.nodeType !== Node.ELEMENT_NODE) {
    currentNode = currentNode.parentNode;
  }
  var paragraph = currentNode && currentNode.closest ? currentNode.closest("p") : null;
  if (paragraph && paragraph.closest(".note-editable") && isEmptyParagraph(paragraph)) {
    return paragraph;
  }
  return null;
}

/**
 * Records the blank paragraphs already at the bottom of the editor before a
 * paste. These may be intentional and must not be removed by paste cleanup.
 * @param {Element} editor - The .note-editable element
 * @return {Element[]} The pre-existing trailing empty paragraphs
 */
function snapshotTrailingEmptyParagraphs(editor) {
  var existing = [];
  var node = editor ? editor.lastElementChild : null;
  while (isEmptyParagraph(node)) {
    existing.push(node);
    node = node.previousElementSibling;
  }
  return existing;
}

/**
 * Removes the blank paragraphs a paste leaves behind: the (still empty) caret
 * paragraph and any NEW trailing empty paragraphs - while preserving trailing
 * blanks that existed before the paste.
 * @param {Element} editor - The .note-editable element
 * @param {Element|null} emptyPasteParagraph - From findCaretEmptyParagraph
 * @param {Element[]} existingTrailingEmptyParagraphs - From snapshotTrailingEmptyParagraphs
 */
function removePasteArtifacts(editor, emptyPasteParagraph, existingTrailingEmptyParagraphs) {
  // Remove the caret's paragraph only if still empty (inline pastes land INSIDE
  // it). Looser than isEmptyParagraph on purpose: a bare <p></p> is unclickable
  // dead weight against the character limit.
  if (
    emptyPasteParagraph &&
    emptyPasteParagraph.parentNode &&
    hasBlankText(emptyPasteParagraph) &&
    !emptyPasteParagraph.querySelector("img, table, ul, ol")
  ) {
    emptyPasteParagraph.parentNode.removeChild(emptyPasteParagraph);
  }

  // Remove only NEW trailing empties; pre-existing blanks are intentional. The
  // identity check against the pre-paste snapshot relies on insertNode not
  // cloning those nodes (browser tests guard this assumption).
  while (editor && editor.lastElementChild) {
    var lastChild = editor.lastElementChild;
    if (!isEmptyParagraph(lastChild) || existingTrailingEmptyParagraphs.indexOf(lastChild) !== -1) {
      break;
    }
    lastChild.parentNode.removeChild(lastChild);
  }
}

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
  // Modern pages emit <s> for strikethrough (<strike> is the legacy form)
  "s",
  "ins",
  "del",
  "sup",
  "sub",
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
const ALLOWED_ATTRIBUTES = ["src", "style", "color", "href", "target", "colspan", "rowspan"];
const ALLOWED_STYLE_ATTRIBUTES = [
  "font-size",
  "background-color",
  "text-align",
  "margin-left",
  "width",
  "height",
  "float",
];
// Tags whose entire contents must be stripped (not just the tags themselves).
// Otherwise the tag-strip pass leaves inner text like `alert('xss')` behind.
const DANGEROUS_TAGS_WITH_CONTENT = ["script", "style", "iframe", "object", "embed", "noscript"];
// Matched pair with contents, and lone opening/self-closing forms of those tags
const DANGEROUS_TAGS_PATTERN = new RegExp(
  "<(" + DANGEROUS_TAGS_WITH_CONTENT.join("|") + ")\\b[^>]*>[\\s\\S]*?<\\/\\1\\s*>",
  "gi"
);
const DANGEROUS_TAGS_SELF_CLOSING_PATTERN = new RegExp(
  "<(" + DANGEROUS_TAGS_WITH_CONTENT.join("|") + ")\\b[^>]*\\/?>",
  "gi"
);
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
const CLIENT_API_FRIENDLY_NAME = "ImageStorageClientApi";

window.allParameters;
window.hasFocus = false;
window.currentDisplayParameters = returnDisplayParams();
window.currentValidations = [];
window.lastSaveOutValue = "";
window.allowImages = false;
window.connectedSystem;
window.uploadedImages = [];

/**
 * Initializes summernote editor and handles all new values passed from Appian SAIL to the component
 */
Appian.Component.onNewValue(function (allParameters) {
  window.allParameters = allParameters;
  window.connectedSystem = allParameters.imageStorageConnectedSystem;
  window.allowImages = allParameters.allowImages;
  /* If images are allowed, then update ALLOWED_TAGS to include <img> tags */
  if (window.allowImages) {
    ALLOWED_TAGS.push("img");
  }
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

  /* Set aria-describedby (dynamic, must be updated on each new value) */
  if (typeof Appian.Component.getAriaDescribedBy === "function") {
    var noteEditableEl = document.querySelector(".note-editable");
    if (noteEditableEl) {
      noteEditableEl.setAttribute("aria-describedby", Appian.Component.getAriaDescribedBy());
    }
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
      window.allParameters.height === "auto" ? "auto" : parseInt(window.allParameters.height) - 72;

    // Code for the insertable items button
    var insertableItemsFiltered = [];
    if (window.allParameters.insertableItems) {
      insertableItemsFiltered = window.allParameters.insertableItems.filter(function (i) {
        return i.label && i.value;
      });
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
                  if (selectedItem === cleanHtml(i.label, true)) {
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
      ["group2", ["bold", "italic", "underline", "strikethrough", "superscript", "subscript"]],
      ["group3", ["forecolor", "backcolor"]],
      ["group4", ["ol", "ul"]],
      ["group5", ["paragraph", "table"]],
      ["group6", ["link"]],
      ["group7", ["clear"]],
    ];
    if (window.allParameters.insertableItemsLabel.length > 0) {
      toolbar.splice(7, 0, ["insertableItems", ["insertableItems"]]);
    }
    /* Check to see if images are allowed. If so, then add images to summernote toolbar */
    if (window.allowImages) {
      toolbar.find((group) => group[0] === "group6")[1].push("picture");
    }

    summernote.summernote({
      lang: locale,
      placeholder: window.allParameters.placeholder,
      height: height,
      disableDragAndDrop: true,
      // The paste handler decides whether clipboard image FILES are content or
      // a redundant snapshot - Summernote inserting them too would double-paste
      allowClipboardImagePasting: false,
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
      fontSizes: ["10", "14", "16", "18", "32"],
      fontSize: 14,
      callbacks: {
        // Enable callback for image upload to support images in summernote
        onImageUpload: function (files) {
          // Image files reach this callback even with the toolbar button hidden
          // (e.g. pasting a screenshot), so allowImages must be enforced here too
          if (!window.allowImages) {
            return;
          }
          Array.from(files).forEach(function (file) {
            let reader = new FileReader();
            reader.onload = function (e) {
              let imgNode = document.createElement("img");
              imgNode.src = e.target.result;
              // Insert the image node into Summernote editor
              $("#summernote").summernote("insertNode", imgNode);
              if (isImageNewBase64(imgNode)) {
                imgNode.classList.add("loading");
                uploadBase64Img(imgNode).then(function (source) {
                  imgNode.setAttribute("src", source);
                  imgNode.classList.remove("loading");
                  // On-change does not update img-src after uploading to Appian server
                  // This will manually trigger the richText value in Appian to update once an image is converted
                  setAppianValue();
                });
              }
            };
            reader.readAsDataURL(file); // Process each file
          });
        },
      },
      // Overrides summernote's default to set links to http:// and instead do https://
      // Note: For some strange summernote reason, `onCreateLink` does NOT go into `callbacks` but `onImageUpload` does
      onCreateLink: function (originalLink) {
        // Optional: validate or modify the URL
        if (MAILTO_PATTERN.test(originalLink)) {
          return "mailto://" + originalLink;
        } else if (!URL_SCHEME_PATTERN.test(originalLink)) {
          return "https://" + originalLink;
        }
        return originalLink;
      },
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

    // Set the minHeight to an arbitrarily determined height 210px which is the maximum size of the Add Table dialog
    $(".note-editable").css("min-height", "210px");

    // Remove tabindex attribute of buttons so that a user can tab through them (accessibility)
    $("button").removeAttr("tabindex");

    /* Set aria-labelledby (static, only needs to be set once per build) */
    if (typeof Appian.Component.getAriaLabelledBy === "function") {
      var noteEditable = document.querySelector(".note-editable");
      if (noteEditable) {
        noteEditable.setAttribute("aria-labelledby", Appian.Component.getAriaLabelledBy());
      }
    }
  }
}

/** Returns true if the image is a NEW base64 image
 *  Checks that its source is base64 & it doesn't have the loading class
 *  This check returning true means it needs to go through the Connected System & get its source replaced
 */
function isImageNewBase64(image) {
  const base64ImgSrcRegex = /^data:/;
  return base64ImgSrcRegex.test(image.src) && !image.classList.contains("loading");
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

  var base64Str = imageSelector.getAttribute("src");
  if (typeof base64Str !== "string" || base64Str.length < 100) {
    return base64Str;
  }
  const payload = {
    base64: base64Str,
  };

  return Appian.Component.invokeClientApi(window.connectedSystem, CLIENT_API_FRIENDLY_NAME, payload)
    .then(handleClientApiResponseForBase64)
    .then(function (docURL) {
      return docURL;
    })
    .catch(handleError);
}

/**
 * Return only the display parameters into an object
 * @return {object} The display parameters as an object
 */
function returnDisplayParams() {
  var displayParams = {};
  for (var i = 0; i < DISPLAY_PARAMS.length; i++) {
    var param = DISPLAY_PARAMS[i];
    displayParams[param] = !window.allParameters ? "" : window.allParameters[param];
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
    outputUploadedImages();
    var newSaveOutValue = cleanHtml(getEditorContents());
    // Always save-out unless the new value we would be saving out matches the last value we saved out
    if (window.lastSaveOutValue !== newSaveOutValue && !doesBase64ImageExist()) {
      Appian.Component.saveValue("richText", newSaveOutValue);
      window.lastSaveOutValue = newSaveOutValue;
    }
  }
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

// Returns true if a base64 image exists in the contents
function doesBase64ImageExist() {
  const html = summernote.summernote("code");
  const base64ImgRegex = /\<img src="data:/;
  return base64ImgRegex.test(html);
}

function isTextPresent(text) {
  const html = summernote.summernote("code");
  return html.includes(text);
}

/**
 * Post-processes the readOnly DOM to make diff markup (ins/del) accessible.
 *
 * Uses visually-hidden text markers at the boundaries of added/removed blocks
 * so screen readers announce "Begin added text" / "End added text". This is
 * the only method with full support across all screen reader + browser
 * combinations (NVDA, JAWS, VoiceOver).
 *
 * Consecutive same-type blocks (not separated by unchanged or opposite-type
 * content) get a single begin/end pair around the entire run.
 *
 * Replaces <ins>/<del> with plain <span> to prevent VoiceOver double-reading
 * while avoiding invalid ARIA (role="img" on text content).
 *
 * Only affects the rendered DOM — the stored richText value is never modified.
 */
function makeInsDelAccessible() {
  var container = document.getElementById("summernote");
  if (!container) return;

  processAccessibleBlocks(container, "ins", "added");
  processAccessibleBlocks(container, "del", "removed");
}

/**
 * Finds all elements of the given tag name, groups consecutive ones,
 * wraps each group with visually-hidden begin/end markers, and replaces
 * the original elements with plain <span>s (no ARIA attributes).
 */
function processAccessibleBlocks(container, tagName, type) {
  var elements = Array.from(container.querySelectorAll(tagName));
  if (elements.length === 0) return;

  // Group consecutive same-type elements together
  var groups = [];
  var currentGroup = [elements[0]];

  for (var i = 1; i < elements.length; i++) {
    if (areConsecutive(elements[i - 1], elements[i])) {
      currentGroup.push(elements[i]);
    } else {
      groups.push(currentGroup);
      currentGroup = [elements[i]];
    }
  }
  groups.push(currentGroup);

  // Process each group: add markers and replace elements
  groups.forEach(function (group) {
    var first = group[0];
    var last = group[group.length - 1];

    // Insert "Begin <type> text" before the first element
    var beginKey = type === "added" ? "beginAdded" : "beginRemoved";
    var beginMarker = createVisuallyHiddenSpan(getTranslation(beginKey));
    first.parentNode.insertBefore(beginMarker, first);

    // Insert "End <type> text" after the last element
    var endKey = type === "added" ? "endAdded" : "endRemoved";
    var endMarker = createVisuallyHiddenSpan(getTranslation(endKey));
    if (last.nextSibling) {
      last.parentNode.insertBefore(endMarker, last.nextSibling);
    } else {
      last.parentNode.appendChild(endMarker);
    }

    // Replace each <ins>/<del> with a plain <span> preserving style and content
    group.forEach(function (el) {
      var span = document.createElement("span");
      if (el.getAttribute("style")) {
        span.setAttribute("style", el.getAttribute("style"));
      }
      span.innerHTML = el.innerHTML;
      el.replaceWith(span);
    });
  });
}

/**
 * Two elements are consecutive if only whitespace or empty nodes separate them.
 * If meaningful text or another element type sits between them, they are separate groups.
 */
function areConsecutive(prev, curr) {
  var node = prev.nextSibling;
  while (node && node !== curr) {
    if (node.nodeType === Node.ELEMENT_NODE) {
      return false;
    }
    if (node.nodeType === Node.TEXT_NODE && node.textContent.trim() !== "") {
      return false;
    }
    node = node.nextSibling;
  }
  return node === curr;
}

/**
 * Creates a <span> with visually-hidden text for screen reader announcements.
 */
function createVisuallyHiddenSpan(text) {
  var span = document.createElement("span");
  span.className = "visually-hidden";
  span.textContent = text;
  return span;
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
    // Post-process for accessibility: inject visually-hidden markers around diff blocks
    // and replace <ins>/<del> with plain <span>s to prevent VoiceOver double-reading
    makeInsDelAccessible();
  } else {
    // Otherwise, only update the contents if they've actually changed to avoid triggering the onChange event
    if (
      window.allParameters.richText !== window.lastSaveOutValue &&
      window.allParameters.richText !== getEditorContents()
    ) {
      // Only update the contents if the user isn't currently editing the field (doesn't have focus)
      if (isSummernoteActive()) {
        console.warn("Not updating contents because summernote is active");
      } else {
        summernote.summernote("code", cleanHtml(window.allParameters.richText));
      }
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
  cssStyles.push("table, td, th, tr {border-width: " + tableBorderWidth + " !important}");

  // set styles
  styleEl.innerHTML = cssStyles.join("\n");
}

/**
 * Updates to CSS for A11y compliance
 */
function setA11yCss() {
  // set aria-hidden to false for the close buttons
  var close_buttons = document.getElementsByClassName("btn-close");
  for (var j = 0; j < close_buttons.length; j++) {
    close_buttons[j].setAttribute("aria-hidden", "false");
  }
  // set aria-expanded to false for buttons that will expand
  var dropdowns = document.querySelectorAll('[data-bs-toggle="dropdown"]');
  for (var k = 0; k < dropdowns.length; k++) {
    dropdowns[k].setAttribute("aria-expanded", "false");
  }
  // set aria-label to "formatting options" for toolbars
  var toolbars = document.querySelectorAll('[role="toolbar"]');
  for (var m = 0; m < toolbars.length; m++) {
    toolbars[m].setAttribute("aria-label", "formatting options");
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
  if (window.allowImages) {
    if (!window.connectedSystem) {
      newValidations.push(getTranslation("validationImageStorageConnectedSystemEmpty"));
    }
  }
  // Measure size as it would be SAVED: an uploading image is a huge base64 data
  // URI that is never saved out, and counting it flashed the maxSize error during
  // every upload. getEditorContents throws in readOnly mode - keep it guarded.
  if (!isReadOnly()) {
    var effectiveContents = getEditorContents().replace(
      /src=(?:"data:[^"]*"|'data:[^']*')/gi,
      'src=""'
    );
    if (effectiveContents.length > maxSize) {
      newValidations.push(getTranslation("validationContentTooBig"));
    }
  }
  if (forceUpdate || newValidations.toString() !== window.currentValidations.toString()) {
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

  // Step 0: Strip dangerous tags AND their contents - the Step 2 tag strip
  // removes only the tags, leaving <script>alert(1)</script> behind as "alert(1)".
  out = out.replace(DANGEROUS_TAGS_PATTERN, "");
  out = out.replace(DANGEROUS_TAGS_SELF_CLOSING_PATTERN, "");

  // Step 1: Convert to HTML
  var isContentHtml = out.charAt(0) === "<";
  // NOTE: Partial most likely means "paste event" (though can also be inserted items and other things)
  if (isPartialHtml && isContentHtml) {
    // Paste event of HTML (likely an external editor like Word): CR/LF here is
    // source formatting, not line breaks - real breaks are tags (<br>, <p>).
    // EXCEPT inside <pre>, where newlines ARE the breaks: convert those to <br>
    // and wrap in <p> (<pre> is not an allowed tag, and a bare text+<br> run at
    // the top level derails insertNode).
    out = out
      .replace(/<pre\b[^>]*>[\s\S]*?<\/pre\s*>/gi, function (preBlock) {
        return "<p>" + preBlock.replace(/\r\n|\r|\n/g, "<br>") + "</p>";
      })
      .replace(/\r\n|\r|\n/g, " ")
      // Remove Word-specific classes
      .replace(/\sclass=["']?MsoNormal["']?/gi, "");
  } else if (isPartialHtml && !isContentHtml) {
    // Paste event of raw-text:
    // Just replace new-lines with <br>
    out = out.replace(/\r?\n/g, "<br>");
  } else if (!isPartialHtml && isContentHtml) {
    // Full clean of HTML:
    // Just remove new-lines
    out = out.replace(/\r?\n/g, "");
  } else if (!isPartialHtml && !isContentHtml) {
    // Full clean of raw-text:
    // Replace new-lines with <br> and wrap in one outer shell of <p>
    out = "<p>" + out.replace(/\r?\n/g, "<br>") + "</p>";
  } else {
    // empty block for clarity above in the "match" statement
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
      // Step 3: Attribute allowlist. Matches double-, single- and unquoted
      // values (Word emits unquoted attributes: border=1 cellspacing=0).
      return $0.replace(/([\w-]+)=(?:"[^"]*"|'[^']*'|[^\s>]+)/g, function ($0, $1) {
        if (ALLOWED_ATTRIBUTES.indexOf($1) > -1) {
          if ($1 === "style") {
            // Step 4: Remove all unnecessary HTML style attributes
            // Test this Regex here: https://regexr.com/64gqb
            return $0.replace(
              /([\w-]+): ?(?:[^;]|&quot;)*?;? ?(?=[^;]*:|["'])/g,
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

  // Step 5: Replace empty spans (introduce by paste event) with a space.
  out = out.replace(/<span[^>]*>\s*<\/span>/gi, " ");

  // Step 6: Strip non-external links
  // Any hyperlink that isn't to an external URL or file URL or mailto URL will not work as expected anyways, so this will strip those hyperlinks
  // Test this Regex here: https://regexr.com/64iom
  out = out.replace(/<a.*?href="(.*?)">(.*?)<\/a>/g, function ($0, $1, $2) {
    // Test this Regex here: https://regexr.com/6blub
    return $1.match(/^(?:[A-Za-z0-9+\-.]+:)?(?:https:\/\/|file:(?:\/\/|\\\\)|mailto:).*$/g)
      ? $0
      : $2;
  });

  // Step 6.5 (paste-time only): drop images whose src cannot load (Word's
  // file:///clip_image refs, cid:), keeping http(s)/data:. Scoped to isPartialHtml
  // so stored content (relative doc URLs) is never altered on render/save.
  if (isPartialHtml) {
    out = out.replace(/<img\b[^>]*>/gi, function ($0) {
      return /\ssrc=["']?(?:https?:|data:)/i.test($0) ? $0 : "";
    });
  }

  // Step 7: Remove any HTML comments (multi-line safe)
  out = out.replace(/<!--[\s\S]*?-->/g, "");

  // Step 8: Trim extra spaces
  out = out.trim().replace(/ +/g, " ");

  // Step 9: Repair orphan table rows (Word paste)
  if (/<tr[\s>]/i.test(out) && !/<table[\s>]/i.test(out)) {
    out = "<table>" + out + "</table>";
  }

  return out;
}

/**
 * Cleans an HTML string by removing default styles injected by Summernote and
 * stripping out empty or redundant tags.
 * @param {string} html - The HTML string to clean.
 * @return {string} The cleaned HTML string.
 */
function stripSummernoteDefaults(html) {
  if (!html) {
    return "";
  }

  var out = html;

  // 1. Clean all style attributes
  out = out.replace(/style="([^"]*)"/g, function (match, styleContent) {
    var cleaned = styleContent
      .replace(/background-color:\s*rgb\(\s*255\s*,\s*255\s*,\s*255\s*\)\s*;?\s*/gi, "")
      .replace(/font-size:\s*14px\s*;?\s*/gi, "")
      .replace(/text-align:\s*start\s*;?\s*/gi, "")
      .replace(/float:\s*none\s*;?\s*/gi, "")
      .replace(/;\s*;+/g, ";")
      .replace(/^\s*;+\s*/, "")
      .replace(/\s*;+\s*$/, "")
      .trim();

    return cleaned ? 'style="' + cleaned + '"' : "";
  });

  // 2. Remove empty style attributes
  out = out.replace(/\s*style=""\s*/g, "");

  // 3. Clean up whitespace issues
  out = out.replace(/\s+>/g, ">");
  out = out.replace(/\s{2,}/g, " ");

  // 4. Remove empty spans and unwrap attribute-less spans
  var before;
  do {
    before = out;
    out = out.replace(/<span[^>]*>\s*<\/span>/g, "");
    out = out.replace(/<span\s*>([\s\S]*?)<\/span>/g, "$1");
  } while (before !== out);

  // Final cleanup
  out = out.replace(/\s+>/g, ">");

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

// eslint-disable-next-line no-unused-vars
function handleImagePasteFromFile(e) {
  var clipboardData = e.originalEvent.clipboardData;
  var items = clipboardData.items;
  var IMAGE_MIME_REGEX = /^image\/(p?jpeg|gif|png)$/i;

  // Loop through clipboard items and check for image types
  for (var i = 0; i < items.length; i++) {
    if (IMAGE_MIME_REGEX.test(items[i].type)) {
      var file = items[i].getAsFile();
      var reader = new FileReader();
      reader.onload = function (event) {
        var img = $("<img>").attr("src", event.target.result);
        var imgNode = img[0];
        // Insert the image node into Summernote editor
        $("#summernote").summernote("insertNode", imgNode);
        if (isImageNewBase64(imgNode)) {
          imgNode.classList.add("loading");
          uploadBase64Img(imgNode).then(function (source) {
            imgNode.setAttribute("src", source);
            imgNode.classList.remove("loading");
            /*On-change does not update img-src after uploading to Appian server
             *This will manually trigger the richText value in Appian to update once an image is converted
             */
            setAppianValue();
          });
        }
      };
      reader.readAsDataURL(file);
    }
  }
}

// Returns true if the user has focus on summernote
function isSummernoteActive() {
  return document.activeElement.className.startsWith("note-editable");
}

/**
 * Returns true if the user agent/browser is Internet Explorer
 * @return {boolean} True if Internet Explorer
 */
function isInternetExplorer() {
  var ua = window.navigator.userAgent;
  var msie = ua.indexOf("MSIE ");
  msie = msie > 0 || !!navigator.userAgent.match(/Trident.*rv\:11\./);
  return msie;
}

/**
 * Debounce utility https://codeburst.io/throttling-and-debouncing-in-javascript-b01cad5c8edf
 * @param {function} func - Function to run on a delay
 * @param {integer} delay - MS to delay re-execution of the function
 */
// eslint-disable-next-line no-unused-vars
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
