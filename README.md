# ContextForge

[Updated by: codex | Time: 2026-05-25 09:13:45 +0700]

ContextForge is a blank, reusable starter template for building a project knowledge gateway:

- Canonical Report: the source of truth for architecture, decisions, issues, and handoffs.
- LLM Wiki: read-only linked context and concept navigation.
- Docker Gateway: optional local dashboard, REST API, and MCP server in one container.
- Agent Gates: required-source validation before agents plan or write.
- Mindmaps and Issues: structured artifacts written back into the canonical report.

The goal is to make agents faster while reducing context drift, forgotten documents, and duplicated architecture logic.

## Repository Layout

```text
ContextForge/
  README.md
  docs/
    01-concept-th.md
    02-architecture.md
    03-operating-model.md
    04-github-setup.md
    05-agent-rules-template.md
  gateway/
    package.json
    tsconfig.json
    src/
    public/
  templates/
    AGENTS.md
    context-rules.json
    wiki-index.md
  workspace/
    report/
    wiki/
  Dockerfile
  docker-compose.yml
```

## Current State

This folder is intentionally not running anything. It is a portable scaffold for GitHub or another machine.

Generated runtime folders are not committed:

```text
gateway/node_modules/
gateway/dist/
```

## Use On Another Machine

```bash
git clone <your-repo-url> ContextForge
cd ContextForge
```

Customize these first:

```text
workspace/report/README.md
workspace/report/registry/context-rules.json
workspace/wiki/index.md
templates/AGENTS.md
docker-compose.yml
```

Run only when you want the gateway active:

```bash
docker compose up --build
```

Dashboard:

```text
http://127.0.0.1:8797/dashboard
```

Build the local source index after the first run:

```bash
curl -X POST http://127.0.0.1:8797/api/index/refresh
```

Stop and remove the container:

```bash
docker compose down
```

## MCP Without Docker

```bash
cd gateway
npm install
npm run build
REPORT_ROOT=/path/to/report \
WIKI_ROOT=/path/to/wiki \
node dist/mcp-server.js
```

Then call the MCP tool `refresh_index` once before asking agents for `context_bundle`.

## Core Rule

```text
Canonical Report owns truth.
Wiki owns navigation.
Gateway owns access speed.
MCP owns agent interface.
Dashboard owns human visibility.
```

## Next Steps For A New Project

1. Copy this folder into a new GitHub repository.
2. Replace `workspace/report/README.md` with your project source-of-truth.
3. Replace `workspace/wiki/index.md` with your concept map.
4. Edit `workspace/report/registry/context-rules.json`.
5. Copy `templates/AGENTS.md` into the project root and adjust paths/tool names.
6. Build the gateway only when needed, then register the MCP command from `gateway/dist/mcp-server.js`.
7. Tell agents to call `context_bundle` and `validate_context` before planning or writing.
