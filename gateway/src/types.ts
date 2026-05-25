export type SourceType = "canonical_report" | "linked_wiki" | "generated_map" | "issue_registry";

export type ReadinessStatus = "ready" | "blocked_missing_sources" | "wiki_drift_detected" | "conflict_needs_user";

export interface SourceCard {
  id: string;
  path: string;
  sourceType: SourceType;
  title: string;
  headings: string[];
  excerpt: string;
  mtimeMs: number;
  confidence: "canonical" | "linked_context" | "stale_possible";
}

export interface ContextRule {
  taskType: string;
  required: string[];
  wikiConcepts: string[];
  optionalGlobs: string[];
}

export interface ContextBundle {
  status: ReadinessStatus;
  topic: string;
  taskType: string;
  requiredSources: SourceCard[];
  wikiSources: SourceCard[];
  suggestedSources: SourceCard[];
  missingSources: string[];
}

