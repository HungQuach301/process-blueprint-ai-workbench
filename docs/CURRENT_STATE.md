# Current State

## 1. Stable Baseline

Current stable baseline tag:

- `v0.5.0`

Current branch for the next phase:

- `feature/real-ai-integration`

Next phase goal:

- Integrate real AI safely.

## 2. Completed Modules

The following modules are considered completed in the current stable baseline:

- Process Task Register
- D01 BPMN
- D02 Service Blueprint
- QA Engine
- Recommendation Engine
- Feedback logging
- Template classification
- AI scaffolds
- Simplified AI Input Brief
- Local Audit Log

## 3. Product State

Process Blueprint AI Workbench is a client-side MVP for analyzing, standardizing, validating, and generating enterprise process artifacts.

Current product principles:

- Use Process Task Register as the single source of truth.
- Generate D01 BPMN, D02 Service Blueprint, QA Report, JSON exports, and ZIP package from `ProcessTask[]` and selected `TemplateProfile` data.
- Keep artifact generation deterministic, reviewable, and traceable to source fields.
- Preserve actor, system, data object, SLA, risk/control, and review status fields.
- Keep human-in-the-loop approval as the default workflow.
- Support Vietnamese and English users.
- Prepare for future BYOK, Product AI, and Enterprise AI modes.

## 4. Key Principle For Real AI Integration

Real AI integration must follow these rules:

- No API key in browser.
- AI output must use schema validation.
- AI output must go to Draft/Recommendation first.
- User approval is required before Apply.
- Do not auto-apply AI output.
- Do not introduce a second process definition source.
- Process Task Register remains the source of truth.
- External AI calls must be explicit, controlled, and compatible with the selected provider/data mode.
- Sensitive enterprise or banking data should not be sent to external services unless explicitly approved.

## 5. Current Architecture

Current architecture is a client-side Next.js MVP using App Router, React, TypeScript, and Tailwind CSS.

Main data flow:

```text
ProcessTask[] + TemplateProfile[]
  -> Rule-based QA
  -> Recommendation Engine
  -> D01 BPMN generator
  -> D02 Service Blueprint generator
  -> QA Report generator
  -> Export Center
```

Current local storage areas:

- `localStorage` for Process Task Register.
- `localStorage` for Template Profiles and selected D01/D02 templates.
- `localStorage` for artifact freshness status.
- `localStorage` for recommendation feedback.
- `localStorage` for local audit log entries.

Important boundaries:

- `src/lib/models/`: canonical data models.
- `src/lib/qa/`: rule-based QA entrypoints.
- `src/lib/recommendation-engine/`: recommendation types, factories, preview/apply operations, and feedback store.
- `src/lib/generators/`: deterministic artifact generators.
- `src/lib/ai/`: AI scaffolds and mock-only services.
- `src/lib/audit/`: local audit log foundation.
- `src/components/`: UI modules.

## 6. Files And Folders Codex Must Read First

For every new Codex session in this repository, read these first:

1. `AGENTS.md`
2. `docs/CURRENT_STATE.md`
3. `docs/AI_ARCHITECTURE_DESIGN.md`
4. `docs/AI_INPUT_BRIEF_DESIGN.md`
5. `docs/AI_QA_ENGINE_DESIGN.md`
6. `docs/AI_RECOMMENDATION_ENGINE_DESIGN.md`
7. `docs/AI_TEMPLATE_REVIEW_DESIGN.md`

For real AI integration work, also inspect these folders before editing:

- `src/lib/ai/`
- `src/lib/models/`
- `src/lib/qa/`
- `src/lib/recommendation-engine/`
- `src/lib/audit/`
- `src/components/`

For artifact generator work, also inspect:

- `src/lib/generators/`
- Existing D01/D02 sample data and template profiles.

Before any change, run:

```powershell
git status --short
```

## 7. AI Scaffold Status

AI scaffolds exist for future integration, but the current stable baseline does not call real external AI APIs from the browser.

Expected AI integration direction:

- Browser UI collects user input and displays draft/recommendation results.
- API keys and provider credentials must stay server-side or in a secure backend/runtime boundary.
- AI provider adapters must return typed data.
- AI output must be validated against schemas before entering Draft or Recommendation state.
- Invalid AI output must be rejected or converted into explicit review issues.
- Draft output must be previewed before user approval.
- Apply operations must be deterministic and auditable.

## 8. Current Limitations

Current product/runtime limitations:

- No production backend persistence yet.
- `localStorage` is still the main storage layer.
- No full auth, role model, or tenant isolation yet.
- Real AI provider integration is not implemented yet.
- Provider/data mode enforcement still needs production-ready boundaries.
- Schema validation for real AI output must be added before external AI is enabled.

Current AI limitations:

- Existing AI services are scaffold/mock-oriented.
- No API key handling should happen in browser code.
- No real model provider adapter should bypass schema validation.
- No AI output should directly mutate the Process Task Register.

## 9. Regression Test Checklist

Run the relevant subset of this checklist for every implementation.

TypeScript:

- `npx.cmd tsc --noEmit`

App availability:

- Open `http://localhost:3000`

Process Task Register:

- Edit a cell.
- Add row.
- Duplicate row.
- Delete row.
- Save.
- Refresh.
- Reset.

Template Library:

- Edit profile.
- Save.
- Select D01 template.
- Select D02 template.
- Refresh.
- Reset.

QA:

- Create a known issue.
- Confirm issue count changes.
- Click issue and confirm row highlight.
- Download QA Report.

D01 BPMN:

- Generate XML.
- Confirm preview renders.
- Download `.bpmn`.
- Open in Camunda Modeler when possible.

D02 Service Blueprint:

- Generate XML.
- Download `.drawio`.
- Open in diagrams.net when possible.
- Check cards do not overlap.

Export Center:

- Generate all artifacts.
- Confirm statuses are Fresh/Stale/Not generated as expected.
- Download ZIP.
- Confirm ZIP contains all expected files.

AI Input Brief:

- Fill the simplified 7-section brief.
- Generate Draft Process Task Register.
- Preview draft output.
- Confirm no automatic Apply occurs.
- Apply only after explicit user approval.

Real AI integration, when enabled:

- Confirm no API key is exposed in browser code or client bundles.
- Confirm AI request uses the intended provider/data mode.
- Confirm AI response passes schema validation.
- Confirm invalid AI response is blocked.
- Confirm AI output enters Draft/Recommendation first.
- Confirm Apply requires user approval.
- Confirm audit log records the relevant AI metadata without storing unnecessary sensitive data.

## 10. Continuation Notes

When continuing development:

- Keep changes small and scoped.
- Do not modify application code for documentation-only tasks.
- Do not modify D01/D02 generators unless explicitly requested.
- Do not call external AI APIs until secure provider/data mode boundaries exist.
- Keep UI labels ready for i18n when adding user-facing UI.
- Keep internal data keys English and canonical.
- Keep BPMN enum values canonical, for example `startEvent`, `userTask`, `serviceTask`, `sendTask`, `exclusiveGateway`, and `endEvent`.

Always remember:

```text
Process Task Register is the source of truth.
AI creates drafts or recommendations.
User approval is required before Apply.
```
