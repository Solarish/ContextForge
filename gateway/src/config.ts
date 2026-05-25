import path from "node:path";

export function getConfig() {
  const reportRoot = process.env.REPORT_ROOT ?? path.resolve("workspace/report");
  const wikiRoot = process.env.WIKI_ROOT ?? path.resolve("workspace/wiki");
  const port = Number(process.env.PORT ?? "8787");
  return {
    reportRoot,
    wikiRoot,
    registryDir: path.join(reportRoot, "registry"),
    publicDir: path.resolve("public"),
    port
  };
}

