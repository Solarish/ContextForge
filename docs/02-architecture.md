# Architecture

```text
Agent clients (Claude, Codex, Gemini)
  ├─ ContextForge MCP ── project registry ── per-project report/wiki/rules
  │                    ├─ incremental source index and compact context cards
  │                    └─ immutable report snapshot and server HTML template
  ├─ ContextForge Private Ops MCP ── guarded env control + eight fixed read-only probes
  └─ Browser ── ContextForge HTTP /reports/{projectId}/{reportId}
```

The public gateway indexes Markdown, HTML and explicitly required JSON registry files. Wiki indexing starts from the project index links. `context_find` uses one namespace by default; only an explicit option searches all projects. `context_read` resolves real paths inside the selected root and bounds returned text. The index cache and report snapshots live under `CONTEXTFORGE_STATE_ROOT`. Reports escape user text and are served with restrictive CSP.

The private gateway contains the migrated env policy and audit. It does not expose arbitrary SQL, provider commands or raw provider payloads. Fixed probes fail independently. Agent coordination remains outside both gateways.
