# Removed session and orchestrator design

The session board, agent registry, CLI dispatcher, runners and automatic spawning were removed on 2026-11-07. They are not part of ContextForge's supported architecture. Agents use the shared `AGENTS.md` policy and work in roles assigned by the user. ContextForge handles project context and reports; ContextForge Private Ops handles guarded production inspection and env control.
