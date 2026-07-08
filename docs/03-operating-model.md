# Operating Model

[Updated by: claude | Time: 2026-07-08 14:25:00 +0700]

## Roles

Canonical Report:

- Architecture decisions.
- Cross-project analysis.
- Current blockers.
- Handoffs and checkpoints.
- Generated maps and issue registry.

LLM Wiki:

- Concept navigation.
- Business terms.
- Links to relevant pages.
- Read-only by default.

Gateway:

- Indexing.
- Context gates.
- MCP tools.
- Dashboards (context + orchestrator).
- Artifact creation.
- Agent dispatch + kill switches (orchestration layer).

Agent:

- Call `context_bundle`.
- Load required sources.
- Call `validate_context`.
- Stop if blocked or conflict appears.
- Write canonical updates back to Report.
- (Multi-agent) claim a role, then hand off through the session channel.

## Task Gates

Example task types:

- `architecture`
- `feature_plan`
- `backend_change`
- `issue_update`
- `mindmap_create`
- `release_handoff`

Each task type should define:

- required canonical files
- linked wiki concepts
- optional source folders
- conflict behavior

## Multi-Agent Roles (self-declared)

The orchestration layer routes work by the role each agent **claims for itself**, not by a
fixed assignment. An agent claims a role on a session (`session_claim_role`), and the
router prefers the session's `participants` map over any session-level default.

- `lead` — plans, routes work, reviews the worker's output.
- `worker` — executes according to the plan.
- `coordinator` — the human decision-maker; not an automated role.

An agent may only claim a role its registry `capabilities` allow. Claiming a role it lacks
is a **permanent** dispatch failure (`lacks capability`), not a retry.

## Session Channel (round-by-round handoff)

The session channel is the **only** place for routine round-by-round updates between agents.
Do **not** use `reports/`, `checkpoints/`, or `best-practices/` for status pings.

Each round is a card with a `status`:

- `in_progress` — starting/continuing work (include `summary` + `nextAction`).
- `blocked` / `needs_decision` — include `blockers` and a `decisionRequest`; the router
  pauses and waits for a human.
- `done` — include `summary`, `artifactLinks`, and the `nextAction` for whoever is next.

Cards are a coordination board, **not proof of execution**. Before trusting a result,
verify the referenced code, command output, logs, or durable artifact.

Reserve `checkpoints/` for durable pause/handoff outside the active session flow, and
`best-practices/` for canonical knowledge worth keeping permanently. Record user decisions
with `session_decide` so they become first-class artifacts.

## Kill Switch Discipline

The human always keeps control of running agents through the orchestrator:

- **Pause** stops new spawns; running ones finish.
- **Session / Agent kill** stops a specific run and clears its lock.
- **Hard stop** kills everything, flushes locks, and flips the system to dry-run.

Any run that spends real money or touches paid infrastructure must end with an **explicit
cleanup step and a verification check** — never leave a paid run silently alive.

## Drift Policy

If Wiki and Report disagree:

1. Mark `wiki_stale` or `conflict_needs_user`.
2. Do not mark context as clean.
3. Use Report as canonical unless the user explicitly changes the source of truth.
4. Update Wiki only after Report is corrected.

## Env Control Plane

Environment variables are managed through the gateway, not edited ad hoc, so every change
is validated and audited:

1. **No raw secrets** ever leave the gateway — surface presence and metadata only.
2. Read with `env_list` / `env_get`; mutate only with `env_set` / `env_sync`.
3. Protected/critical secrets require an explicit reason to sync to a remote source.
4. Run `env_audit` to detect drift between sources; protected deletes are blocked by policy.

## Stamp Policy

Every generated or updated report should include:

```text
[Updated by: <agent> | Time: YYYY-MM-DD HH:MM:SS +0700]
```
