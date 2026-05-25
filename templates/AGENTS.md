# Agent Operational Guidelines

[Updated by: codex | Time: 2026-05-25 08:54:27 +0700]

## Mandatory Context Flow

1. Start with `context_status`.
2. Call `context_bundle` for the task type.
3. Load every required source.
4. Use Wiki only through `wiki/index.md` linked pages.
5. Call `validate_context` before planning or writing.
6. Stop if status is `blocked_missing_sources`, `wiki_drift_detected`, or `conflict_needs_user`.

## Source Authority

- Canonical Report is source of truth.
- LLM Wiki is linked navigation/context.
- Generated maps and issues must cite canonical source paths.

## Write Policy

- Write canonical updates into Report.
- Keep Wiki read-only unless explicitly instructed.
- Add update stamps to generated or edited reports.

