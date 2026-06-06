# Current State

## 1. Stable Baseline

Current tag:

- `v0.8.0-pre-review`

Current branch for the next phase:

- `feature/m2-m3-full-ai` (release target: `v0.8.0-mvp1-ai`)

## 2. Completed Modules

- Process Task Register (single source of truth)
- D01 BPMN, D02 Service Blueprint generators
- Rule-based QA + Recommendation Engine + Template Recommendation Engine
- AI Skill layer v2 (skill-registry-v2, skill-schemas, prompt-packs)
- Real AI provider layer: OpenAI + Claude + product-ai + mock via provider-factory
- Structured Output via provider json_schema (output-schemas)
- Eval harness (evals/): input-brief-to-ptr, process-improvement-recommendation, artifact-review
- Token + latency + estimatedCostUsd tracking in audit log
- JSON self-repair on malformed provider output
- Local Audit Log + feedback logging

## 3. Product State

Process Blueprint AI Workbench is a client-side Next.js MVP for analyzing, standardizing, validating, and generating enterprise process artifacts.

Current product state:

- Process Task Register remains the single source of truth.
- D01 BPMN, D02 Service Blueprint, QA Report, JSON exports, and ZIP package are generated from `ProcessTask[]` and selected `TemplateProfile` data.
- Rule-based QA and Recommendation Engine are available.
- AI Input Brief can produce Draft PTR through mock or server-side real AI path.
- AI QA can produce `QARecommendation[]` through mock or server-side real AI path.
- AI Template Review can produce `TemplateRecommendation[]` and optional `TemplateQualityScore` through mock or server-side real AI path.
- AI outputs are routed to draft, recommendation, or review surfaces before any user action.

## 4. Key Principles

All AI work must follow these principles:

- No API key in browser.
- No auto-apply AI output.
- AI output must pass schema and quality gates.
- User approval is required before applying changes.
- Audit every AI action.
- Process Task Register remains the source of truth for generated artifacts.
- Template review recommendations are shown for human review and are not auto-applied.

## 5. Current Architecture

Current architecture is a client-side Next.js app with server-side API routes for real AI provider calls.

Main deterministic flow:

```text
ProcessTask[] + TemplateProfile[]
  -> Rule-based QA
  -> Recommendation Engine
  -> D01 BPMN generator
  -> D02 Service Blueprint generator
  -> QA Report generator
  -> Export Center
```

Current AI-assisted flow:

```text
User action
  -> /api/ai/run-skill
  -> server-side provider adapter when enabled
  -> schema / quality validation
  -> Draft or Recommendation or Template Review UI
  -> user review
  -> explicit Apply only where supported
```

Important boundaries:

- `src/lib/models/`: canonical data models.
- `src/lib/ai/`: AI request/response types, mock services, provider adapters.
- `src/lib/ai-intake/`: Input Brief to Draft PTR generation and validation.
- `src/lib/quality-engine/`: AI Draft PTR quality gates.
- `src/lib/qa/`: rule-based QA entrypoints.
- `src/lib/recommendation-engine/`: QA Recommendation schema, preview/apply, feedback logging.
- `src/lib/template-recommendation-engine/`: Template Recommendation schema validation.
- `src/lib/generators/`: deterministic artifact generators.
- `src/lib/audit/`: local audit log foundation.
- `src/components/`: UI modules.
- `src/app/api/ai/run-skill/route.ts`: server-side AI skill route.

## 6. Current AI Paths

Implemented AI skill paths:

- `input-brief-to-ptr`
  - Input: `StructuredProcessBrief`
  - Output: Draft Process Task Register
  - Apply behavior: user preview and explicit apply only

- `ai-process-qa`
  - Input: `ProcessTask[]`, rule-based QA issues, selected template metadata
  - Output: `QARecommendation[]`
  - Apply behavior: existing Recommendation Engine preview/apply workflow

- `ai-template-review`
  - Input: selected `TemplateProfile`, `outputType`, `processType`, `businessDomain`
  - Output: `TemplateRecommendation[]`, optional `TemplateQualityScore`
  - Apply behavior: display only in this phase; no auto-apply

Feature flags:

- `ENABLE_REAL_AI`
- `ENABLE_REAL_AI_QA`
- `ENABLE_REAL_AI_TEMPLATE_REVIEW`

Default behavior should remain mock/local unless the relevant flag is enabled and server-side provider settings are configured.

## 7. Next Priority

- Bài 4: Provider Routing & Cost — advisor strategy (OpenAI executor + Claude advisor), skill x provider matrix, per-skill cost ceiling
- Semantic self-correct loop (beyond JSON repair) + scoring (Bài 6 / Outcomes)
- Expand eval coverage to more skills + semantic criteria (Bài 5)
- PII masking before any cloud call + hard enforcement of data usage mode (Bài 12)
- Module 3 Product Delivery real-AI skills (BRD/SRS/user stories/Jira)

## 8. Files And Folders Codex Must Read First

For every new Codex session in this repository, read these first:

1. `AGENTS.md`
2. `docs/CURRENT_STATE.md`
3. `docs/AI_ARCHITECTURE_DESIGN.md`
4. `docs/AI_INPUT_BRIEF_DESIGN.md`
5. `docs/AI_QA_ENGINE_DESIGN.md`
6. `docs/AI_RECOMMENDATION_ENGINE_DESIGN.md`
7. `docs/AI_TEMPLATE_REVIEW_DESIGN.md`

For real AI integration work, also inspect:

- `src/app/api/ai/run-skill/route.ts`
- `src/lib/ai/`
- `src/lib/ai-intake/`
- `src/lib/quality-engine/`
- `src/lib/recommendation-engine/`
- `src/lib/template-recommendation-engine/`
- `src/lib/audit/`
- Relevant UI component under `src/components/`

Before any change, run:

```powershell
git status --short
```

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
- Run mock AI Template Review.
- Confirm recommendations display.
- Confirm no template changes are auto-applied.
- Refresh.
- Reset.

QA:

- Create a known issue.
- Confirm issue count changes.
- Click issue and confirm row highlight.
- Run mock AI QA.
- Confirm AI recommendations appear with rule recommendations.
- Apply an AI recommendation only after confirmation.
- Download QA Report.

AI Input Brief:

- Fill the simplified 7-section brief.
- Generate Draft Process Task Register.
- Confirm schema/quality gate errors block invalid output.
- Preview valid draft output.
- Confirm no automatic Apply occurs.
- Apply only after explicit user approval.

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

Real AI integration, when enabled:

- Confirm no API key is exposed in browser code or client bundles.
- Confirm AI request uses the intended server-side provider route.
- Confirm AI response passes schema validation.
- Confirm invalid AI response is blocked.
- Confirm AI output enters Draft, Recommendation, or Template Review first.
- Confirm Apply requires user approval where Apply is supported.
- Confirm audit log records relevant AI metadata without storing unnecessary sensitive data.

## 10. Continuation Notes

When continuing development:

- Keep changes small and scoped.
- Do not modify application code for documentation-only tasks.
- Do not modify D01/D02 generators unless explicitly requested.
- Do not call external AI APIs from browser code.
- Keep API keys server-side only.
- Keep UI labels ready for i18n when adding user-facing UI.
- Keep internal data keys English and canonical.
- Keep BPMN enum values canonical, for example `startEvent`, `userTask`, `serviceTask`, `sendTask`, `exclusiveGateway`, and `endEvent`.

Always remember:

```text
Process Task Register is the source of truth.
AI creates drafts, recommendations, or review findings.
User approval is required before applying changes.
```
