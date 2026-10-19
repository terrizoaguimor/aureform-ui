import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { resolve, extname, sep } from "node:path";
import { kitRoot } from "./lib/source-graph.mjs";
const root = resolve(kitRoot, "out"),
  port = Number(process.env.PORT ?? 3000),
  host = process.env.HOST ?? "127.0.0.1",
  basePath = (process.env.NEXT_PUBLIC_BASE_PATH ?? "").replace(/\/+$/, "");
const mime = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
  ".json": "application/json; charset=utf-8",
  ".webp": "image/webp",
  ".png": "image/png",
  ".ttf": "font/ttf",
  ".woff2": "font/woff2",
  ".zip": "application/zip",
  ".webm": "video/webm",
  ".vtt": "text/vtt; charset=utf-8",
  // Next's static-export client also accepts text/plain for its RSC payloads.
  ".txt": "text/plain; charset=utf-8",
};
await stat(resolve(root, "index.html")).catch(() => {
  throw new Error("Run pnpm build before pnpm start.");
});
const server = createServer(async (req, res) => {
  try {
    let pathname = decodeURIComponent(
      new URL(req.url ?? "/", "http://localhost").pathname,
    );
    if (basePath) {
      if (pathname === basePath) {
        res.writeHead(308, { Location: `${basePath}/` }).end();
        return;
      }
      if (!pathname.startsWith(`${basePath}/`)) {
        res.writeHead(404).end();
        return;
      }
      pathname = pathname.slice(basePath.length);
    }
    const candidate = resolve(root, `.${pathname}`);
    if (candidate !== root && !candidate.startsWith(root + sep)) {
      res.writeHead(400).end();
      return;
    }
    const info = await stat(candidate).catch(() => null),
      file = info?.isDirectory() ? resolve(candidate, "index.html") : candidate;
    const content = await readFile(file).catch(() => null);
    if (!content) {
      res
        .writeHead(404, { "Content-Type": "text/html; charset=utf-8" })
        .end(await readFile(resolve(root, "404.html")));
      return;
    }
    const type = mime[extname(file)] ?? "application/octet-stream";
    if (req.headers.range) {
      const match = /^bytes=(\d+)-(\d*)$/.exec(req.headers.range);
      if (match) {
        const start = Number(match[1]),
          end = Math.min(
            Number(match[2] || content.length - 1),
            content.length - 1,
          );
        if (start > end) {
          res.writeHead(416).end();
          return;
        }
        res
          .writeHead(206, {
            "Content-Type": type,
            "Content-Range": `bytes ${start}-${end}/${content.length}`,
            "Accept-Ranges": "bytes",
            "Content-Length": end - start + 1,
          })
          .end(content.subarray(start, end + 1));
        return;
      }
    }
    res
      .writeHead(200, {
        "Content-Type": type,
        "Content-Length": content.length,
        "Accept-Ranges": "bytes",
        "Cache-Control": "no-cache",
      })
      .end(req.method === "HEAD" ? undefined : content);
  } catch {
    res.writeHead(400).end();
  }
});
server.listen(port, host, () =>
  console.log(`Aureform static preview: http://${host}:${port}${basePath}/`),
);
for (const signal of ["SIGINT", "SIGTERM"])
  process.on(signal, () => server.close(() => process.exit(0)));
