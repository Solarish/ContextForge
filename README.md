# ContextForge

ContextForge is a local multi-project context gateway and permanent HTML report hub. Each `projectId` maps to its own canonical report, linked Wiki, and context rules. Searches stay inside one project unless `acrossProjects: true` is explicitly set. Agents receive short source cards first and call `context_read` for a selected document or heading.

Production environment and provider tools live in the separate private repository [ContextForge Private Ops](https://github.com/Solarish/ContextForge-Private-Ops). This public repository contains no production credentials, session board, CLI dispatcher, or agent runner.

## Run

```bash
cd gateway
npm ci
npm run check
npm test
npm run build
CONTEXTFORGE_PROJECTS_FILE=../workspace/projects.json node dist/server.js
```

Open `http://127.0.0.1:8787/`. The HTTP service binds to loopback by default. To use MCP over stdio, run `node gateway/dist/mcp-server.js` after building. No container runtime is needed.

`workspace/projects.json` is intentionally empty. `context_status` works before any project is registered; project context and reports require a configured project. Set `CONTEXTFORGE_PROJECTS_FILE` to a local JSON registry **outside this repository** for real projects and `CONTEXTFORGE_STATE_ROOT` to a persistent writable directory. Each entry has `id`, `title`, `reportRoot`, `wikiRoot`, optional `rulesPath`, and optional `legacyHtmlRoots`. Paths resolve relative to the registry file. Do not commit project documents, reports, indexes, credentials, or machine-specific paths to this public repository.

## MCP tools

| Tool | Purpose |
|---|---|
| `context_status`, `project_list` | List registered projects |
| `refresh_index` | Incrementally update cached source cards |
| `context_find` | Search one project; explicit cross-project option |
| `context_bundle` | Compact required and suggested source cards |
| `context_read` | Read one source or Markdown heading, bounded by `maxChars` |
| `validate_context` | Check required sources for a task type |
| `report_create` | Store a structured, immutable JSON snapshot and server-rendered HTML |
| `report_list`, `report_get` | Discover reports and compact metadata |

Reports accept `summary`, `table`, `chart`, or `timeline` sections with source references. The server escapes all supplied text and supplies filtering and table sorting. It does not accept agent-authored HTML or JavaScript. Browser URLs use `/reports/{projectId}/{reportId}`. MCP clients can read the matching `ui://contextforge/reports/{projectId}/{reportId}` resource. Legacy HTML roots appear in the catalog as linked history.

For MCP Apps hosts, `report_create` and `report_get` link to a `ui://contextforge/report-viewer` app. Model-facing results stay short; the View loads full report data through the app-only `report_data` tool.

The server's state root contains indexes and report snapshots. Back it up if reports must survive machine loss. Context and report files are not uploaded by this project.

See `templates/AGENTS.md` for shared agent rules and `docs/02-architecture.md` for the data flow.
