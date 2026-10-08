/**
 * Handler-level tests for plain-text paste line-break handling.
 *
 * Pasting multi-line plain text (clipboard with only text/plain, e.g. from
 * Notepad or a terminal) must preserve line breaks as <br>. Requiring index.js
 * registers the real summernote.paste handler on the mocked summernote object;
 * these tests retrieve that handler and invoke it with fake clipboard events.
 */

require("../../richTextFieldWithTables/v1/index.js");

function getPasteHandler() {
  const mockSummernote = global.$("#summernote");
  const call = mockSummernote.on.mock.calls.find((c) => c[0] === "summernote.paste");
  expect(call).toBeDefined();
  return call[1];
}

function makePasteEvent({ html = "", text = "", files = [] }) {
  return {
    preventDefault: jest.fn(),
    originalEvent: {
      clipboardData: {
        files: files,
        getData: (type) => {
          if (type === "text/html") return html;
          if (type === "text/plain") return text;
          return "";
        },
      },
    },
  };
}

/** Collect the nodes the handler inserted via summernote("insertNode", node). */
function getInsertedNodes() {
  return global
    .$("#summernote")
    .summernote.mock.calls.filter((c) => c[0] === "insertNode")
    .map((c) => c[1]);
}

describe("plain-text paste line breaks", () => {
  beforeEach(() => {
    global.$("#summernote").summernote.mockClear();
  });

  // Plain text must be inserted as ONE <p> block: inserting a bare text/<br>
  // sequence node-by-node makes Summernote's insertNode misplace the caret,
  // fusing lines and dropping content after the first break (caught by the
  // browser-level e2e suite; jsdom mocks can't reproduce the caret behavior).
  test("multi-line plain text is inserted as a single <p> with <br> between lines", () => {
    const handler = getPasteHandler();
    handler({}, makePasteEvent({ text: "line one\nline two\nline three" }));

    const nodes = getInsertedNodes();
    expect(nodes.length).toBe(1);
    expect(nodes[0].nodeName).toBe("P");
    expect(nodes[0].querySelectorAll("br").length).toBe(2);

    const text = nodes[0].textContent;
    expect(text).toContain("line one");
    expect(text).toContain("line two");
    expect(text).toContain("line three");
  });

  test("Windows CRLF plain text also converts to <br>", () => {
    const handler = getPasteHandler();
    handler({}, makePasteEvent({ text: "first\r\nsecond" }));

    const nodes = getInsertedNodes();
    expect(nodes.length).toBe(1);
    expect(nodes[0].querySelectorAll("br").length).toBe(1);
  });

  test("single-line plain text inserts inline (no <p> wrapper, no <br>)", () => {
    // A word/phrase pasted at a cursor inside a paragraph must insert inline;
    // wrapping it in <p> would split the destination paragraph in two.
    const handler = getPasteHandler();
    handler({}, makePasteEvent({ text: "just one line" }));

    const nodes = getInsertedNodes();
    expect(nodes.length).toBe(1);
    expect(nodes[0].nodeType).toBe(3); // text node
    expect(nodes[0].textContent).toContain("just one line");
  });

  test("whitespace-only text nodes between block elements are not inserted", () => {
    // Newlines between blocks in clipboard HTML are source formatting; inserting
    // them as text nodes misplaces Summernote's caret and drops later blocks.
    const handler = getPasteHandler();
    handler(
      {},
      makePasteEvent({ html: "<div>\n<h2>title</h2>\n<p>para one</p>\n<p>para two</p>\n</div>" })
    );

    const nodes = getInsertedNodes();
    const names = nodes.map((n) => n.nodeName);
    expect(names).toEqual(["H2", "P", "P"]);
  });

  test("whitespace between a block and an inline element is preserved", () => {
    const handler = getPasteHandler();
    handler({}, makePasteEvent({ html: "<p>para</p> <span>after</span>" }));
    const nodes = getInsertedNodes();
    const combined = nodes.map((n) => n.textContent).join("");
    // The space between </p> and <span> must not vanish: the bare span gets
    // unwrapped by stripSummernoteDefaults, leaving a " after" text node
    expect(combined).toBe("para after");
  });

  test("image file alongside html WITH text (Outlook copy): the text is still inserted", () => {
    // Outlook puts an image file on the clipboard alongside html containing the
    // copied text. Bailing out for the file would silently drop the text; the
    // html must proceed (the image itself arrives once via onImageUpload).
    const handler = getPasteHandler();
    handler(
      {},
      makePasteEvent({
        html: '<p>email body text</p><img src="cid:image001.png@01D9ABCD">',
        files: [{ name: "image001.png", type: "image/png" }],
      })
    );
    const nodes = getInsertedNodes();
    expect(nodes.map((n) => n.textContent).join("")).toContain("email body text");
    // The cid: reference is unloadable and stripped; the real image comes from
    // the file via onImageUpload, so the html path must not insert an <img>
    const insertedHtml = nodes
      .map((n) => (n.outerHTML !== undefined ? n.outerHTML : n.textContent))
      .join("");
    expect(insertedHtml).not.toContain("<img");
  });

  test("pre block content keeps its line breaks (code copied from a web page)", () => {
    const handler = getPasteHandler();
    handler(
      {},
      makePasteEvent({ html: "<pre>const a = 1;\nconst b = 2;\nconst c = a + b;</pre>" })
    );
    const nodes = getInsertedNodes();
    const html = nodes
      .map((n) => (n.outerHTML !== undefined ? n.outerHTML : n.textContent))
      .join("");
    expect(html).toContain("const a = 1;");
    expect(html).toContain("const c = a + b;");
    expect((html.match(/<br/g) || []).length).toBeGreaterThanOrEqual(2);
  });

  test("base64 image inside pasted HTML is uploaded and its src swapped for the doc URL", async () => {
    // Modern Word embeds images as data: URIs in clipboard HTML. onImageUpload
    // never fires for markup (files only), and setAppianValue refuses to save
    // while base64 exists - so without the post-paste upload scan these pastes
    // silently never saved.
    const editor = document.createElement("div");
    editor.className = "note-editable";
    const bigDataUri = "data:image/png;base64," + "A".repeat(200);
    editor.innerHTML = '<p>text</p><img src="' + bigDataUri + '">';
    document.body.appendChild(editor);
    window.connectedSystem = "mock-connected-system";
    window.uploadedImages = [];
    window.currentValidations = [];
    // setAppianValue runs after the upload and needs the component globals
    window.allParameters = window.allParameters || { readOnly: false, maxSize: 10000 };
    global.Appian.Component.invokeClientApi.mockResolvedValueOnce({
      payload: { docID: 7, docURL: "https://appian.example/doc/7" },
    });

    try {
      const handler = getPasteHandler();
      handler({}, makePasteEvent({ html: "<p>unrelated</p>" }));

      const img = editor.querySelector("img");
      expect(img.classList.contains("loading")).toBe(true);
      // Flush the upload promise chain
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(global.Appian.Component.invokeClientApi).toHaveBeenCalledTimes(1);
      expect(img.getAttribute("src")).toBe("https://appian.example/doc/7");
      expect(img.classList.contains("loading")).toBe(false);
    } finally {
      document.body.removeChild(editor);
      window.connectedSystem = undefined;
    }
  });

  function getImageCallbackCalls() {
    return global
      .$("#summernote")
      .summernote.mock.calls.filter((c) => c[0] === "insertImagesOrCallback");
  }

  test("image file with snapshot-duplicate html (loadable embedded image): file ignored", () => {
    // Some apps embed the image in the html AND attach it as a file - inserting
    // both would double-paste the image
    const handler = getPasteHandler();
    handler(
      {},
      makePasteEvent({
        html: '<p>caption</p><img src="data:image/png;base64,AAAA">',
        files: [{ name: "img.png", type: "image/png" }],
      })
    );
    expect(getImageCallbackCalls().length).toBe(0);
    const nodes = getInsertedNodes();
    expect(nodes.map((n) => n.textContent).join("")).toContain("caption");
  });

  test("image file with Excel-style table html (bitmap snapshot): file ignored, table pastes", () => {
    const handler = getPasteHandler();
    handler(
      {},
      makePasteEvent({
        html: "<table><tbody><tr><td>A1</td><td>B1</td></tr></tbody></table>",
        files: [{ name: "snapshot.png", type: "image/png" }],
      })
    );
    expect(getImageCallbackCalls().length).toBe(0);
    expect(getInsertedNodes().some((n) => n.nodeName === "TABLE")).toBe(true);
  });

  test("image file with text and an UNLOADABLE image ref (Outlook cid:): file inserted", () => {
    const handler = getPasteHandler();
    handler(
      {},
      makePasteEvent({
        html: '<p>email text</p><img src="cid:image001.png@01D9">',
        files: [{ name: "image001.png", type: "image/png" }],
      })
    );
    expect(getImageCallbackCalls().length).toBe(1);
    expect(
      getInsertedNodes()
        .map((n) => n.textContent)
        .join("")
    ).toContain("email text");
  });

  test("clipboard carrying an image FILE inserts nothing (Summernote's onImageUpload path owns it)", () => {
    // Right-click -> Copy image on a web page puts BOTH an <img> html flavor AND
    // an image file on the clipboard. Summernote's own pasteByEvent inserts the
    // file via onImageUpload, so the handler must bail out or the image lands twice.
    const handler = getPasteHandler();
    handler(
      {},
      makePasteEvent({
        html: '<img src="https://x.example/pic.png">',
        files: [{ name: "pic.png", type: "image/png" }],
      })
    );
    expect(getInsertedNodes().length).toBe(0);
  });

  test("paste containing an https image inserts the surrounding content (no whole-paste drop)", () => {
    const handler = getPasteHandler();
    handler(
      {},
      makePasteEvent({ html: '<p>important text</p><img src="https://x.example/pic.png">' })
    );
    const nodes = getInsertedNodes();
    expect(nodes.length).toBeGreaterThan(0);
    expect(nodes.map((n) => n.textContent).join("")).toContain("important text");
  });

  test("whitespace between inline nodes is preserved", () => {
    const handler = getPasteHandler();
    handler({}, makePasteEvent({ html: "<b>alpha</b> <i>beta</i>" }));

    const nodes = getInsertedNodes();
    const combined = nodes.map((n) => n.textContent).join("");
    expect(combined).toBe("alpha beta");
  });

  test("HTML clipboard content is unaffected: source newlines do not become <br>", () => {
    const handler = getPasteHandler();
    handler({}, makePasteEvent({ html: "<p>alpha</p>\n<p>beta</p>\n" }));

    const nodes = getInsertedNodes();
    // Two paragraphs, and the formatting newlines between them add no <br>
    expect(nodes.filter((n) => n.nodeName === "BR").length).toBe(0);
    expect(nodes.filter((n) => n.nodeName === "P").length).toBe(2);
  });
});
