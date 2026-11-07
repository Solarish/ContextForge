export type SourceType = "report" | "wiki";
export interface SourceCard { id: string; projectId: string; path: string; sourceType: SourceType; title: string; excerpt: string; headings: string[]; mtimeMs: number; size: number; fingerprint: string; }
export type SourceSummary = Pick<SourceCard, "id" | "projectId" | "path" | "sourceType" | "title" | "excerpt" | "headings" | "fingerprint">;
export interface ContextRule { taskType: string; required: string[]; wikiConcepts: string[]; optionalGlobs: string[]; }
export type ReadinessStatus = "ready" | "blocked_missing_sources" | "blocked_unknown_task_type";
export interface ContextBundle { status: ReadinessStatus; projectId: string; taskType: string; requiredSources: SourceSummary[]; suggestedSources: SourceSummary[]; missingSources: string[]; indexGeneration: string; }
export interface ProjectConfig { id: string; title: string; reportRoot: string; wikiRoot: string; rulesPath?: string; legacyHtmlRoots?: string[]; }
export interface ReportSection { heading: string; text?: string; columns?: string[]; rows?: Array<Array<string | number | null>>; chart?: { labels: string[]; values: number[] }; events?: Array<{ at: string; label: string; detail?: string }>; }
export interface ReportInput { projectId: string; title: string; kind: "summary" | "table" | "chart" | "timeline"; sections: ReportSection[]; sourceRefs: string[]; }
