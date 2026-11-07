# Setup

Clone ContextForge, install gateway dependencies, run `npm run check && npm test && npm run build` in `gateway/`, then set `CONTEXTFORGE_PROJECTS_FILE` to a project registry and `CONTEXTFORGE_STATE_ROOT` to a persistent writable directory. Start `node gateway/dist/server.js` for the browser report hub and register `node gateway/dist/mcp-server.js` as a stdio MCP server. Keep the HTTP listener on loopback. `docker compose up --build` is an optional local deployment with sample data at `http://127.0.0.1:8797/`.

The public repo ignores runtime state and dependencies. Keep machine-specific absolute roots in a local registry outside the repo. Production provider tools come from the separate private repository. For a new project, add its `projectId`, canonical Report root, Wiki root, and optional context rules before indexing.
