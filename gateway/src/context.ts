import { loadRules, loadSources, searchSources } from "./indexer.js";
import type { ContextBundle } from "./types.js";

export async function contextBundle(input: { topic: string; taskType: string }): Promise<ContextBundle> {
  const rules = await loadRules();
  const rule = rules.find(item => item.taskType === input.taskType) ?? rules[0];
  const sources = await loadSources();
  const requiredSources = rule.required.map(required => sources.find(source => source.path === required)).filter(Boolean) as ContextBundle["requiredSources"];
  const missingSources = rule.required.filter(required => !sources.some(source => source.path === required));
  const wikiSources = sources.filter(source => source.sourceType === "linked_wiki" && rule.wikiConcepts.some(concept => source.title.toLowerCase().includes(concept.toLowerCase())));
  return {
    status: missingSources.length ? "blocked_missing_sources" : "ready",
    topic: input.topic,
    taskType: rule.taskType,
    requiredSources,
    wikiSources,
    suggestedSources: await searchSources(input.topic, 12),
    missingSources
  };
}

export async function validateContext(input: { taskType: string; loadedPaths: string[] }) {
  const rules = await loadRules();
  const rule = rules.find(item => item.taskType === input.taskType) ?? rules[0];
  const loaded = new Set(input.loadedPaths);
  const missingSources = rule.required.filter(required => !loaded.has(required));
  return {
    status: missingSources.length ? "blocked_missing_sources" : "ready",
    required: rule.required,
    loadedPaths: input.loadedPaths,
    missingSources
  };
}

