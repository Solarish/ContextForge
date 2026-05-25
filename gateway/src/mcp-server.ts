import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { getConfig } from "./config.js";
import { contextBundle, validateContext } from "./context.js";
import { loadSources, refreshIndex, searchSources } from "./indexer.js";
import { pathExists } from "./fs-utils.js";

const config = getConfig();
const server = new McpServer({ name: "contextforge", version: "0.1.0" });

server.registerTool("context_status", { title: "ContextForge Status", inputSchema: {} }, async () => json({
  reportRoot: config.reportRoot,
  wikiRoot: config.wikiRoot,
  mounts: {
    report: await pathExists(config.reportRoot),
    wiki: await pathExists(config.wikiRoot)
  }
}));

server.registerTool("refresh_index", { title: "Refresh Index", inputSchema: {} }, async () => json(await refreshIndex()));

server.registerTool("context_bundle", {
  title: "Context Bundle",
  inputSchema: {
    topic: z.string(),
    taskType: z.string()
  }
}, async input => json(await contextBundle(input)));

server.registerTool("validate_context", {
  title: "Validate Context",
  inputSchema: {
    taskType: z.string(),
    loadedPaths: z.array(z.string())
  }
}, async input => json(await validateContext(input)));

server.registerTool("search_sources", {
  title: "Search Sources",
  inputSchema: {
    query: z.string()
  }
}, async input => json(await searchSources(input.query)));

server.registerTool("list_sources", { title: "List Sources", inputSchema: {} }, async () => json(await loadSources()));

await server.connect(new StdioServerTransport());

function json(value: unknown) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(value, null, 2) }],
    structuredContent: Array.isArray(value) ? { results: value } : value as Record<string, unknown>
  };
}

