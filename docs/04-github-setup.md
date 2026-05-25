# GitHub Setup

[Updated by: codex | Time: 2026-05-25 09:13:45 +0700]

## First Commit

```bash
cd /Users/louislee_neo/Desktop/ContextForge
git init
git add .
git commit -m "Initial ContextForge scaffold"
```

## Portable Scaffold Rule

ContextForge is committed as source only. Do not commit generated runtime folders:

```text
gateway/node_modules/
gateway/dist/
```

## Optional Docker Run

```bash
docker compose up --build
```

Dashboard:

```text
http://127.0.0.1:8797/dashboard
```

Build the local source index:

```bash
curl -X POST http://127.0.0.1:8797/api/index/refresh
```

Stop and remove it:

```bash
docker compose down
```

## Local Development

```bash
cd gateway
npm install
npm run build
REPORT_ROOT=../workspace/report \
WIKI_ROOT=../workspace/wiki \
PORT=8787 \
npm start
```

## MCP Command

```bash
cd /path/to/ContextForge/gateway
REPORT_ROOT=/path/to/report \
WIKI_ROOT=/path/to/wiki \
node dist/mcp-server.js
```

Call `refresh_index` once after connecting the MCP server.

## What To Customize

- Rename service/container in `docker-compose.yml`.
- Change `restart: "no"` to `restart: unless-stopped` only if this should auto-start after reboot.
- Replace `workspace/report` with your real report repository.
- Replace `workspace/wiki` with your real wiki folder.
- Edit `workspace/report/registry/context-rules.json`.
- Edit `templates/AGENTS.md` and copy it into your project root.
