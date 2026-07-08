# Orchestrator (Multi-Agent Local Dispatcher)

[Updated by: claude | Time: 2026-07-08 14:25:00 +0700]

This document describes the **optional orchestration layer** that turns ContextForge
from a passive context gateway into an active **multi-agent command center**. It is a
genericized distillation of a production system; adapt names, ports, and paths to your
project.

The orchestrator is **merged into the gateway process** — no separate daemon. When you
run the gateway, you also get the dispatcher, the live dashboard, and the kill switches
in one place, one failure domain.

## 0. Why an orchestrator

| Passive gateway (context only) | Orchestrated gateway |
|--------------------------------|----------------------|
| Human copies context to each agent by hand | Agents pull context and hand off to each other through a shared board |
| No record of who is doing what right now | Live `runningSpawns` map + dashboard |
| Multiple agents = multiple terminals to babysit | One board, one set of kill switches |
| Polling for "is it my turn?" wastes CPU | Event-driven dispatch (~ms after a card is posted) |
| Agent allowlist hardcoded | Pluggable `agent-registry.json` with hot reload |

## 1. Process topology

Everything runs inside **one** Node process:

```text
gateway (node/tsx src/server.ts)
├── HTTP server        (port 8797 — REST API + /orchestrator UI + SSE stream)
├── MCP gateway        (Center/Report tools over stdio in mcp-server.ts)
├── Orchestrator loop  (in-process: boot recovery sweep + safety sweep + fs.watch)
└── Process registry   (in-memory Map<spawnId, ChildProcess> + Map<spawnId, RunningSpawn>)
```

## 2. Trigger model — hybrid

Dispatch is primarily **event-driven**, with two backups so a missed event never stalls
work:

| Layer   | Mechanism                                                   | Latency | Purpose |
|---------|------------------------------------------------------------|---------|---------|
| Primary | Session mutation hook → `onSessionMutated(id)` → `processSession(id)` | ms      | Happy path: agent posts a card → orchestrator dispatches the next agent |
| Backup A| `fs.watch` on the sessions JSON (debounced ~500ms)         | ≤ 1s    | Catch external edits (manual JSON, git pull, direct writes) |
| Backup B| Safety sweep every ~60s (`processAllSessions`)             | ≤ 60s   | Cover platform watcher misses + eventual consistency |
| Boot    | Startup recovery sweep + `clearStaleLocks()` (> 5 min)     | once    | Resume in-flight work after a restart |

## 3. State machine — `evaluateSessionRoute()`

A pure function maps `(session state, latest card)` → a **route intent** and a
**target agent**. Keep it pure and unit-tested; it is the brain of the system.

| Session state | Latest card | Route intent | Target agent |
|---------------|-------------|--------------|--------------|
| `archived` | — | `none` | — |
| `blocked` | any | `block` | — (wait for external unblock) |
| `needs_decision` / open decision request | any | `decision` | — (wait for user) |
| `active` + newer decision, `nextOwner != user` | — | `execute` | `decision.nextOwner` |
| `active` + no card yet | — | `execute` (start) | `participants[lead]` ?? `leadAgent` |
| `active` + latest = lead card with `nextAction` | — | `execute` (route) | `participants[worker]` ?? `workerAgent` |
| `done` / latest = worker `done` | — | `review` | `participants[lead]` ?? `leadAgent` |

**Self-declared roles (the key V2 idea):** `session.participants: Record<agent, role>`
stores the role each agent **claimed for itself**. Routing prefers `participants` over the
session-level `leadAgent`/`workerAgent`. Agents claim via the `session_claim_role` MCP
tool or `POST /api/sessions/:id/claim-role`. This decouples "who leads" from how the
session was opened — any registered agent can take `lead`, `worker`, or `coordinator` on a
per-session basis (subject to its registry `capabilities`).

## 4. Locks & idempotency

Per-session locks live in `orchestrator-locks.json`. `processSession(id)`:

1. Read session → evaluate route.
2. `intent === none` → return.
3. If `lock.lockKey === route.lockKey` → skip (prevents double dispatch of the same state).
4. Write lock → dispatch.
5. Classify the dispatch result:
   - exit `0` → emit `dispatch_succeeded` (lock stays until state changes).
   - **transient** non-zero (timeout, spawn error) → emit `dispatch_failed` + `clearLock` (retryable).
   - **permanent** non-zero → emit `dispatch_failed · PERMANENT` + **keep the lock** (wait for a state change).
   - gate closed → emit `system_block` + **keep the lock** (wait for resume).

**Permanent failure patterns** (do not retry, they will just loop):
`concurrency limit`, `agent disabled` / `not spawnable` / `not in registry`,
`not in the explicit allowlist`, `runner is not executable or does not exist`,
`no runner configured`, `lacks capability`.

**Lock-release triggers:** spawn close/exit → reprocess waiting sessions;
`resumeAll()` → clear non-running locks + sweep; `claimRole()` → clear that session's
lock + retry; boot `clearStaleLocks()` (> 5 min); manual `forceClearLock(sessionId)`.

## 5. Agent registry

`agent-registry.json` (see `templates/agent-registry.json`) declares every agent that may
be dispatched. **Hot reloaded** via `fs.watch` — enable/disable an agent or change a
runner path without restarting the server.

```jsonc
{
  "version": 1,
  "agents": {
    "<agent_id>": {
      "runnerPath": "<abs path to a runner .sh under an allowed root>",
      "capabilities": ["lead", "worker", "coordinator"],
      "concurrencyLimit": 1,
      "enabled": true,
      "killSignal": "SIGTERM",
      "killGraceMs": 5000,
      "notify": ["needs_decision", "failure"],
      "model": "<model id, informational>",
      "description": "..."
    }
  },
  "notifications": { "macOs": true, "terminalBell": false }
}
```

**Security:** every `runnerPath` must resolve inside an allowed root
(e.g. `gateway/scripts/runners/`). Validate on load; a path outside the allow-root marks
the agent `validation.valid = false` and it is skipped. **Never** let the registry point a
runner at an arbitrary script.

**Runner scripts** spawn the *real* agent CLI as a child process and must run
**non-interactively** (no TTY exists under a spawn) — pass whatever "bypass approval /
auto-approve" flag your CLI needs, or the child hangs waiting for input and the
orchestrator sees a timeout loop.

## 6. Multi-level kill switch

Every kill action is audited to `orchestrator-audit.json`.

| Level     | API | Effect |
|-----------|-----|--------|
| Session   | `POST /api/orchestrator/kill { scope: "session", target }` | Kill that session's spawn(s) + clear its lock |
| Agent     | `POST /api/orchestrator/kill { scope: "agent", target }`   | Kill all spawns of one agent + clear their locks |
| Pause     | `POST /api/orchestrator/pause`                             | Close the gate: no new spawns, running ones continue |
| Resume    | `POST /api/orchestrator/resume`                            | Open the gate + clear non-running locks + sweep |
| Hard stop | `POST /api/orchestrator/kill { scope: "global" }`          | Pause + kill everything + flush locks + flip to dry-run |
| Force lock| `POST /api/orchestrator/lock/clear { sessionId }`         | Unblock one lock without killing a spawn |

**Kill sequence:** send `killSignal` to the **process group** (`process.kill(-pid, sig)`)
to catch stdio-blocked descendants → schedule `SIGKILL` after `killGraceMs` →
brief drain → force-cleanup the runtime map. Listen to **both** `close` and `exit` with a
`cleaned` flag so cleanup is idempotent.

## 7. Dashboard — `/orchestrator`

A single vanilla-JS + SSE page. Three columns under a control strip:

```text
┌──────────────────────────────────────────────────────────────────────┐
│ MODE  GATE  RUNNING  🔔needs_decision    │ Pause | Resume | Hard Stop │
├──────────────────┬───────────────────────┴──────────┬────────────────┤
│ Agent Registry   │  Session Board (active/blocked/   │ Live Events    │
│ ✓ agent_a (1/1)  │  needs_decision/done)             │ (SSE)          │
│ ✓ agent_b (0/1)  │  card → drawer → messages         │ Locks          │
│ [Kill agent]     │       → [Kill spawn]              │ System Health  │
│                  │                                   │ Audit Log      │
└──────────────────┴──────────────────────────────────┴────────────────┘
```

**SSE stream** (`GET /api/orchestrator/stream`) pushes frames: `tick`, `event`,
`spawn-started`, `spawn-finished`, `lock-changed`, `session-mutated`, `gate-changed`,
`registry-reloaded`, `audit`. The UI debounces (~150ms) before re-fetching state.

## 8. Files & data

**Source (`gateway/src/`):**
- `server.ts` — HTTP entry; boots the orchestrator inline and wires hooks.
- `orchestrator.ts` — state machine + `processSession` + dispatcher + failure classification.
- `orchestrator-runtime.ts` — in-memory runtime, kill primitives, SSE bus, audit log, notifications.
- `agent-registry.ts` — load + validate + hot-reload the registry.
- `runner.ts` — `spawnAgent`: registry lookup, concurrency check, executable check, redact, register spawn.
- `sessions.ts` — session CRUD with a serialized mutation queue (prevents races) + late-bound hooks.
- `mcp-server.ts` — MCP tools including `session_claim_role`.

**Data (`workspace/report/registry/`):**
- `agent-sessions.json` — canonical session store (includes `participants`).
- `agent-registry.json` — agent definitions.
- `orchestrator-locks.json` — per-session locks.
- `orchestrator-events.json` — dispatch event log (ring buffer).
- `orchestrator-status.json` — last tick snapshot.
- `orchestrator-audit.json` — user-action audit (kill/pause/resume/hard-stop/reload).

## 9. MCP tools & HTTP endpoints (orchestrator additions)

**New MCP tool:** `session_claim_role` — an agent declares its own role on a session.

**HTTP:**

| Method | Path | Purpose |
|--------|------|---------|
| GET  | `/orchestrator` | Dashboard UI |
| GET  | `/api/orchestrator/status` | mode + gateOpen + runningCount + last tick |
| GET  | `/api/orchestrator/running` | Live spawns (pid, agent, session, role, startedAt) |
| GET  | `/api/orchestrator/agents` | Registry + per-agent running count + validation |
| POST | `/api/orchestrator/registry/reload` | Force reload registry from disk |
| GET  | `/api/orchestrator/audit?limit=N` | User-action audit log |
| POST | `/api/orchestrator/pause` \| `/resume` | Gate control |
| POST | `/api/orchestrator/kill` | `scope = session \| agent \| global` |
| POST | `/api/orchestrator/lock/clear` | Force-clear one session lock |
| GET  | `/api/orchestrator/stream` | SSE event stream |
| POST | `/api/sessions/:id/claim-role` | HTTP equivalent of `session_claim_role` |

## 10. Known limitations (design honestly)

- **Local single-host only** — no clustering, no multi-process.
- **No dashboard auth** — bind to `127.0.0.1`; do not expose to the LAN.
- **No backoff yet** — transient errors clear the lock immediately; add a dead-man switch + exponential backoff before heavy production use.
- **No cost/token tracking** — add it if your agents report token counts via artifacts.
- **FIFO, no priority queue** — sessions dispatch by `updatedAt`.
- **JSON file storage** — single-file session store serialized via an in-memory queue; migrate to SQLite past ~1000 active sessions.

## 11. Adopting this layer

The current ContextForge gateway ships the **passive** tools
(`context_bundle`, `validate_context`, `search_sources`, …). This orchestration layer is
the documented **target**. To adopt it in your fork:

1. Add the session store + tools (`session_open/append/read/list/update/decide/claim_role`).
2. Add `orchestrator.ts` (state machine) + `orchestrator-runtime.ts` (kill/SSE/audit).
3. Add `agent-registry.ts` + drop your `agent-registry.json` (start from the template).
4. Wire the `/orchestrator` dashboard + SSE endpoints.
5. Write runner scripts under `gateway/scripts/runners/` — one per agent CLI, non-interactive.
6. Keep the state machine pure and unit-test the routing table first.
