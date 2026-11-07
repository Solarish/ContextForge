# Agent rule template

Copy `templates/AGENTS.md` into a project and adjust only project-specific source authority and production safety constraints. Keep vendor files short and point them to `AGENTS.md`. Register the project's `projectId`, Report root, Wiki root and context rules. Agent startup: `context_status` → `context_bundle` or `context_find` → targeted `context_read` → `validate_context` when required. New HTML reports go through `report_create`.
