# Architecture

[Updated by: codex | Time: 2026-05-25 08:54:27 +0700]

## Components

```text
Human
  -> Dashboard
  -> Static mindmaps

Agent
  -> MCP tools
  -> REST API fallback

Gateway container
  -> /data/report  writable canonical report
  -> /data/wiki    read-only linked wiki
  -> registry JSON caches
```

## Data Model

Minimum registries:

- `source-index.json`: file cards, headings, snippets, fingerprints.
- `source-graph.json`: outbound links and backlinks.
- `wiki-index-cache.json`: allowed wiki pages from `index.md`.
- `context-rules.json`: required sources by task type.
- `issues.json`: issue records with linked source evidence.
- `maps.json`: mindmap records and source links.

## Source Types

- `canonical_report`: trusted project truth.
- `linked_wiki`: read-only concept navigation.
- `generated_map`: static visual artifact.
- `issue_registry`: structured issue data.

## Required Tool Behaviors

- `context_bundle`: return required source pack for a task.
- `validate_context`: block if required files were not loaded.
- `search_fast`: ranked source cards, not raw dumps.
- `source_graph`: related docs, wiki pages, maps, issues.
- `check_drift`: report stale wiki or source conflicts.
- `upsert_issue`: write/update issue evidence.
- `create_mindmap`: generate structured map plus static HTML.
- `status`: mount health, index freshness, git state, artifacts.

## Deployment Shape

```text
Dockerfile
docker-compose.yml
gateway/
  src/server.ts
  src/mcp-server.ts
  src/indexer.ts
  src/context.ts
  src/mindmap.ts
workspace/
  report/
  wiki/
```

