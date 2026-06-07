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
- Use exactly the file paths listed in "Files expected to change" or "Allowed changed files".
- Do not create alternative filenames.
- If a required file path does not match the real source code, stop and report before coding.
- If you need to change a file not listed in the task, stop and ask first.
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
- Before final response, run git status --short and confirm only allowed files changed.

Current task:
Read .codex/CURRENT_TASK.md and execute it.
