import fs from "node:fs/promises";
import { getProject, resolveSource } from "./projects.js";
import { loadIndex, loadRules, searchSources } from "./indexer.js";
import type { ContextBundle } from "./types.js";

export async function contextBundle(input: { projectId: string; topic: string; taskType: string }): Promise<ContextBundle> {
  const rules = await loadRules(input.projectId);
  const rule = rules.find(r => r.taskType === input.taskType);
  const { generation, cards } = await loadIndex(input.projectId);
  if (!rule) return { status: "blocked_unknown_task_type", projectId: input.projectId, taskType: input.taskType, requiredSources: [], suggestedSources: [], missingSources: [], indexGeneration: generation };
  const requiredSources = rule.required.map(p => cards.find(c => c.sourceType === "report" && c.path === p)).filter((c): c is NonNullable<typeof c> => !!c);
  const missingSources = rule.required.filter(p => !requiredSources.some(c => c.path === p));
  const found = (await searchSources({ projectId: input.projectId, query: input.topic, limit: 8 })).results;
  const suggestedSources = found.map(s => cards.find(c => c.id === s.id)!).filter(Boolean).filter(c => !requiredSources.some(r => r.id === c.id));
  const compact = (c: typeof cards[number]) => ({ id:c.id, projectId:c.projectId, path:c.path, sourceType:c.sourceType, title:c.title.slice(0,100), headings:c.headings.slice(0,3), excerpt:c.excerpt.slice(0,90), fingerprint:c.fingerprint });
  return { status: missingSources.length ? "blocked_missing_sources" : "ready", projectId: input.projectId, taskType: input.taskType, requiredSources: requiredSources.map(compact), suggestedSources: suggestedSources.slice(0, 5).map(compact), missingSources, indexGeneration: generation };
}
export async function validateContext(input: { projectId: string; taskType: string; loadedPaths: string[] }) {
  const rule = (await loadRules(input.projectId)).find(r => r.taskType === input.taskType);
  if (!rule) return { status: "blocked_unknown_task_type", missingSources: [] };
  const missingSources = rule.required.filter(p => !input.loadedPaths.includes(p));
  return { status: missingSources.length ? "blocked_missing_sources" : "ready", missingSources };
}
export async function contextRead(input: { projectId: string; sourceId: string; heading?: string; maxChars?: number }) {
  const project = await getProject(input.projectId);
  const file = await resolveSource(project, input.sourceId);
  const content = await fs.readFile(file, "utf8");
  let selected = content;
  if (input.heading) {
    const lines = content.split(/\r?\n/);
    const start = lines.findIndex(l => /^#{1,6}\s+/.test(l) && l.replace(/^#{1,6}\s+/, "").trim().toLowerCase() === input.heading!.toLowerCase());
    if (start < 0) throw new Error("heading not found");
    const depth = lines[start].match(/^#+/)![0].length;
    let end = start + 1;
    while (end < lines.length && !(new RegExp(`^#{1,${depth}}\\s+`).test(lines[end]))) end++;
    selected = lines.slice(start, end).join("\n");
  }
  const maxChars = Math.max(500, Math.min(16000, input.maxChars ?? 8000));
  return { projectId: input.projectId, sourceId: input.sourceId, heading: input.heading, text: selected.slice(0, maxChars), truncated: selected.length > maxChars, totalChars: selected.length };
}
