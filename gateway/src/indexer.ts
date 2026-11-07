import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { getConfig } from "./config.js";
import { getProject, listProjects } from "./projects.js";
import { listMarkdown, pathExists, readJson, titleFromMarkdown, headingsFromMarkdown } from "./fs-utils.js";
import type { ContextRule, SourceCard, ProjectConfig } from "./types.js";

export const defaultRules: ContextRule[] = [
  { taskType: "general", required: ["README.md"], wikiConcepts: [], optionalGlobs: [] }
];
const fileFor = (id: string) => path.join(getConfig().stateRoot, "indexes", `${id}.json`);
const hash = (text: string) => crypto.createHash("sha256").update(text).digest("hex").slice(0, 16);

async function wikiFiles(project: ProjectConfig): Promise<string[]> {
  const index = path.join(project.wikiRoot, "index.md");
  const text = await fs.readFile(index, "utf8").catch(() => "");
  const names = [...text.matchAll(/\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g)].map(m => path.join(project.wikiRoot, "wiki", `${m[1]}.md`));
  const markdownLinks = [...text.matchAll(/\[[^\]]+\]\(([^)#]+\.md)\)/g)].map(m => path.resolve(project.wikiRoot, m[1]));
  const root = await fs.realpath(project.wikiRoot);
  const candidates = [index, ...names, ...markdownLinks];
  const unique = [...new Set(candidates)];
  const safe: string[] = [];
  for (const file of unique) {
    const real = await fs.realpath(file).catch(() => null);
    if (real && (real === root || real.startsWith(root + path.sep))) safe.push(real);
  }
  return safe;
}
export async function refreshIndex(projectId: string): Promise<{ projectId: string; generation: string; sources: number; changed: number }> {
  const project = await getProject(projectId);
  const old = await readJson<{ generation: string; cards: SourceCard[] }>(fileFor(projectId), { generation: "", cards: [] });
  const previous = new Map(old.cards.map(card => [card.id, card]));
  const reportFiles = await listMarkdown(project.reportRoot);
  const requiredJson: string[] = [];
  const reportRoot = await fs.realpath(project.reportRoot);
  for (const relative of (await loadRules(projectId)).flatMap(rule => rule.required).filter(name => name.endsWith(".json"))) {
    const file = await fs.realpath(path.join(reportRoot, relative)).catch(() => null);
    if (file && file.startsWith(reportRoot + path.sep)) requiredJson.push(file);
  }
  const wiki = await wikiFiles(project);
  const entries = [...[...new Set([...reportFiles, ...requiredJson])].map(file => ({ file, root: project.reportRoot, type: "report" as const })), ...wiki.map(file => ({ file, root: project.wikiRoot, type: "wiki" as const }))];
  let changed = 0;
  const cards: SourceCard[] = [];
  for (const entry of entries) {
    const relative = path.relative(entry.root, entry.file);
    const id = `${entry.type}:${relative}`;
    const stat = await fs.stat(entry.file);
    const prior = previous.get(id);
    if (prior && prior.mtimeMs === stat.mtimeMs && prior.size === stat.size) { cards.push(prior); continue; }
    const content = await fs.readFile(entry.file, "utf8");
    const excerpt = path.extname(entry.file) === ".json" ? "Structured registry; read explicitly when needed." : content.replace(/```[\s\S]*?```/g, " ").replace(/[#>*_`\[\]()]/g, " ").replace(/\s+/g, " ").trim().slice(0, 180);
    cards.push({ id, projectId, path: relative, sourceType: entry.type, title: titleFromMarkdown(content, path.basename(entry.file, path.extname(entry.file))), headings: headingsFromMarkdown(content).slice(0, 12), excerpt, mtimeMs: stat.mtimeMs, size: stat.size, fingerprint: hash(content) });
    changed++;
  }
  cards.sort((a,b) => a.id.localeCompare(b.id));
  const generation = hash(cards.map(c => `${c.id}:${c.fingerprint}`).join("|"));
  const target = fileFor(projectId);
  await fs.mkdir(path.dirname(target), { recursive: true });
  const temporary = `${target}.${process.pid}.${crypto.randomUUID()}.tmp`;
  await fs.writeFile(temporary, JSON.stringify({ generation, cards }));
  await fs.rename(temporary, target);
  return { projectId, generation, sources: cards.length, changed };
}
export async function loadIndex(projectId: string): Promise<{ generation: string; cards: SourceCard[] }> {
  const target = fileFor(projectId);
  if (!(await pathExists(target))) await refreshIndex(projectId);
  return readJson(target, { generation: "", cards: [] });
}
export async function refreshAll(): Promise<Array<{ projectId: string; generation: string; sources: number; changed: number }>> {
  const projects = await listProjects();
  return Promise.all(projects.map(p => refreshIndex(p.id)));
}
export async function loadRules(projectId: string): Promise<ContextRule[]> {
  const project = await getProject(projectId);
  if (!project.rulesPath) return defaultRules;
  return readJson(project.rulesPath, defaultRules);
}
export async function searchSources(input: { projectId?: string; query: string; limit?: number; acrossProjects?: boolean }): Promise<{ results: Array<Pick<SourceCard, "id" | "projectId" | "title" | "sourceType" | "path" | "excerpt" | "fingerprint">> }> {
  const projects = input.acrossProjects ? await listProjects() : [await getProject(input.projectId)];
  const terms = input.query.toLowerCase().trim().split(/\s+/).filter(Boolean).slice(0, 8);
  const ranked: Array<{ card: SourceCard; score: number }> = [];
  for (const project of projects) {
    const { cards } = await loadIndex(project.id);
    for (const card of cards) {
      const title = card.title.toLowerCase();
      const pathText = card.path.toLowerCase();
      const body = `${card.excerpt} ${card.headings.join(" ")}`.toLowerCase();
      const score = terms.reduce((n, term) => n + (title.includes(term) ? 5 : 0) + (pathText.includes(term) ? 3 : 0) + (body.includes(term) ? 1 : 0), 0);
      if (score || !terms.length) ranked.push({ card, score });
    }
  }
  ranked.sort((a,b) => b.score - a.score || a.card.title.localeCompare(b.card.title));
  const limit = Math.max(1, Math.min(20, input.limit ?? 8));
  return { results: ranked.slice(0, limit).map(({card}) => ({ id: card.id, projectId: card.projectId, title: card.title, sourceType: card.sourceType, path: card.path, excerpt: card.excerpt, fingerprint: card.fingerprint })) };
}
