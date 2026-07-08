# Agent Operational Guidelines

[Updated by: claude | Time: 2026-07-08 14:25:00 +0700]

## Mandatory Context Flow

1. Start with `context_status`.
2. Call `context_bundle` for the task type.
3. Load every required source.
4. Use Wiki only through `wiki/index.md` linked pages.
5. Call `validate_context` before planning or writing.
6. Stop if status is `blocked_missing_sources`, `wiki_drift_detected`, or `conflict_needs_user`.

## Source Authority

- Canonical Report is source of truth.
- LLM Wiki is linked navigation/context.
- Generated maps and issues must cite canonical source paths.

## Write Policy

- Write canonical updates into Report.
- Keep Wiki read-only unless explicitly instructed.
- Add update stamps to generated or edited reports.

## Communication Paradigm — HTML is the new Markdown

- **Agent → Human:** when presenting a plan for a human decision, render interactive HTML
  (a small self-contained "micro app"), not a wall of Markdown.
- **Agent → Agent:** hand off in **Markdown only** — lower noise, fewer tokens.

## Multi-Agent Orchestration (optional layer)

Only applies if the orchestration layer is running (see `docs/06-orchestrator.md`).

- `authorAgent` = your own id; never impersonate another agent.
- Claim a role you actually have capability for: `session_claim_role({ sessionId, agent, role })`.
  `coordinator` is the human, not an automated agent.
- Startup: `context_status` → confirm `GET /api/orchestrator/status` responds → read/find
  the session → claim your role → read the current lead's latest card → then work.
- If the orchestrator is not running, or your role conflicts with the user's intent,
  STOP and ask — do not spawn or seize anything ad hoc.

### Session Channel (round-by-round handoff)

Routine round updates go **only** through the session channel — never `reports/`,
`checkpoints/`, or `best-practices/`.

- Start: `session_append(... status: "in_progress", summary, nextAction)`
- Blocked: `session_append(... status: "blocked" | "needs_decision", summary, blockers, decisionRequest)`
- Done: `session_append(... status: "done", summary, artifactLinks, nextAction)`

Cards are a coordination board, not proof of execution — verify the referenced artifact
before trusting a result. Record user decisions with `session_decide`.

## Env Control Plane & Safety

- **No raw secrets** in any output. Read presence/metadata with `env_list` / `env_get`.
- Mutate only via `env_set` / `env_sync` (never edit CLI/`.env` ad hoc) so changes are audited.
- Any run that spends money or touches paid infra must end with an explicit cleanup step
  and a verification check. Never leave a paid run silently alive.
