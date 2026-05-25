import http from "node:http";
import fs from "node:fs/promises";
import path from "node:path";
import { getConfig } from "./config.js";
import { contextBundle, validateContext } from "./context.js";
import { loadSources, refreshIndex, searchSources } from "./indexer.js";
import { pathExists, readJson } from "./fs-utils.js";

const config = getConfig();

const server = http.createServer(async (req, res) => {
  try {
    await route(req, res);
  } catch (error) {
    sendJson(res, 500, { error: error instanceof Error ? error.message : String(error) });
  }
});

server.listen(config.port, "0.0.0.0", () => {
  console.log(`contextforge listening on http://127.0.0.1:${config.port}`);
});

async function route(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
  const url = new URL(req.url ?? "/", `http://${req.headers.host ?? "127.0.0.1"}`);
  if (req.method === "GET" && (url.pathname === "/" || url.pathname === "/dashboard")) {
    return sendFile(res, path.join(config.publicDir, "index.html"), "text/html; charset=utf-8");
  }
  if (url.pathname === "/api/status" && req.method === "GET") {
    return sendJson(res, 200, {
      service: "contextforge",
      mounts: {
        report: await pathExists(config.reportRoot),
        wiki: await pathExists(config.wikiRoot)
      },
      sources: (await loadSources()).length
    });
  }
  if (url.pathname === "/api/index/refresh" && req.method === "POST") return sendJson(res, 200, await refreshIndex());
  if (url.pathname === "/api/sources" && req.method === "GET") return sendJson(res, 200, await loadSources());
  if (url.pathname === "/api/sources/search" && req.method === "GET") return sendJson(res, 200, await searchSources(url.searchParams.get("q") ?? ""));
  if (url.pathname === "/api/context/bundle" && req.method === "POST") return sendJson(res, 200, await contextBundle(await body(req)));
  if (url.pathname === "/api/context/validate" && req.method === "POST") return sendJson(res, 200, await validateContext(await body(req)));
  if (url.pathname === "/api/issues" && req.method === "GET") return sendJson(res, 200, await readJson(path.join(config.registryDir, "issues.json"), []));
  sendJson(res, 404, { error: "Not found" });
}

async function body<T = any>(req: http.IncomingMessage): Promise<T> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  const raw = Buffer.concat(chunks).toString("utf8");
  return raw ? JSON.parse(raw) as T : {} as T;
}

function sendJson(res: http.ServerResponse, status: number, value: unknown): void {
  res.writeHead(status, { "content-type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(value, null, 2));
}

async function sendFile(res: http.ServerResponse, filePath: string, type: string): Promise<void> {
  try {
    res.writeHead(200, { "content-type": type });
    res.end(await fs.readFile(filePath));
  } catch {
    sendJson(res, 404, { error: "File not found" });
  }
}

