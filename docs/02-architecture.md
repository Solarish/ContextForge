# Architecture

[Updated by: claude | Time: 2026-07-08 14:25:00 +0700]

ContextForge has two layers. The **context layer** (always present) makes agents load the
right sources before they act. The **orchestration layer** (optional, see
`06-orchestrator.md`) lets multiple agents hand work off to each other and lets a human
watch and kill runs from one dashboard. Both live in a **single gateway process**.

## Components

```text
Human
  -> Dashboard            (/dashboard  — sources, issues, mindmaps, drift)
  -> Orchestrator UI      (/orchestrator — live sessions, spawns, kill switches)  [optional]
  -> Static mindmaps

Agent
  -> MCP tools            (context + session + issue + mindmap + env)
  -> REST API fallback

Gateway process (one Node runtime)
  -> HTTP server          REST API + dashboards + SSE stream
  -> MCP gateway          agent-facing tools over stdio
  -> Orchestrator loop    event-driven dispatch + sweeps + fs.watch   [optional]
  -> Process registry     in-memory Map of running agent spawns       [optional]

Storage
  -> report/  writable canonical report (truth)
  -> wiki/    read-only linked wiki (navigation)
  -> registry JSON caches + session/orchestrator state
```

## Data Model

Context registries:

- `source-index.json`: file cards, headings, snippets, fingerprints.
- `source-graph.json`: outbound links and backlinks.
- `wiki-index-cache.json`: allowed wiki pages from `index.md`.
- `context-rules.json`: required sources by task type.
- `issues.json`: issue records with linked source evidence.
- `maps.json`: mindmap records and source links.

Orchestration registries (optional layer):

- `agent-sessions.json`: canonical session store, including the `participants` map (self-declared roles).
- `agent-registry.json`: dispatchable agents — capabilities, concurrency, runner path, enabled flag.
- `orchestrator-locks.json`: per-session dispatch locks (idempotency).
- `orchestrator-events.json`: dispatch event log (ring buffer).
- `orchestrator-status.json`: last tick snapshot.
- `orchestrator-audit.json`: human action audit (kill / pause / resume / hard-stop / reload).

Env control-plane registries (optional layer):

- `env-registry.json`: declared env keys, sources, and protection policy — **presence and metadata only, never raw values**.
- `env-mutations.json`: audit log of every set/sync/delete.

## Source Types

- `canonical_report`: trusted project truth.
- `linked_wiki`: read-only concept navigation.
- `generated_map`: static visual artifact.
- `issue_registry`: structured issue data.

## Required Tool Behaviors

Context tools (core):

- `context_bundle`: return the required source pack for a task type.
- `validate_context`: block if required files were not loaded.
- `search_fast` / `search_sources`: ranked source cards, not raw dumps.
- `source_graph`: related docs, wiki pages, maps, issues.
- `check_drift`: report stale wiki or source conflicts.
- `upsert_issue`: write/update issue evidence.
- `create_mindmap` / `render_mindmap`: generate a structured map plus static HTML.
- `status`: mount health, index freshness, git state, artifacts.

Session tools (orchestration layer):

- `session_open` / `session_list` / `session_read`: create and inspect coordination sessions.
- `session_append`: post a round card (status, summary, blockers, nextAction, artifacts).
- `session_claim_role`: an agent declares its own role (`lead` / `worker` / `coordinator`).
- `session_decide`: record a user decision as a first-class artifact.
- `session_update`: mutate session metadata (status, archive).

Env tools (control plane — no raw secrets ever leave the gateway):

- `env_list` / `env_get`: read-only presence + metadata checks.
- `env_set` / `env_sync`: audited mutations (never edit CLI/`.env` ad hoc).
- `env_audit`: detect drift between sources.

## Deployment Shape

```text
Dockerfile
docker-compose.yml
gateway/
  src/server.ts              HTTP entry + boots orchestrator inline
  src/mcp-server.ts          agent-facing MCP tools
  src/indexer.ts             source index + graph
  src/context.ts             context-rule resolution
  src/mindmap.ts             mindmap generation
  src/sessions.ts            session store + mutation queue          [optional]
  src/orchestrator.ts        route state machine + dispatcher        [optional]
  src/orchestrator-runtime.ts kill / SSE / audit runtime             [optional]
  src/agent-registry.ts      load + validate + hot-reload registry   [optional]
  src/runner.ts              spawn agent CLIs as child processes      [optional]
  scripts/runners/           one non-interactive runner per agent     [optional]
  public/
    dashboard.html
    orchestrator.html        live dispatch board                     [optional]
workspace/
  report/
    registry/                context + orchestration + env JSON
  wiki/
```

The context layer is what ships today; the orchestration and env layers are documented
targets (`06-orchestrator.md`) — a project adopts them by adding the `[optional]` files.
