# MVP1 Release Checklist

## Version

- Version/tag: `vMVP1-TBD`
- Release branch: `TBD`
- Release owner: `TBD`
- Release date: `TBD`

## 1. Process Modeling Core

- [ ] Process Task Register is usable as the canonical source for process artifacts.
- [ ] User can edit a cell.
- [ ] User can add a row.
- [ ] User can duplicate a row.
- [ ] User can delete a row.
- [ ] User can save data.
- [ ] User can refresh and data remains correct.
- [ ] User can reset sample data.
- [ ] D01 BPMN is generated from `ProcessTask[]` and selected BPMN template.
- [ ] D01 BPMN preview renders successfully.
- [ ] D02 Service Blueprint is generated from `ProcessTask[]` and selected service blueprint template.
- [ ] D02 Service Blueprint cards do not overlap in normal sample data.
- [ ] QA issues are generated from current Process Task Register data.
- [ ] Recommendation Engine recommendations can be reviewed before apply.
- [ ] Template Library supports selecting D01 and D02 templates.
- [ ] Export Center can generate expected artifacts from current source data.

## 2. Real AI Readiness

- [ ] Real AI skill route is server-side only.
- [ ] `input-brief-to-ptr` supports Draft Process Task Register output.
- [ ] `ai-process-qa` supports QA recommendation output.
- [ ] `ai-template-review` supports template recommendation/review output.
- [ ] Mock/local fallback remains available when real AI is disabled or not configured.
- [ ] AI output is never auto-applied.
- [ ] AI output enters Draft, Recommendation, or Review Finding state first.
- [ ] AI output passes schema validation before preview/apply.
- [ ] Invalid AI output is blocked and does not mutate source data.
- [ ] User approval is required before applying supported AI changes.
- [ ] Audit log records AI action metadata without unnecessary sensitive content.

## 3. Security And API Key Safety

- [ ] No API key is stored in browser code.
- [ ] No API key is exposed in client components.
- [ ] No API key is included in public env vars.
- [ ] No API key appears in generated static assets or browser-visible logs.
- [ ] AI provider calls go through controlled server-side routes.
- [ ] Sensitive business data is not logged unnecessarily.
- [ ] Real AI usage is gated by explicit configuration/feature flags.

## 4. Manual Regression Tests

- [ ] Open `http://localhost:3000`.
- [ ] Confirm app loads without runtime error.
- [ ] Confirm no page-level horizontal scroll in normal desktop viewport.
- [ ] Process Task Register: edit, add, duplicate, delete, save, refresh, reset.
- [ ] Template Library: edit profile, save, select D01 template, select D02 template, refresh, reset.
- [ ] QA: create a known issue and confirm issue count changes.
- [ ] QA: click issue and confirm row highlight.
- [ ] Recommendation Engine: preview recommendation before apply.
- [ ] AI Input Brief: fill the simplified visible sections.
- [ ] AI Input Brief: generate Draft Process Task Register.
- [ ] AI Input Brief: confirm no automatic apply occurs.
- [ ] AI Template Review: run review and confirm recommendations display without auto-apply.

## 5. Export Tests

- [ ] Generate D01 BPMN XML.
- [ ] Confirm D01 BPMN preview renders.
- [ ] Download `.bpmn`.
- [ ] Open `.bpmn` in Camunda Modeler when possible.
- [ ] Generate D02 Service Blueprint XML.
- [ ] Download `.drawio`.
- [ ] Open `.drawio` in diagrams.net when possible.
- [ ] Download QA Report.
- [ ] Generate all Export Center artifacts.
- [ ] Confirm artifact statuses are Fresh, Stale, or Not generated as expected.
- [ ] Download ZIP package.
- [ ] Confirm ZIP contains all expected MVP1 files.

## 6. GitHub Release Readiness

- [ ] Working tree contains only intended release changes.
- [ ] `npx.cmd tsc --noEmit` passes.
- [ ] Release checklist is complete or known exceptions are documented.
- [ ] Release notes are reviewed.
- [ ] Version/tag placeholder is replaced with the final tag.
- [ ] GitHub release title is prepared.
- [ ] GitHub release description links to release notes.
- [ ] Final release commit is created.
- [ ] Release tag is created.
- [ ] GitHub release is published from the final tag.

## Sign-off

- Product sign-off: `TBD`
- Engineering sign-off: `TBD`
- QA sign-off: `TBD`
