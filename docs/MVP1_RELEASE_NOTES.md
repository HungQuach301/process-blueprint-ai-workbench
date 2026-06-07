# MVP1 Release Notes

## Version / Tag

- Version/tag: `vMVP1-TBD`
- Release date: `TBD`

## Summary

MVP1 establishes Process Blueprint AI Workbench as an AI Process & Spec Workbench for controlled process modeling and artifact generation. The release focuses on a stable Process Modeling Core, deterministic exports, rule-based quality checks, AI-assisted draft/recommendation paths, and enterprise-ready guardrails for real AI usage.

Process Task Register remains the canonical source for process artifacts. AI output is treated as draft, recommendation, or review finding until the user explicitly reviews and applies supported changes.

## Included Features

- Process Task Register for structured enterprise process data.
- D01 BPMN generation and preview from `ProcessTask[]` and selected template profile.
- D02 Service Blueprint generation and export from `ProcessTask[]` and selected template profile.
- QA Engine for rule-based process quality findings.
- Recommendation Engine with preview/apply workflow.
- Template Library for BPMN and service blueprint profiles.
- Template Recommendation / AI Template Review path.
- Simplified AI Input Brief for Draft Process Task Register generation.
- Real AI skill route foundation for controlled server-side AI calls.
- Mock/local fallback for AI-assisted workflows.
- Export Center for generated artifacts and ZIP packaging.
- Local audit log foundation for AI and workflow traceability.

## AI Behavior

- AI does not directly mutate source process data.
- AI output must go through Draft, Recommendation, or Review Finding surfaces.
- Supported AI output is validated before preview/apply.
- Invalid AI output is blocked.
- User approval is required before applying AI-generated changes.
- Real AI calls must go through server-side skill routes.
- Browser code must not expose provider API keys.
- Mock/local fallback remains the default-safe path when real AI is disabled or not configured.

## Known Limitations

- MVP1 focuses on Process Modeling Core, not the full Artifact Graph implementation.
- BRD, SRS, User Story, UI Spec, Solution Spec, and AI Coding Pack workflows are planned future modules unless explicitly included in a later release scope.
- Real AI behavior depends on configured server-side provider settings and feature flags.
- External model quality can vary; schema validation and quality gates reduce risk but do not replace user review.
- Camunda Modeler and diagrams.net validation may require manual checks outside the app.
- Enterprise workspace features such as SSO, RBAC, shared team templates, and enterprise audit are not included in MVP1.

## Test Checklist

- [ ] Run `npx.cmd tsc --noEmit`.
- [ ] Open `http://localhost:3000`.
- [ ] Complete Process Task Register edit/add/duplicate/delete/save/refresh/reset checks.
- [ ] Run QA and confirm issue count and row highlight behavior.
- [ ] Generate Draft Process Task Register from AI Input Brief and confirm no auto-apply.
- [ ] Run AI QA or mock AI QA and confirm recommendations require review.
- [ ] Run AI Template Review and confirm recommendations are display/review only.
- [ ] Generate and preview D01 BPMN.
- [ ] Download `.bpmn` and validate in Camunda Modeler when possible.
- [ ] Generate and download D02 Service Blueprint `.drawio`.
- [ ] Validate `.drawio` in diagrams.net when possible.
- [ ] Download QA Report.
- [ ] Generate all Export Center artifacts.
- [ ] Download ZIP and confirm expected files are present.
- [ ] Confirm no API key is visible in browser code, public env vars, browser logs, or generated assets.

## Release Placeholder

Replace `vMVP1-TBD` with the final GitHub tag before publishing the release.
