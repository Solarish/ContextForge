# Agent Rules Template

[Updated by: claude | Time: 2026-07-08 14:25:00 +0700]

Use this policy in `AGENTS.md` or equivalent project instructions. The first block is the
minimum (context layer); the second block applies only if you run the orchestration layer.

```md
# Agent Context Rules

## Source Order

1. Call `context_status`.
2. Call `context_bundle` with the correct task type.
3. Load all required canonical sources.
4. Load only Wiki pages linked from the Wiki index.
5. Call `validate_context`.
6. If blocked or a conflict is returned, stop and ask the user.

## Canonical Rule

Canonical Report is the source of truth.
LLM Wiki is linked context only.
Generated maps and issue registry must link back to canonical sources.

## Write Policy

Write reports, issues, maps, and handoffs into Canonical Report.
Do not write into Wiki unless the user explicitly asks for a Wiki update.

## Required Stamp

Every changed report must include:

[Updated by: <agent> | Time: YYYY-MM-DD HH:MM:SS +0700]
```

## Multi-Agent Rules (orchestration layer)

```md
# Agent Orchestration Rules

## Identity

- `authorAgent` = your own agent id. Never impersonate another agent.
- `role` = a role your registry `capabilities` allow (`lead` / `worker` / `coordinator`).
  `coordinator` is the human; do not claim it unless explicitly authorized.

## Startup Sequence (multi-agent task)

1. Call `context_status` — check gateway health and mounts.
2. Confirm the orchestrator/gateway is running (e.g. `GET /api/orchestrator/status`).
   If it does not respond, STOP and ask the user to start it — do not spawn it ad hoc.
3. Have a session id? `session_read` it. Otherwise `session_list` to find the active
   session for this task (or `session_open` if the user asked for a new one).
4. `session_claim_role({ sessionId, agent, role })` before doing any work — this clears
   the lock and re-runs routing.
5. Read the current lead's latest card before you start.
6. If the claimed role conflicts with the user's intent, or the intended lead is disabled
   in the registry, STOP and ask. Do not seize a role.

## Session Card Protocol

Starting work:
  session_append(sessionId, authorAgent, role, status: "in_progress",
                 summary, nextAction)

Blocked / needs a decision:
  session_append(sessionId, authorAgent, role, status: "blocked" | "needs_decision",
                 summary, blockers: [...], decisionRequest)

Done:
  session_append(sessionId, authorAgent, role, status: "done",
                 summary, artifactLinks: [...], nextAction)

## Anti-Patterns

- Do NOT create a checkpoint for a routine round update — use session_append.
- Do NOT write reports/ or best-practices/ for status pings — use session cards.
- DO use checkpoints only for durable pause/handoff outside the session flow.
- DO use best-practices/ only for permanent canonical knowledge.
- DO record user decisions with session_decide.

## Env & Safety

- No raw secrets in output. Read with env_list / env_get; mutate only via env_set / env_sync.
- Any run that spends money must end with an explicit cleanup step + verification.
```
