import http from "node:http";
import fs from "node:fs";
import path from "node:path";

/**
 * Serves docs/ under /pickcat-winui3/ so the built site can be checked the same
 * way GitHub Pages serves it (same base path, same MIME types).
 */
const ROOT = path.resolve("docs");
const PREFIX = "/pickcat-winui3/";
const PORT = Number(process.env.PORT || 8123);

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".woff2": "font/woff2",
  ".json": "application/json",
  ".md": "text/markdown; charset=utf-8",
};

http
  .createServer((req, res) => {
    const url = decodeURIComponent((req.url || "/").split("?")[0]);
    if (!url.startsWith(PREFIX)) {
      res.writeHead(302, { Location: PREFIX });
      res.end();
      return;
    }
    let rel = url.slice(PREFIX.length);
    if (rel === "" || rel.endsWith("/")) rel += "index.html";
    const file = path.join(ROOT, rel);
    if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("404 " + rel);
      return;
    }
    res.writeHead(200, { "Content-Type": TYPES[path.extname(file)] || "application/octet-stream" });
    fs.createReadStream(file).pipe(res);
  })
  .listen(PORT, "127.0.0.1", () => {
    console.log(`serving docs/ at http://127.0.0.1:${PORT}${PREFIX}`);
  });
