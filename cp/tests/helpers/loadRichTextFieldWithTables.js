/**
 * Test helper: loads richTextFieldWithTables/v1/index.js via require()
 * so Jest instruments it for coverage.
 *
 * Sets up all required browser globals (Appian, $, summernote, translations)
 * before requiring the source file. After require(), all function declarations
 * from the source are available on `global` because Jest wraps scripts in a
 * function scope — but we can access them via the module's local scope.
 *
 * Strategy: We set up globals, then require() the source. Since the source
 * uses function declarations (hoisted), they exist in the module scope.
 * We then use a small eval trick to extract them.
 *
 * Actually, the cleanest approach: modify jest config to treat these as
 * scripts, OR, just set up globals and require the file — Jest's module
 * wrapper means function declarations are module-scoped, not global.
 * So we need to extract them.
 *
 * Final approach: We'll read the source, append module.exports, and
 * require a generated temp file. But that's fragile.
 *
 * ACTUAL final approach: Set up globals, then use require() on the source.
 * Jest wraps it in (function(module, exports, require, ...) { <source> }).
 * Function declarations are scoped to that wrapper. We can't access them.
 *
 * THE REAL SOLUTION: Add a jest transform that appends exports to the source.
 */

// This module is used by the custom jest transform. See jest.config.js.
// It just provides the mock setup function.

function setupGlobals() {
  // Mock summernote jQuery object
  const mockSummernote = {
    summernote: jest.fn(function (cmd) {
      if (cmd === "isEmpty") return true;
      if (cmd === "code") return "";
      if (cmd === "destroy") return;
      return mockSummernote;
    }),
    on: jest.fn(),
  };

  const jQueryMock = jest.fn(function (selector) {
    if (selector === "#summernote") return mockSummernote;
    const chainable = {
      hide: jest.fn().mockReturnThis(),
      show: jest.fn().mockReturnThis(),
      css: jest.fn().mockReturnThis(),
      removeAttr: jest.fn().mockReturnThis(),
      find: jest.fn().mockReturnValue({ on: jest.fn() }),
      on: jest.fn().mockReturnThis(),
      html: jest.fn().mockReturnValue(""),
      attr: jest.fn().mockReturnThis(),
      summernote: mockSummernote.summernote,
    };
    chainable[0] = document.createElement("div");
    chainable.length = 1;
    return chainable;
  });
  jQueryMock.summernote = {
    ui: {
      buttonGroup: jest.fn(() => ({ render: jest.fn() })),
      button: jest.fn(),
      dropdown: jest.fn(),
    },
  };

  global.$ = jQueryMock;
  global.english_translations = {
    textHeaderLarge: "Large Header",
    textHeaderMedium: "Medium Header",
    textHeaderSmall: "Small Header",
    textNormal: "Normal Text",
    validationImageStorageConnectedSystemEmpty:
      "The image storage connected system parameter is empty.",
    validationContentTooBig: "Content exceeds maximum allowed size",
    validationConnectedSystemResponse: "Response from connected system:",
    validationDocURLFailure:
      "Unable to obtain the doc URL from the connected system",
    default: "Default",
  };
  global.french_translations = {
    textHeaderLarge: "Grand en-tête",
    textHeaderMedium: "Moyen en-tête",
    textHeaderSmall: "Petit en-tête",
    textNormal: "Texte normal",
    validationImageStorageConnectedSystemEmpty:
      "Le paramètre du système connecté pour le stockage des images n'est pas renseigné.",
    validationContentTooBig: "Ce contenu dépasse la taille maximum autorisée",
    validationConnectedSystemResponse: "Réponse du système connecté :",
    validationDocURLFailure:
      "Impossible d'obtenir l'URL du document à partir du système connecté",
    default: "Réglage par défaut",
  };
  global.Appian = {
    getLocale: jest.fn(() => "en-US"),
    getAccentColor: jest.fn(() => "#1a73e8"),
    Component: {
      onNewValue: jest.fn(),
      saveValue: jest.fn(),
      setValidations: jest.fn(),
      invokeClientApi: jest.fn(() => Promise.resolve({ payload: {} })),
    },
  };

  // DOM element
  if (!document.getElementById("summernote")) {
    const div = document.createElement("div");
    div.id = "summernote";
    document.body.appendChild(div);
  }

  return { mockSummernote, jQueryMock };
}

module.exports = { setupGlobals };
