# Task ID: M1-create-remaining-task-files

## Task name

Create remaining Milestone 1 Codex task files

## Estimated effort

Medium / 1-2 hours

## Dependencies

- 000-source-code-audit
- 001-qafinding-schema

## Goal

Create detailed Codex task files for the remaining MVP1-AI Stable Milestone tasks, using the real source paths identified in docs/CODE_AUDIT_REPORT.md.

## Definition of Done

- [ ] Task file 002-rule-qa-to-findings.md exists.
- [ ] Task file 003-ai-qa-finding-skill.md exists.
- [ ] Task file 004-qa-panel-split.md exists.
- [ ] Task file INT-01-qa-flow-integration-check.md exists.
- [ ] Task file 005-gateverdict-framework.md exists.
- [ ] Task file 006a-draft-ptr-gate-v1.md exists.
- [ ] Task file 006b-wire-draft-ptr-gate-ui.md exists.
- [ ] Task file 007-source-coverage-advisory.md exists.
- [ ] Task file 008-draft-ptr-golden-tests.md exists.
- [ ] Task file INT-02-draft-ptr-gate-integration-check.md exists.
- [ ] Task file 009a-provider-normalizer.md exists.
- [ ] Task file 009b-wire-normalizer-route.md exists.
- [ ] Task file 010-normalizer-golden-tests.md exists.
- [ ] Task file INT-03-ai-route-normalizer-integration-check.md exists.
- [ ] Task file 011-d01-pre-gate.md exists.
- [ ] Task file 012-d02-pre-gate.md exists.
- [ ] Task file 013a-xml-parser-strategy.md exists.
- [ ] Task file 013b-d01-post-gen-gate.md exists.
- [ ] Task file 013c-d02-post-gen-gate.md exists.
- [ ] Task file 013d-wire-post-gates-ui.md exists.
- [ ] Task file 014-chain-resilience-types.md exists.
- [ ] Task file 015-release-hardening.md exists.
- [ ] Task file 016-data-service-abstraction.md exists.
- [ ] Task file 017-user-gate-1-preparation.md exists.
- [ ] .codex/TASK_QUEUE.md remains valid.
- [ ] npx.cmd tsc --noEmit passes.

## Files to inspect first

- docs/CODE_AUDIT_REPORT.md
- .codex/task-template.md
- .codex/TASK_QUEUE.md
- src/lib/qa/task-register-rules.ts
- src/lib/qa/qa-finding.ts
- src/lib/recommendation-engine/qa-recommendation-schema.ts
- src/lib/recommendation-engine/types.ts
- src/lib/recommendation-engine/recommendation-factory.ts
- src/lib/quality-engine/ai-draft-quality-gate.ts
- src/lib/ai-intake/draft-ptr-schema.ts
- src/app/api/ai/run-skill/route.ts
- src/lib/ai/skill-registry-v2.ts
- src/lib/ai/skill-schemas.ts
- src/lib/ai/prompt-packs.ts
- src/components/qa-panel/QAPanel.tsx
- src/components/input-brief/AIInputBriefPanel.tsx
- src/components/bpmn-output/D01BpmnOutput.tsx
- src/components/service-blueprint-output/D02ServiceBlueprintOutput.tsx
- src/components/export-center/ExportCenter.tsx

## Files expected to change

- .codex/tasks/*.md
- .codex/TASK_QUEUE.md
- docs/SESSION_HANDOFF.md

## Implementation instructions

Create detailed task files for all remaining Milestone 1 tasks.

Each task file must include:

1. Task ID.
2. Task name.
3. Estimated effort.
4. Dependencies.
5. Goal.
6. Definition of Done.
7. Files to inspect first.
8. Files expected to change.
9. Implementation instructions.
10. Edge cases to handle.
11. Constraints.
12. Commands to run.
13. Manual test.
14. Rollback.
15. Docs to update.
16. Suggested commit message.

Important task-specific requirements:

Task 002-rule-qa-to-findings:
- Create adapter from existing QaIssue to QAFinding.
- Use the real QaIssue, QaIssueCode, QaSeverity types from src/lib/qa/task-register-rules.ts.
- Do not modify Rule QA engine.
- Do not modify QA Panel.

Task 003-ai-qa-finding-skill:
- Add skill ai-process-qa-finding.
- Do not remove or change ai-process-qa.
- Output must be QAFinding or QAFindingSet.
- No apply behavior.

Task 004-qa-panel-split:
- Depends on 001, 002, 003.
- Add Findings section/tab and Recommendations section/tab.
- Findings must not have apply buttons.
- Existing recommendation preview/apply behavior must remain unchanged.

Task INT-01:
- Verify QA flow end to end.
- PTR issue -> Rule QA -> QAFinding -> Findings tab.
- AI Finding -> Findings tab.
- Recommendations still preview/apply.

Task 005-gateverdict-framework:
- Create GateVerdict framework only.
- Do not replace existing gates yet.

Task 006a-draft-ptr-gate-v1:
- Add Draft PTR Gate v1 with 5 core dimensions only:
  schemaCompleteness, flowIntegrity, gatewaySafety, actorSystemCoverage, decompositionQuality.
- Do not implement all 10 dimensions.

Task 006b-wire-draft-ptr-gate-ui:
- Wire Draft PTR Gate v1 into Draft PTR preview UI.
- Default UI shows verdict, blockers, top warnings.
- Advanced UI shows score and breakdown.

Task 007-source-coverage-advisory:
- Source Coverage is advisory only.
- It must not affect GateVerdict score.
- It must not block apply.

Task 008-draft-ptr-golden-tests:
- Add initial golden tests for Draft PTR Gate v1.
- If tsx dependency is missing, stop and ask before adding dependency.

Task INT-02:
- Verify Input Brief -> Draft PTR -> Gate verdict -> Source Coverage advisory.

Task 009a-provider-normalizer:
- Create provider output normalizer pure functions only.
- Do not wire route yet.
- Do not silently null broken references.

Task 009b-wire-normalizer-route:
- Wire normalizer into real provider output flow before schema validation.
- Mock/local path must remain unchanged.
- Unsafe normalization must not silently pass.

Task 010-normalizer-golden-tests:
- Add normalizer golden tests.

Task INT-03:
- Verify AI route + normalizer + schema validation integration.

Task 011-d01-pre-gate:
- Add D01 pre-generation gate.
- Do not modify D01 generator core.

Task 012-d02-pre-gate:
- Add D02 pre-generation gate.
- Do not modify D02 generator core.

Task 013a-xml-parser-strategy:
- Decide XML parser strategy.
- Do not implement regex-only XML validation.
- If a dependency is needed, stop and ask.

Task 013b-d01-post-gen-gate:
- Add D01 post-generation gate.

Task 013c-d02-post-gen-gate:
- Add D02 post-generation gate.

Task 013d-wire-post-gates-ui:
- Wire D01/D02 post-generation gates into UI.
- Disable download if verdict fail.

Task 014-chain-resilience-types:
- Add ChainStepResult and ChainConfig types only.
- Do not fully wire Product Delivery Gates yet.

Task 015-release-hardening:
- Run final MVP1-AI Stable verification.
- No new features.

Task 016-data-service-abstraction:
- Add DataService interface and LocalDataService.
- No database.
- Do not refactor all storage at once.

Task 017-user-gate-1-preparation:
- Create User Gate 1 demo and feedback guide.

## Edge cases to handle

- If a real source file path differs from this prompt, use docs/CODE_AUDIT_REPORT.md as source of truth.
- If a task requires a dependency not currently installed, the task must say to stop and ask.
- If a task would modify D01/D02 generator core, it must explicitly warn and avoid doing so unless task requires it.
- If a task would change AI auto-apply behavior, it must stop.

## Constraints

- Do not modify application source code in this meta-task.
- Do not add dependencies.
- Do not change AI behavior.
- Do not modify generators.
- Only create/update Codex task files and docs.

## Commands to run

npx.cmd tsc --noEmit

## Manual test

1. Open each created task file.
2. Confirm it has Dependencies, Definition of Done, Constraints, Commands, Manual test, Rollback.
3. Confirm .codex/TASK_QUEUE.md references existing task files.
4. Run Test-Path for a few task files.

## Rollback

If this meta-task creates incorrect task files:

git status --short
git restore .codex/tasks
git restore .codex/TASK_QUEUE.md

## Docs to update

- docs/SESSION_HANDOFF.md

## Suggested commit message

Add remaining Milestone 1 Codex task definitions
