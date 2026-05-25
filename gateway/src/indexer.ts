import fs from "node:fs/promises";
import path from "node:path";
import { getConfig } from "./config.js";
import { excerpt, headingsFromMarkdown, listMarkdown, pathExists, readJson, readText, titleFromMarkdown, writeJsonStamped } from "./fs-utils.js";
import type { ContextRule, SourceCard } from "./types.js";

export function defaultContextRules(): ContextRule[] {
  return [
    {
      taskType: "architecture",
      required: ["README.md", "reports/system-overview.md"],
      wikiConcepts: ["System Overview"],
      optionalGlobs: ["reports/", "architecture/"]
    },
    {
      taskType: "issue_update",
      required: ["README.md", "registry/issues.json"],
      wikiConcepts: ["Project Issues"],
      optionalGlobs: ["reports/", "checkpoints/"]
    },
    {
      taskType: "mindmap_create",
      required: ["README.md", "registry/sources.json"],
      wikiConcepts: ["System Overview", "Project Issues"],
      optionalGlobs: ["maps/", "reports/"]
    }
  ];
}

export async function refreshIndex(): Promise<SourceCard[]> {
  const config = getConfig();
  const reportFiles = await listMarkdown(config.reportRoot);
  const wikiFiles = await linkedWikiFiles(config.wikiRoot);
  const cards = [
    ...(await Promise.all(reportFiles.map(file => toSourceCard(file, config.reportRoot, "canonical_report")))),
    ...(await Promise.all(wikiFiles.map(file => toSourceCard(file, config.wikiRoot, "linked_wiki"))))
  ].sort((a, b) => a.path.localeCompare(b.path));
  await writeJsonStamped(path.join(config.registryDir, "sources.json"), cards);
  await writeJsonStamped(path.join(config.registryDir, "source-index.json"), cards);
  const contextRulesPath = path.join(config.registryDir, "context-rules.json");
  if (!(await pathExists(contextRulesPath))) await writeJsonStamped(contextRulesPath, defaultContextRules());
  return cards;
}

export async function loadSources(): Promise<SourceCard[]> {
  const config = getConfig();
  return readJson<SourceCard[]>(path.join(config.registryDir, "source-index.json"), []);
}

export async function loadRules(): Promise<ContextRule[]> {
  const config = getConfig();
  return readJson<ContextRule[]>(path.join(config.registryDir, "context-rules.json"), defaultContextRules());
}

export async function searchSources(query: string, limit = 12): Promise<SourceCard[]> {
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
  const sources = await loadSources();
  if (!terms.length) return sources.slice(0, limit);
  return sources
    .map(source => {
      const haystack = `${source.title} ${source.path} ${source.headings.join(" ")} ${source.excerpt}`.toLowerCase();
      return { source, score: terms.reduce((sum, term) => sum + (haystack.includes(term) ? 1 : 0), 0) };
    })
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(item => item.source);
}

async function toSourceCard(filePath: string, root: string, sourceType: SourceCard["sourceType"]): Promise<SourceCard> {
  const content = await readText(filePath);
  const relative = path.relative(root, filePath);
  const stat = await fs.stat(filePath);
  return {
    id: `${sourceType}:${relative}`,
    path: relative,
    sourceType,
    title: titleFromMarkdown(content, path.basename(filePath, path.extname(filePath))),
    headings: headingsFromMarkdown(content),
    excerpt: excerpt(content),
    mtimeMs: stat.mtimeMs,
    confidence: sourceType === "canonical_report" ? "canonical" : "linked_context"
  };
}

async function linkedWikiFiles(wikiRoot: string): Promise<string[]> {
  const indexPath = path.join(wikiRoot, "index.md");
  const index = await readText(indexPath).catch(() => "");
  const links = [...index.matchAll(/\[\[([^\]]+)\]\]/g)].map(match => match[1]);
  const candidates = [
    indexPath,
    ...links.map(link => path.join(wikiRoot, "wiki", `${link}.md`))
  ];
  const exists = await Promise.all(candidates.map(file => pathExists(file)));
  return candidates.filter((_, index) => exists[index]);
}
