import fs from "node:fs/promises";
import path from "node:path";
import { getConfig } from "./config.js";
import type { ProjectConfig } from "./types.js";

function within(root: string, candidate: string): boolean {
  const rel = path.relative(root, candidate);
  return rel === "" || (!rel.startsWith("..") && !path.isAbsolute(rel));
}
export async function listProjects(): Promise<ProjectConfig[]> {
  const file = getConfig().projectsFile;
  const raw = JSON.parse(await fs.readFile(file, "utf8"));
  if (!Array.isArray(raw.projects) || raw.projects.length === 0) throw new Error("projects registry is empty");
  const seen = new Set<string>();
  return raw.projects.map((item: ProjectConfig) => {
    if (!/^[a-z0-9][a-z0-9-]{0,63}$/.test(item.id) || seen.has(item.id)) throw new Error("invalid or duplicate project id");
    seen.add(item.id);
    const base = path.dirname(file);
    const project = { ...item, reportRoot: path.resolve(base, item.reportRoot), wikiRoot: path.resolve(base, item.wikiRoot), rulesPath: item.rulesPath ? path.resolve(base, item.rulesPath) : undefined,
      legacyHtmlRoots: (item.legacyHtmlRoots ?? []).map(root => path.resolve(base, root)) };
    return project;
  });
}
export async function getProject(id?: string): Promise<ProjectConfig> {
  const projects = await listProjects();
  if (!id && projects.length === 1) return projects[0];
  const project = projects.find(p => p.id === id);
  if (!project) throw new Error(`unknown projectId: ${id ?? "(missing)"}`);
  return project;
}
export async function resolveSource(project: ProjectConfig, sourceId: string): Promise<string> {
  const [type, ...parts] = sourceId.split(":");
  const rel = parts.join(":");
  if (!/^(report|wiki)$/.test(type) || !rel || path.isAbsolute(rel)) throw new Error("invalid source id");
  const root = await fs.realpath(type === "report" ? project.reportRoot : project.wikiRoot);
  const file = await fs.realpath(path.join(root, rel));
  if (!within(root, file)) throw new Error("source outside project root");
  return file;
}
