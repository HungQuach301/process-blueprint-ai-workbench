# Next Implementation Plan

## Current phase

Complete Module 2 + Module 3 with full real AI support.

## Current branch

`feature/m2-m3-full-ai`

## Release target

`v0.8.0-mvp1-ai`

## Release stance

Delay MVP1 release until Module 2 Process Modeling Core and Module 3 Product Delivery Core are complete enough to prove real AI value safely.

The release should not ship as an immediate thin MVP. It should ship when the process-to-product-delivery workflow works end to end with:

- server-side real AI skills where enabled
- mock/local fallback where real AI is disabled or unavailable
- schema validation
- preview before apply/save/export
- no API key exposure in browser code
- audit metadata for real AI calls

## Priority order

1. Governance and baseline alignment
   - Align branch, release target, roadmap, AI Skill Registry, and handoff docs.
   - Keep current feature flags: `ENABLE_REAL_AI`, `ENABLE_REAL_AI_QA`, `ENABLE_REAL_AI_TEMPLATE_REVIEW`.
   - Keep AI output human-in-the-loop.

2. Complete Module 2 Process Modeling Core
   - AI Input Brief to Draft Process Task Register.
   - File Intake to Draft Process Task Register.
   - Process Task Register editing, save, import/export, and review state.
   - D01 BPMN and D02 Service Blueprint generation from Process Task Register and selected templates.
   - QA Panel, Recommendation Engine, Template Hub, Export Center, AI Coding Pack export, and audit visibility.
   - Preserve Process Task Register as the canonical source for process artifacts.

3. Harden Module 2 real AI readiness
   - Use only server-side AI skill routes for real AI.
   - Validate real AI output before display or apply.
   - Keep mock/local fallback for every MVP1-AI skill.
   - Keep Draft / Recommendation / Review Finding -> Preview -> User Apply.
   - Confirm no API key is referenced by client components.

4. Complete Module 3 Product Delivery Core
   - BRD outline generation.
   - SRS outline generation.
   - User story generation.
   - Acceptance criteria generation.
   - Jira-ready export.
   - MVP slicing.
   - Scope and non-scope drafting.
   - Requirement quality check.

5. Add Module 3 real AI skills
   - PTR or notes to BRD draft.
   - PTR, BRD, or notes to SRS draft.
   - BRD, notes, or PTR to user stories.
   - User stories to acceptance criteria.
   - User stories and acceptance criteria to Jira-ready export.
   - Requirement QA and improvement recommendations.
   - User stories/SRS to AI Coding Pack.

6. Add lightweight cross-artifact traceability
   - Trace generated Module 3 artifacts back to `ProcessTask.stepId` where possible.
   - Capture assumptions and open questions in generated drafts.
   - Avoid introducing full Artifact Graph until the planned later phase.

7. MVP1-AI release validation
   - Run TypeScript and build checks.
   - Verify real AI on/off behavior.
   - Verify server-side env and feature flag behavior.
   - Verify no browser API key exposure.
   - Verify manual regression for Module 2 and Module 3.
   - Prepare release checklist and release notes for `v0.8.0-mvp1-ai`.

## Current implementation rules

- Keep changes small and scoped.
- Do not modify D01/D02 generators unless explicitly required.
- Do not change canonical data models casually.
- Do not call external AI APIs from browser code.
- Keep Process Task Register as source of truth for process artifacts.
- AI outputs must be draft/recommendation/review finding before apply.
- Do not auto-apply AI output.
- Run TypeScript check after implementation.
- Run build when the build script is available.

## Current block

Block:
Pivot planning docs from immediate MVP1 release to MVP1-AI after full Module 2 and Module 3 completion.

Goal:
Make the implementation plan point clearly to `feature/m2-m3-full-ai` and `v0.8.0-mvp1-ai`.

Expected files:
- `docs/NEXT_IMPLEMENTATION_PLAN.md`
- `docs/ROADMAP.md`
- `docs/AI_SKILL_REGISTRY.md`
- `docs/DECISION_LOG.md`
- `docs/SESSION_HANDOFF.md`

Acceptance criteria:
- Current phase names full Module 2 + Module 3 with real AI support.
- Current branch is `feature/m2-m3-full-ai`.
- Release target is `v0.8.0-mvp1-ai`.
- Priority order covers Module 2, Module 3, real AI safety, and release validation.
- Future phases still include UI/Experience, Business Architecture, and IT/Solution Architecture.

Manual tests:
- Read the updated docs and confirm the release plan no longer points to an immediate thin MVP1.
- Confirm no application code was changed.
