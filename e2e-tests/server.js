/**
 * Tiny static server for the e2e harness.
 *
 * Serves the REAL component source from ../cp/richTextFieldWithTables/v1 at /editor/,
 * rewriting the APPIAN_JS_SDK_URI placeholder in index.html to point at the
 * Appian SDK mock in ./harness/appian-mock.js. No component source is copied
 * or modified on disk — tests always run against the live plugin code.
 */
const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = process.env.PORT || 4173;
const COMPONENT_DIR = path.resolve(__dirname, "..", "cp", "richTextFieldWithTables", "v1");
const HARNESS_DIR = path.resolve(__dirname, "harness");

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".gif": "image/gif",
  ".json": "application/json",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".eot": "application/vnd.ms-fontobject",
  ".properties": "text/plain; charset=utf-8",
};

function send(res, status, body, type) {
  res.writeHead(status, { "Content-Type": type || "text/plain" });
  res.end(body);
}

function serveFile(res, filePath, rewrite) {
  fs.readFile(filePath, (err, data) => {
    if (err) return send(res, 404, "Not found: " + filePath);
    let body = data;
    if (rewrite) body = Buffer.from(rewrite(data.toString("utf-8")), "utf-8");
    send(res, 200, body, MIME[path.extname(filePath).toLowerCase()] || "application/octet-stream");
  });
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  let pathname = decodeURIComponent(url.pathname);

  if (pathname === "/" || pathname === "/editor" || pathname === "/editor/") {
    pathname = "/editor/index.html";
  }

  if (pathname === "/appian-mock.js") {
    return serveFile(res, path.join(HARNESS_DIR, "appian-mock.js"));
  }

  if (pathname.startsWith("/editor/")) {
    const rel = pathname.slice("/editor/".length);
    const filePath = path.join(COMPONENT_DIR, rel);
    // prevent path traversal
    if (!filePath.startsWith(COMPONENT_DIR)) return send(res, 403, "Forbidden");
    if (rel === "index.html") {
      return serveFile(res, filePath, (html) =>
        html.replace("APPIAN_JS_SDK_URI", "/appian-mock.js")
      );
    }
    return serveFile(res, filePath);
  }

  send(res, 404, "Not found");
});

server.listen(PORT, () => {
  console.log(`RTE e2e harness serving on http://localhost:${PORT}/editor/`);
  console.log(`Component dir: ${COMPONENT_DIR}`);
});
