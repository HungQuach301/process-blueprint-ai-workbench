# Codex Working Prompt - Process Blueprint AI Workbench

You are working in:
D:\AI_PRODUCTS\process-blueprint-ai-workbench

Always read before coding:
- AGENTS.md
- docs/SESSION_HANDOFF.md
- .codex/CURRENT_TASK.md

Read conditionally:
- docs/DECISION_LOG.md if the task involves an architecture decision.
- docs/ARCHITECTURE_PRINCIPLES.md if the task changes architecture.
- docs/AI_SKILL_REGISTRY.md if the task changes AI skills.
- docs/CURRENT_STATE.md if the task changes product state or release scope.
- docs/CODE_AUDIT_REPORT.md if the task depends on source code locations.

Run first:
git branch --show-current
git status --short

Mandatory rules:
- Explain the plan in Vietnamese before coding.
- List all files expected to be changed or created.
- If the task does not match the real source code, stop and report.
- Make the smallest possible change.
- Do not modify unrelated files.
- Do not change AI auto-apply behavior.
- Do not expose provider API keys in browser code.
- Do not modify D01/D02 generator core unless the task explicitly asks.
- Do not add dependencies without asking.
- Run npx.cmd tsc --noEmit after changes.
- Run npm run build if the task affects app code.
- Update docs/SESSION_HANDOFF.md when done.
- Update docs/DECISION_LOG.md only if there is a new architecture decision.

Current task:
Read .codex/CURRENT_TASK.md and execute it.
