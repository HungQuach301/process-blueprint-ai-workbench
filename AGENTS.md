# Agent Working Guide

## 1. Always explain plan before coding

Before making changes, explain the implementation plan in simple Vietnamese.

The plan should include:

- What will be changed
- Why it is needed
- What will not be changed
- How the result will be verified

## 2. Always list files to modify

Before coding, list every file expected to be created or modified.

If a new file becomes necessary during implementation, mention it before editing.

## 3. Make smallest possible change

Prefer the smallest change that satisfies the request.

Avoid broad refactors, framework changes, or cleanup outside the requested scope.

## 4. Do not modify unrelated files

Do not touch unrelated modules, formatting, generated files, or dependency files unless required by the task.

If a file is already dirty, preserve existing user changes.

## 5. Process Task Register is single source of truth

The Process Task Register is the primary source for generated artifacts.

D01 BPMN, D02 Service Blueprint, QA Report, JSON exports, and ZIP package should be derived from ProcessTask data and selected templates.

Do not introduce a second process definition source unless explicitly requested.

## 6. Enterprise/banking data safety principles

Assume banking and enterprise process data may be sensitive.

Principles:

- Avoid sending data to external services unless explicitly approved.
- Do not log sensitive business data unnecessarily.
- Keep generated artifacts traceable to source fields.
- Preserve actor, system, data object, SLA, risk/control, and review status fields.
- Prefer deterministic generation over hidden or non-repeatable behavior.
- Make review states and assumptions explicit.

## 7. Current phase priorities

Current priority is the next AI Input Brief phase.

Focus areas:

- Simplified AI Input Brief with 7 visible sections.
- Vietnamese/English UI readiness.
- Input Brief to Draft Process Task Register workflow.
- Skill-ready architecture for future AI capabilities.

Product direction:

- Support both individual users and organization users.
- Support Vietnamese and English users.
- Prepare for future BYOK, Product AI, and Enterprise AI modes.
- Keep human-in-the-loop approval as the default workflow.

## 8. Architecture principles for AI/i18n readiness

Use these principles unless the user explicitly asks otherwise:

- Internal data keys should remain English and canonical.
- UI labels should come from i18n dictionaries instead of hardcoded mixed-language labels when adding new user-facing UI.
- BPMN enum values should remain canonical, for example `startEvent`, `userTask`, `serviceTask`, `sendTask`, `exclusiveGateway`, and `endEvent`.
- AI output must go through Draft -> Preview -> User Apply.
- Do not auto-apply AI output.
- Do not call external AI APIs in this phase.
- Preserve the Process Task Register as the single source of truth.

## 9. D01 BPMN rules

D01 BPMN should:

- Use `ProcessTask[]` and selected BPMN `TemplateProfile`.
- Generate valid BPMN 2.0 XML.
- Include `bpmn:definitions`, `bpmn:collaboration`, `bpmn:participant`, `bpmn:process`, and `bpmn:laneSet`.
- Map BPMN types consistently and keep enum values canonical:
  - `startEvent` -> `bpmn:startEvent`
  - `endEvent` -> `bpmn:endEvent`
  - `userTask` -> `bpmn:userTask`
  - `serviceTask` -> `bpmn:serviceTask`
  - `sendTask` -> `bpmn:sendTask`
  - `exclusiveGateway` -> `bpmn:exclusiveGateway`
- Generate sequence flows from:
  - `defaultNextStep`
  - `yesNextStep`
  - `noNextStep`
- Skip missing next step references instead of crashing.
- Include BPMN DI shapes and edges for viewer/modeler compatibility.
- Keep actor/system/data linkage visible.
- Do not modify generator behavior casually; validate changes with sample data and a BPMN viewer.

## 10. D02 Service Blueprint rules

D02 Service Blueprint should:

- Use `ProcessTask[]` and selected Service Blueprint `TemplateProfile`.
- Generate draw.io compatible XML.
- Keep one ProcessTask as one card.
- Never merge multiple tasks into one card.
- Keep each task card as 3 joined boxes:
  - Header = actor
  - Middle = task name + BPMN type + manual/automatic nature
  - Footer = system/app
- Use phase columns.
- Use service blueprint rows from template rules, or default rows if missing.
- Avoid overlapping cards.
- Use dynamic row height when a row/phase has many cards.
- Keep output compatible with diagrams.net.

## 11. Testing checklist

For every implementation, run the relevant subset of this checklist:

- TypeScript:
  - `npx.cmd tsc --noEmit`
- App availability:
  - Open `http://localhost:3000`
- Process Task Register:
  - Edit a cell
  - Add row
  - Duplicate row
  - Delete row
  - Save
  - Refresh
  - Reset
- Template Library:
  - Edit profile
  - Save
  - Select D01 template
  - Select D02 template
  - Refresh
  - Reset
- QA:
  - Create a known issue
  - Confirm issue count changes
  - Click issue and confirm row highlight
  - Download QA Report
- D01 BPMN:
  - Generate XML
  - Confirm preview renders
  - Download `.bpmn`
  - Open in Camunda Modeler when possible
- D02 Service Blueprint:
  - Generate XML
  - Download `.drawio`
  - Open in diagrams.net when possible
  - Check cards do not overlap
- Export Center:
  - Generate all artifacts
  - Confirm statuses are Fresh/Stale/Not generated as expected
  - Download ZIP
  - Confirm ZIP contains all expected files
## 12. Product Strategy Context

This repository belongs to Process Blueprint AI Workbench.

The product direction is:

AI Process & Spec Workbench for business-to-software delivery.

The product helps PO, BA, SA, Product Manager, Business Architect, and Solution Architect convert business intent, process notes, files, AI conversations, and requirements into controlled, traceable delivery artifacts.

The product is not just a BPMN/BRD/SRS generator. The moat is:
- Artifact Graph
- Traceability Matrix
- Quality Gates
- Domain Packs
- Human-in-the-loop approval
- AI Coding Spec export
- Local-first / BYOK / enterprise-ready governance

## 13. Required context files

Before implementation work, read:

1. `AGENTS.md`
2. `docs/CURRENT_STATE.md`
3. `docs/PRODUCT_CONTEXT.md`
4. `docs/PRODUCT_NORTH_STAR.md`
5. `docs/SCOPE_AND_MODULES.md`
6. `docs/ARCHITECTURE_PRINCIPLES.md`
7. `docs/ROADMAP.md`
8. `docs/NEXT_IMPLEMENTATION_PLAN.md`
9. `docs/DECISION_LOG.md`
10. `docs/SESSION_HANDOFF.md`

For AI-related work, also read:

- `docs/AI_ARCHITECTURE_DESIGN.md`
- `docs/AI_INPUT_BRIEF_DESIGN.md`
- `docs/AI_QA_ENGINE_DESIGN.md`
- `docs/AI_RECOMMENDATION_ENGINE_DESIGN.md`
- `docs/AI_TEMPLATE_REVIEW_DESIGN.md`
- `docs/AI_SKILL_REGISTRY.md`

## 14. Work session ritual

At the start of each task:

1. Run `git status --short`.
2. Read the required context files.
3. Summarize the current state in Vietnamese.
4. Explain the implementation plan in Vietnamese.
5. List expected files to modify.
6. Make the smallest possible scoped change.
7. Run relevant checks, especially `npx.cmd tsc --noEmit`.
8. Update `docs/SESSION_HANDOFF.md` if the task changes project state.
9. Update `docs/DECISION_LOG.md` if a product or architecture decision is made.

## 15. Current architecture direction

The product should evolve toward Artifact Graph-centric architecture.

Process Task Register remains the canonical model for process artifacts, but not every future feature must start from Process Task Register.

Future features such as BRD, SRS, User Stories, UI Spec, Solution Spec, Business Architecture, IT Architecture, and AI Coding Pack should be connected through Artifact and TraceLink models.

## 16. Real AI rule

Real AI can be used in MVP only through controlled server-side AI skill routes.

Never expose API keys in browser code.

AI output must go through:
Draft / Recommendation / Review Finding
→ Schema validation
→ Quality gate
→ Preview
→ User approval
→ Apply or export
→ Audit