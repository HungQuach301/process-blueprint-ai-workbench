# Task ID: 000-source-code-audit

## Task name

Source Code Audit & Baseline Check

## Estimated effort

Small / 30-60 minutes

## Dependencies

- None

## Goal

Audit the real source code before implementing QAFinding, GateVerdict, Provider Normalizer, or D01/D02 gates.

## Definition of Done

- [ ] docs/CODE_AUDIT_REPORT.md exists.
- [ ] Report identifies ProcessTask model file.
- [ ] Report identifies TemplateProfile model file.
- [ ] Report identifies QARecommendation schema file.
- [ ] Report identifies Rule QA entry point.
- [ ] Report identifies Draft PTR quality gate entry point.
- [ ] Report identifies /api/ai/run-skill/route.ts flow.
- [ ] Report identifies D01/D02 generator files.
- [ ] Report identifies Product Delivery Generate All logic.
- [ ] npx.cmd tsc --noEmit passes.
- [ ] npm run build passes.

## Files to inspect first

- AGENTS.md
- docs/SESSION_HANDOFF.md
- docs/DECISION_LOG.md
- docs/CURRENT_STATE.md
- docs/NEXT_IMPLEMENTATION_PLAN.md
- docs/ROADMAP.md
- docs/ARCHITECTURE_PRINCIPLES.md
- docs/AI_SKILL_REGISTRY.md
- src/

## Files expected to change

- docs/CODE_AUDIT_REPORT.md
- docs/SESSION_HANDOFF.md

## Implementation instructions

Create docs/CODE_AUDIT_REPORT.md with:

1. Current branch and working tree status.
2. ProcessTask model file.
3. TemplateProfile model file.
4. QARecommendation schema file.
5. Rule QA entry point.
6. Draft PTR quality gate entry point.
7. /api/ai/run-skill/route.ts flow.
8. Provider output parse/validate/repair location.
9. D01 generator + UI component.
10. D02 generator + UI component.
11. Product Delivery generation/state file.
12. Generate All logic location.
13. Existing test framework.
14. Risks before implementing QAFinding/GateVerdict/Normalizer.
15. Recommended next task.

## Edge cases to handle

- If a file path from docs does not exist, report it.
- If multiple possible files exist, list all and identify the most likely entry point.

## Constraints

- Do not modify app source code.
- Only create/update docs.
- Do not change AI behavior.
- Do not add dependencies.

## Commands to run

npx.cmd tsc --noEmit
npm run build

## Manual test

1. Open docs/CODE_AUDIT_REPORT.md.
2. Confirm all 15 sections are present.
3. Confirm no app source file was changed.

## Rollback

If task fails before commit:

git status --short
git restore docs/CODE_AUDIT_REPORT.md

## Docs to update

- docs/SESSION_HANDOFF.md

## Suggested commit message

Add source code audit report
