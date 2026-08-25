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

function makePasteEvent({ html = "", text = "" }) {
  return {
    preventDefault: jest.fn(),
    originalEvent: {
      clipboardData: {
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

  test("multi-line plain text is inserted with <br> between lines", () => {
    const handler = getPasteHandler();
    handler({}, makePasteEvent({ text: "line one\nline two\nline three" }));

    const nodes = getInsertedNodes();
    const brCount = nodes.filter((n) => n.nodeName === "BR").length;
    expect(brCount).toBe(2);

    const combinedText = nodes.map((n) => n.textContent).join("");
    expect(combinedText).toContain("line one");
    expect(combinedText).toContain("line two");
    expect(combinedText).toContain("line three");
  });

  test("Windows CRLF plain text also converts to <br>", () => {
    const handler = getPasteHandler();
    handler({}, makePasteEvent({ text: "first\r\nsecond" }));

    const nodes = getInsertedNodes();
    expect(nodes.filter((n) => n.nodeName === "BR").length).toBe(1);
  });

  test("single-line plain text inserts no <br>", () => {
    const handler = getPasteHandler();
    handler({}, makePasteEvent({ text: "just one line" }));

    const nodes = getInsertedNodes();
    expect(nodes.filter((n) => n.nodeName === "BR").length).toBe(0);
    expect(nodes.map((n) => n.textContent).join("")).toContain("just one line");
  });

  test("HTML clipboard content is unaffected: source newlines do not become <br>", () => {
    const handler = getPasteHandler();
    handler(
      {},
      makePasteEvent({ html: "<p>alpha</p>\n<p>beta</p>\n" })
    );

    const nodes = getInsertedNodes();
    // Two paragraphs, and the formatting newlines between them add no <br>
    expect(nodes.filter((n) => n.nodeName === "BR").length).toBe(0);
    expect(nodes.filter((n) => n.nodeName === "P").length).toBe(2);
  });
});
