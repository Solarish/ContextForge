# Operating Model

[Updated by: codex | Time: 2026-05-25 08:54:27 +0700]

## Roles

Canonical Report:

- Architecture decisions.
- Cross-project analysis.
- Current blockers.
- Handoffs and checkpoints.
- Generated maps and issue registry.

LLM Wiki:

- Concept navigation.
- Business terms.
- Links to relevant pages.
- Read-only by default.

Gateway:

- Indexing.
- Context gates.
- MCP tools.
- Dashboard.
- Artifact creation.

Agent:

- Call `context_bundle`.
- Load required sources.
- Call `validate_context`.
- Stop if blocked or conflict appears.
- Write canonical updates back to Report.

## Task Gates

Example task types:

- `architecture`
- `feature_plan`
- `backend_change`
- `issue_update`
- `mindmap_create`
- `release_handoff`

Each task type should define:

- required canonical files
- linked wiki concepts
- optional source folders
- conflict behavior

## Drift Policy

If Wiki and Report disagree:

1. Mark `wiki_stale` or `conflict_needs_user`.
2. Do not mark context as clean.
3. Use Report as canonical unless the user explicitly changes the source of truth.
4. Update Wiki only after Report is corrected.

## Stamp Policy

Every generated or updated report should include:

```text
[Updated by: <agent> | Time: YYYY-MM-DD HH:MM:SS +0700]
```

