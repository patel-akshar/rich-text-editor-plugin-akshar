/**
 * Jest setup file: establishes browser globals needed by the source files.
 * Runs before each test suite.
 */

// ── Summernote / jQuery mocks ────────────────────────────────────────

const mockSummernote = {
  summernote: jest.fn(function (cmd, value) {
    if (cmd === "isEmpty") return true;
    if (cmd === "code" && value === undefined) return "";
    if (cmd === "destroy") return;
    return mockSummernote;
  }),
  on: jest.fn(),
};

const jQueryMock = jest.fn(function (selector) {
  if (selector === "#summernote") return mockSummernote;
  if (typeof selector === "string" && selector.startsWith("<")) {
    // Creating elements like $("<img>")
    const tag = selector.replace(/[<>]/g, "");
    const el = document.createElement(tag);
    const wrapper = {
      attr: jest.fn(function () {
        return wrapper;
      }),
      0: el,
      length: 1,
    };
    return wrapper;
  }
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
global.__mockSummernote = mockSummernote;

// ── Quill mock ───────────────────────────────────────────────────────

const quillRoot = document.createElement("div");
const mockQuillInstance = {
  on: jest.fn(),
  root: quillRoot,
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
  const MockBlot = function () {};
  MockBlot.tagName = "p";
  MockBlot.PROTOCOL_WHITELIST = ["http", "https"];
  return MockBlot;
});
MockQuill.register = jest.fn();
MockQuill.sources = { USER: "user" };

global.Quill = MockQuill;
global.__mockQuillInstance = mockQuillInstance;

// ── Translation globals ──────────────────────────────────────────────

global.english_translations = {
  tooltipStyle: "Style",
  textHeaderLarge: "Large Header",
  textHeaderMedium: "Medium Header",
  textHeaderSmall: "Small Header",
  textNormal: "Normal Text",
  tooltipSize: "Size",
  sizeSmall: "Small",
  sizeStandard: "Standard",
  sizeMedium: "Medium",
  sizeLarge: "Large",
  tooltipBold: "Bold (%+B)",
  tooltipItalics: "Italics (%+I)",
  tooltipUnderline: "Underline (%+U)",
  tooltipStrikethrough: "Strikethrough",
  tooltipSuperscript: "Superscript",
  tooltipSubscript: "Subscript",
  tooltipFontColor: "Font Color",
  tooltipBackgroundColor: "Background Color",
  tooltipAddLink: "Add Link (%+K)",
  tooltipAddImage: "Add Image",
  tooltipAlignment: "Alignment",
  tooltipUnindent: "Unindent (%+[)",
  tooltipIndent: "Indent (%+])",
  tooltipNumberedList: "Numbered List (%+Shift+7)",
  tooltipBulletedList: "Bulleted List (%+Shift+8)",
  tooltipRemoveFormatting: "Remove Formatting",
  usageBarUsed: "used",
  validationImageStorageConnectedSystemEmpty:
    "The image storage connected system parameter is empty.",
  validationContentTooBig: "Content exceeds maximum allowed size",
  validationConnectedSystemResponse: "Response from connected system:",
  validationDocURLFailure: "Unable to obtain the doc URL from the connected system",
  default: "Default",
  beginAdded: "Begin added text",
  endAdded: "End added text",
  beginRemoved: "Begin removed text",
  endRemoved: "End removed text",
};

global.french_translations = {
  tooltipStyle: "Style",
  textHeaderLarge: "Grand en-tête",
  textHeaderMedium: "Moyen en-tête",
  textHeaderSmall: "Petit en-tête",
  textNormal: "Texte normal",
  tooltipSize: "Taille de police",
  sizeSmall: "Petite",
  sizeStandard: "Standard",
  sizeMedium: "Moyenne",
  sizeLarge: "Grande",
  tooltipBold: "Gras (%+B)",
  tooltipItalics: "Italique (%+I)",
  tooltipUnderline: "Souligné (%+U)",
  tooltipStrikethrough: "Barré",
  tooltipSuperscript: "Exposant",
  tooltipSubscript: "Indice",
  tooltipFontColor: "Couleur du texte",
  tooltipBackgroundColor: "Couleur d'arrière-plan",
  tooltipAddLink: "Ajouter un lien hypertexte (%+K)",
  tooltipAddImage: "Ajouter une image",
  tooltipAlignment: "Alignement",
  tooltipUnindent: "Diminuer le retrait (%+[)",
  tooltipIndent: "Augmenter le retrait (%+])",
  tooltipNumberedList: "Numérotation (%+Shift+7)",
  tooltipBulletedList: "Liste à puces (%+Shift+8)",
  tooltipRemoveFormatting: "Retirer le formatage",
  usageBarUsed: "utilisé",
  validationImageStorageConnectedSystemEmpty:
    "Le paramètre du système connecté pour le stockage des images n'est pas renseigné.",
  validationContentTooBig: "Ce contenu dépasse la taille maximum autorisée",
  validationConnectedSystemResponse: "Réponse du système connecté :",
  validationDocURLFailure: "Impossible d'obtenir l'URL du document à partir du système connecté",
  default: "Réglage par défaut",
  beginAdded: "Début du texte ajouté",
  endAdded: "Fin du texte ajouté",
  beginRemoved: "Début du texte supprimé",
  endRemoved: "Fin du texte supprimé",
};

// ── Appian SDK mock ──────────────────────────────────────────────────

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

// ── DOM elements needed by richTextField ─────────────────────────────

function ensureElement(id, parent) {
  if (!document.getElementById(id)) {
    const el = document.createElement("div");
    el.id = id;
    (parent || document.body).appendChild(el);
    return el;
  }
  return document.getElementById(id);
}

const parentContainer = ensureElement("parent-container");
const quillToolbar = ensureElement("quill-toolbar", parentContainer);
const quillContainer = ensureElement("quill-container", parentContainer);
const sizeBar = ensureElement("sizeBar", parentContainer);
ensureElement("usageBar", sizeBar);
ensureElement("usageMessage", sizeBar);

// ── DOM element needed by richTextFieldWithTables ────────────────────

ensureElement("summernote");
