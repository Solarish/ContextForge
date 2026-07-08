# ContextForge

[Updated by: claude | Time: 2026-07-08 14:40:00 +0700]

ContextForge is a blank, reusable starter template for building a project knowledge gateway
**and multi-agent command center**:

- Canonical Report: the source of truth for architecture, decisions, issues, and handoffs.
- LLM Wiki: read-only linked context and concept navigation.
- Gateway: local dashboard, REST API, and MCP server in one process (Docker optional).
- Agent Gates: required-source validation before agents plan or write.
- Mindmaps and Issues: structured artifacts written back into the canonical report.

It ships in **two layers**:

- **Context layer** (core): make agents load the right sources before they act.
- **Orchestration layer** (optional): let multiple agents hand work off to each other
  through a session channel, plug agents in via a hot-reloaded registry, and let a human
  watch and kill runs from a live `/orchestrator` dashboard — all in the same gateway
  process. See [`docs/06-orchestrator.md`](docs/06-orchestrator.md).

The goal is to make agents faster while reducing context drift, forgotten documents, and
duplicated architecture logic — and to keep a human in control when several agents run at once.

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
    06-orchestrator.md          # optional multi-agent orchestration layer
  gateway/
    package.json
    tsconfig.json
    src/
    public/
  templates/
    AGENTS.md
    agent-registry.json         # sample registry for the orchestration layer
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

## How To Use

ContextForge is used in two stages. Start with the **context layer** (always useful); add
the **orchestration layer** only when several agents work together.

### A. Context layer (start here)

1. **Point the gateway at your knowledge.** Put your project truth in `workspace/report/`
   and your concept map in `workspace/wiki/index.md`. Only wiki pages linked from
   `index.md` are ever loaded.
2. **Declare task gates.** Edit `workspace/report/registry/context-rules.json` — for each
   `taskType`, list the required canonical files and linked wiki concepts.
3. **Run the gateway.** Either `docker compose up --build` (see below) or run it directly
   (see [MCP Without Docker](#mcp-without-docker)).
4. **Build the index once** after first boot:
   `curl -X POST http://127.0.0.1:8797/api/index/refresh`.
5. **Wire agents.** Copy `templates/AGENTS.md` into your project root. Agents must call
   `context_status` → `context_bundle` → `validate_context` **before** planning or writing,
   and stop on `blocked_missing_sources` / `wiki_drift_detected` / `conflict_needs_user`.
6. **Humans watch** at `http://127.0.0.1:8797/dashboard` (sources, issues, mindmaps, drift).

### B. Orchestration layer (multi-agent, optional)

Only add this once the context layer works. Full guide: [`docs/06-orchestrator.md`](docs/06-orchestrator.md).

1. **Register your agents.** Copy `templates/agent-registry.json`, rename the agent ids to
   your real CLIs, set each `runnerPath` to a **non-interactive** runner script under an
   allowed root (e.g. `gateway/scripts/runners/`), and `enabled: true` only after the
   runner is verified executable.
2. **Open a session** and let agents coordinate through cards
   (`session_open` → `session_append` → `session_claim_role`). Routine round-by-round
   updates go **only** through the session channel — never `reports/` or `checkpoints/`.
3. **Watch and control** live at `http://127.0.0.1:8797/orchestrator`: see running spawns,
   locks, and events; use **Pause / Session kill / Agent kill / Hard stop** at any time.
4. **Roles are self-declared.** An agent claims `lead` / `worker` (never `coordinator` —
   that is the human) via `session_claim_role`, limited by its registry `capabilities`.

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

## Cautions & Safety (ข้อควรระวัง)

Read these before running the gateway on anything real.

**Security**

- **Never expose the gateway to the LAN or internet.** Bind to `127.0.0.1` only. There is
  no auth on the dashboards or API — it assumes a single, local, trusted user.
- **No raw secrets.** Manage env through `env_set` / `env_sync` (audited); `env_list` /
  `env_get` surface presence and metadata only. Never print secret values or edit `.env`
  ad hoc. Keep real secrets out of git.
- **Runner allow-root.** Every `runnerPath` in the registry must resolve inside an allowed
  root and be executable. A path outside it is rejected — never point a runner at an
  arbitrary or user-supplied script.

**Orchestration**

- **Runners must be non-interactive.** A spawned agent has no TTY. If its CLI blocks on an
  approval prompt it will hang and the orchestrator will see a timeout loop — pass the
  CLI's "bypass approval / auto-approve" flag.
- **Keep a human in control.** Know the kill switches before you start a live run:
  Pause (no new spawns), Session/Agent kill, and Hard stop (kill everything + flip to
  dry-run). Bind order matters — verify `/api/orchestrator/status` responds first.
- **Paid runs must clean up.** Any run that spends money or touches paid infrastructure has
  to end with an explicit cleanup step **and** a verification check. Never leave a paid run
  silently alive.
- **Cards are not proof.** A session card is a coordination signal, not evidence that work
  happened — verify the referenced code, logs, or artifact before trusting a result.

**Data & drift**

- **Refresh the index** after editing sources, or agents read stale context
  (`POST /api/index/refresh` or the `refresh_index` tool).
- **Report wins over Wiki.** On a conflict the tools return `conflict_needs_user` /
  `wiki_drift_detected` — stop and ask; do not silently overwrite. Fix Report first, Wiki after.
- **Discipline the context rules.** Too-narrow gates drop important files; too-wide gates
  flood agents with tokens. Tune `context-rules.json` deliberately.
- **JSON file storage** is single-host and serialized in memory — fine for local use, but
  migrate to a real DB past ~1000 active sessions. No clustering, no multi-process.

## Core Rule

```text
Canonical Report owns truth.
Wiki owns navigation.
Gateway owns access speed.
MCP owns agent interface.
Dashboard owns human visibility.
Session Channel owns agent-to-agent handoff.
Kill Switch owns human control.
```

## Next Steps For A New Project

1. Copy this folder into a new GitHub repository.
2. Replace `workspace/report/README.md` with your project source-of-truth.
3. Replace `workspace/wiki/index.md` with your concept map.
4. Edit `workspace/report/registry/context-rules.json`.
5. Copy `templates/AGENTS.md` into the project root and adjust paths/tool names.
6. Build the gateway only when needed, then register the MCP command from `gateway/dist/mcp-server.js`.
7. Tell agents to call `context_bundle` and `validate_context` before planning or writing.

### Adopting the orchestration layer (optional)

The core gateway ships only the passive context tools. To turn ContextForge into a
multi-agent command center, follow [`docs/06-orchestrator.md`](docs/06-orchestrator.md):

8. Copy `templates/agent-registry.json`, rename the agent ids, and point each `runnerPath`
   at a non-interactive runner script under an allowed root.
9. Add the session store + `session_*` tools, then the `orchestrator` / `agent-registry` /
   `runner` modules, and wire the `/orchestrator` dashboard + SSE endpoints.
10. Keep the route state machine pure and unit-test the routing table before going live.
11. Bind the dashboard to `127.0.0.1` only, and make every paid run end with cleanup + verify.
