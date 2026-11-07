# Shared agent rules for a ContextForge project

Use this file as the common policy for every agent vendor. Vendor-specific files identify the agent and tool syntax only.

1. Call `context_status`, select a `projectId`, then call `context_bundle` for the task type or `context_find` for targeted discovery. Cross-project search requires explicit user intent.
2. Read only selected source IDs or headings with `context_read`. Call `validate_context` before work that requires several canonical sources. Unknown task types and missing required sources block execution.
3. Treat the project's Report as canonical and the linked Wiki as context. Verify code and artifact evidence before claiming implementation or release readiness.
4. After changing canonical sources, call `refresh_index`. Stamp edited canonical report files with agent identity and local time.
5. Use `report_create` for new human-facing HTML reports, with structured sections and source references. Use `report_list` for history. Agent handoffs may use concise Markdown.
6. Production controls belong in a separate private MCP. Never expose raw secrets or personal records. Follow protected mutation, scope, audit, and paid-resource cleanup rules defined by the project.
7. Agents work in roles assigned by the user. No session board, CLI dispatcher, automatic role claim, or agent spawning is part of ContextForge.

[Updated by: codex | Time: 2026-11-07 16:34:00 +0700]
