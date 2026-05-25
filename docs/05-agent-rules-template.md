# Agent Rules Template

[Updated by: codex | Time: 2026-05-25 08:54:27 +0700]

Use this policy in `AGENTS.md` or equivalent project instructions.

```md
# Agent Context Rules

## Source Order

1. Call `context_status`.
2. Call `context_bundle` with the correct task type.
3. Load all required canonical sources.
4. Load only Wiki pages linked from Wiki index.
5. Call `validate_context`.
6. If blocked or conflict is returned, stop and ask the user.

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

