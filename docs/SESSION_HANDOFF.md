# Session Handoff

## Last updated

2026-05-11

## Current branch

`feature/mvp1-ai-rc4-ux-redesign`

## Current product phase

Complete Module 2 + Module 3 with full real AI support.

## Release target

`v0.8.0-mvp1-ai`

## What was done in the last session

- Implemented the MVP1-AI RC4 App Shell + Theme polish block.
- Updated the global header/top menubar with `Process Blueprint AI Workbench`, RC4 version label, primary module tabs, AI status badge, data mode badge, and language selector.
- Reworked the contextual sidebar grouping into Setup, Process Modeling, Product Delivery, and Export & Audit.
- Updated the app footer with version, AI mode, data mode, and local storage/privacy note.
- Strengthened global theme tokens and shared UI classes for primary blue, AI purple, success green, warning amber, danger red, slate neutral, card radius, card shadow, section header, status badges, and button hierarchy.
- Kept the RC4 shell polish UI-only: no business logic, data model, canonical schema, D01/D02 generator, AI provider route/adapter, browser secret handling, or AI auto-apply behavior was changed.
- Created RC4 UI/UX audit documentation for Workspace, AI Connection Center, AI Input Brief, File Intake, Template Hub, QA Panel, Process Task Register, D01 BPMN, D02 Service Blueprint, Product Delivery, AI Development Handoff Pack, Export Center, and AI Run History.
- Created the RC4 UI/UX implementation plan with small delivery blocks for App Shell + Theme, i18n cleanup, Workspace Dashboard, Template Hub redesign, Product Delivery module, QA Panel redesign, PTR table UX, and Export/Audit polish.
- Kept this RC4 step documentation-only: no application code, data model, canonical schema, D01/D02 generator, provider adapter, browser secret handling, or AI auto-apply behavior was changed.
- Turned Workspace into a useful dashboard for MVP1-AI RC3.
- Added Workspace overview cards for AI status, Process Task Register status, QA status, artifact status, and Product Delivery status.
- Added Start here actions for creating from brief, importing a file, reviewing QA, generating Product Delivery, and exporting the package.
- Added a recommended next action based on local workspace state and a metadata-only recent AI run summary.
- Reintroduced Workspace as a primary dashboard entry in the module tabs and contextual navigation, removing release-facing hidden placeholder wording.
- Improved Process Task Register for both non-technical and technical users in MVP1-AI RC3.
- Tightened Simple mode to the requested business-readable columns: Step ID, Task name, Actor, System, Phase, Next step, and Review status.
- Kept Advanced mode as the full technical column set without changing the `ProcessTask` schema.
- Added a per-row Details drawer so users can inspect all Process Task fields without making the main Simple mode table visually dense.
- Preserved existing Add/Edit/Duplicate/Delete/Save/import/export behavior, sticky header/key columns, visible save state, server-side AI boundaries, and no AI auto-apply behavior.
- Redesigned QA Panel into a clearer user-friendly review workflow for MVP1-AI RC3.
- Added QA summary cards for Critical, Warnings, Suggestions, and Recommendations plus a recommended next action message.
- Added review tabs for Critical, Warnings, Suggestions, Recommendations, and Advanced structure changes.
- Kept graph-changing recommendations hidden by default behind the existing advanced structure toggle.
- Kept card actions as preview-first: recommendation cards use `Preview change`, selected/safe batch actions open preview/confirmation before apply.
- Simplified issue cards around issue title, why it matters, suggested fix, and affected step while preserving recommendation logic and feedback logging.
- Moved Product Delivery Core out of Export Center into a dedicated primary module for MVP1-AI RC3.
- Updated the global module tab and contextual sidebar so Product Delivery points to its own `#product-delivery` section instead of `#export-center`.
- Kept Product Delivery generation/export logic intact while rendering it through a dedicated Product Delivery module surface.
- Reorganized Product Delivery actions into grouped Generate, Review, and Export cards covering BRD, SRS, User Stories, Acceptance Criteria, Scope Review, MVP Slicing, and AI Development Handoff Pack workflows.
- Kept Export Center focused on output package ZIP, artifact readiness statuses, audit log export, and AI Run History.
- Preserved preview-before-download behavior, server-side AI route boundaries, schema/quality-gate flows, no browser API key exposure, no D01/D02 generator changes, and no AI auto-apply behavior.
- Redesigned Template Hub with progressive disclosure for MVP1-AI RC3.
- Split Template Hub into four user-facing tabs: Current templates, Browse templates, Template review, and Editor.
- Simplified template browse cards to show only key scan fields: name, output type, domain, process type, status, and short recommended tags.
- Moved detailed metadata, mandatory fields, and rule-oriented information into expandable details/preview surfaces.
- Limited `Use D01` actions to BPMN-compatible templates and `Use D02` actions to Service Blueprint-compatible templates.
- Moved Template Review Provider Compare into an Advanced section, keeping it off by default and preserving no auto-apply behavior.
- Kept the template editor out of the main browse flow and preserved the existing `TemplateProfile` schema, AI route, provider handling, and D01/D02 generator behavior.
- Completed MVP1-AI RC3 i18n cleanup across the app shell, File Intake/Input Brief, AI Connection Center, QA Panel, Process Task Register, Product Delivery, and Export Center surfaces.
- Ensured locale-sensitive user-facing copy now renders English-only for `en` and Vietnamese-only for `vi`, while keeping canonical enum/internal values and technical artifact names such as `AGENTS.md`, `CLAUDE.md`, cursor rules, and `spec.json` unchanged.
- Localized remaining romanized Vietnamese and mixed-language status/action messages in File Intake, Draft PTR generation, PTR import/export/recommendation flows, Provider Compare, Product Delivery previews, AI Run History, and AI Development Handoff Pack details.
- Kept the change UI-copy only: no data model, canonical schema, D01/D02 generator, provider adapter, browser secret handling, or AI auto-apply behavior was changed.
- Created a polished MVP1-AI RC3 app shell.
- Added a sticky global header/menubar with product mark, product name, module tabs, AI status badge, artifact readiness badge, and language selector.
- Reworked the contextual sidebar into module groups: Workspace, Process Modeling, Product Delivery, Templates, and Export & Audit.
- Added an app footer with version, AI mode, data mode, and a local storage/privacy note.
- Extended the global theme tokens for primary blue, AI purple, success green, warning amber, danger red, and slate neutral styling.
- Normalized shell typography, spacing, 8px card radius, subtle shadows, module tabs, and shared shell background styling.
- Kept the change UI-only: no business logic, AI route behavior, provider adapter, generator, schema, API key handling, or auto-apply behavior was changed.
- Polished File Intake and AI Development Handoff Pack UX for MVP1-AI RC2.
- Added clearer File Intake supported-format guidance: text-based PDF, DOCX, and XLSX are supported locally; Image/OCR/Voice intake is coming soon.
- Made selected File Intake rows show file name, file type, processing status, next step, Generate Draft PTR, and Clear file actions.
- Kept File Intake stale preview/draft clearing when a new file is selected or removed.
- Renamed the user-facing AI Coding Pack section to `AI Development Handoff Pack` while keeping technical files such as `AGENTS.md`, `CLAUDE.md`, cursor rules, and `spec.json` visible in included-file details.
- Added non-technical handoff copy explaining that the package can be sent to a development team or used with Codex, Claude Code, and Cursor.
- Preserved preview-before-download behavior, server-side AI route usage, mock/local fallback, no browser API key exposure, and no auto-apply behavior.
- Improved D01 BPMN, D02 Service Blueprint, and Export Center preview UX for MVP1-AI RC2.
- Kept visual previews prominent for D01 BPMN and D02 Service Blueprint.
- Added BPMN preview Fit, Zoom -, and Zoom + controls using the existing `bpmn-js` viewer canvas.
- Moved raw BPMN XML and draw.io XML into closed-by-default Advanced / View XML sections for technical users.
- Kept XML download actions available and did not modify D01/D02 generator logic.
- Kept Export Center artifact status cards visible in the primary flow.
- Moved AI Run History into an Advanced collapsible area and removed its export action from the primary header action group so it no longer visually dominates package export.
- Preserved AI audit metadata behavior, no browser API key exposure, and no auto-apply behavior.
- Improved Process Task Register table UX for MVP1-AI RC2.
- Added Simple / Advanced column mode without changing the `ProcessTask` schema.
- Added sticky table header inside the table scroll area.
- Kept checkbox, row number, `stepId`, and `taskName` usable during horizontal scroll where feasible.
- Added clearer selected row count and a bulk action area for PTR AI Assistant and clear selection.
- Moved per-row Duplicate/Delete actions into a compact row action menu with locale-aware labels.
- Added visible save state feedback: `Saved`, `Unsaved changes`, and `Saving`.
- Preserved existing save/add/duplicate/delete/import/export behavior and kept AI output review/apply rules unchanged.
- Applied visual design system polish for MVP1-AI RC2.
- Added global design tokens for primary blue, AI purple, success green, warning amber, danger red, and neutral slate.
- Added shared `btn`, semantic button variants, status badge, soft panel, and surface card styles.
- Replaced heavy black primary action buttons with semantic primary, AI, and success button styles across the main RC2 modules.
- Improved shared module cards through `SessionFrame` with softer background, clearer header spacing, 8px radius, and subtle shadow.
- Improved the left sidebar with grouped modules and active section state.
- Improved the top workspace header with product title treatment, MVP1-AI RC badge, AI provider/status badge, and artifact readiness summary.
- Kept the polish UI-only: no business logic, generator behavior, AI route, provider adapter, schema, API key handling, or auto-apply behavior was changed.
- Improved QA recommendation safety UX for MVP1-AI RC2.
- Graph-changing recommendations are now hidden by default behind the Advanced structure changes option.
- Renamed the graph-changing toggle to user-friendly EN/VI copy: `Show advanced structure changes` / `Hiển thị thay đổi cấu trúc nâng cao`.
- Replaced per-card direct apply wording with `Preview change`; recommendations still require preview/confirmation before apply.
- Tightened Select safe so it excludes graph-changing, high-risk, high-impact, and medium-impact recommendations unless the existing medium opt-in is enabled.
- Recommendation cards now expose confidence, risk, affected steps, and change summary for easier review.
- QA issues are grouped as Critical, Warnings, Suggestions, and Advanced structure changes.
- Improved AI provider status and AI Run History for MVP1-AI RC2.
- AI Connection Center now receives selected provider status, effective provider, and fallback-active metadata from `/api/ai/run-skill`.
- Product AI/OpenAI/Claude missing-env or disabled states now clearly surface local/mock fallback instead of implying a successful external provider call.
- AI Run History now derives explicit validation states: `valid`, `invalid`, `skipped`, and `not applicable`.
- AI Run History rows now show skill, provider, model, status, validation status, external API flag, latency, tokens, and timestamp.
- Failure or warning rows now have expandable safe details: error type, safe error message, validation summary, provider request id, warnings, and suggested next action.
- AI history remains metadata-only; full prompt text and full model output are still not stored.
- Fixed MVP1-AI RC2 release-facing P0 UI blockers.
- Removed the visible Workspace placeholder card and duplicate QA Panel placeholder card from the main page flow.
- Made the left navigation locale-aware and filtered hidden placeholder-only sections from release navigation.
- Replaced the `MVP Skeleton` eyebrow with an MVP1-AI release candidate label.
- Updated AI Input Brief and AI Connection Center copy so mock mode clearly says local/mock with no external provider call, while real AI mode shows provider/cloud-processing warning copy.
- Normalized QA Panel AI run labels to `Run AI QA` / `Run mock QA` and removed release-facing placeholder wording from recommendation warnings.
- Updated navigation sample metadata so hidden/ready sections no longer carry `Placeholder` release status.
- Added optional Provider Compare mode for selected AI skills.
- Added server-side `providerId` override support to `/api/ai/run-skill`; provider selection still stays server-side and continues to enforce feature flags, data mode, provider config, allowed providers, schema validation, quality gates, mock/local fallback, and safe audit metadata.
- Added Provider Compare UI for Product Delivery BRD generation, User Story generation, and AI Coding Pack generation in Export Center.
- Added Provider Compare UI for Process QA in QA Panel.
- Added Provider Compare UI for Template Review in Template Hub.
- Compare mode is off by default, requires explicit provider selection, shows side-by-side provider/model/confidence/warnings/summary/validation status, and requires the user to choose one output for preview.
- Added cost warning and cloud AI consent checks before multi-provider/non-mock compare runs.
- Preserved no auto-merge and no auto-apply behavior for provider outputs.
- Added AI Run History and audit visibility for Module 2 and Module 3.
- Extended local audit helpers to derive safe `AI Run History` records from `ai_call` entries.
- Captured AI run metadata for route-backed Product Delivery and AI Coding Pack skill calls: skill id, provider, model, status, timestamp, latency, validation result, token usage, external API flag, warnings, and request id when available.
- Added Export Center Local Audit Log / AI Run History panel with refresh and JSON export.
- Kept audit storage metadata-only; full prompts and full AI outputs are not stored in browser local audit history.
- Updated AI Implementation Matrix for AI Run History behavior and remaining durable server-audit gap.
- Added Requirement QA and basic cross-artifact consistency checks for Module 3.
- Added route-backed skill id `requirement-quality-check` through `/api/ai/run-skill`.
- Added canonical `RequirementQAResponse` with findings, draft patch recommendations, coverage summary, assumptions, open questions, and warnings.
- Reused BRD/SRS/User Story/Acceptance Criteria quality gates and added AI Coding Pack checks for missing constraints, missing test plan, and missing non-goals.
- Added basic trace coverage checks for BRD requirement -> SRS, SRS requirement -> User Story, and User Story -> Acceptance Criteria.
- Wired Export Center action to preview Requirement QA without saving/applying changes.
- Updated AI Skill Registry and AI Implementation Matrix for Product AI/OpenAI/Claude/Mock support on Requirement QA.
- Completed AI Coding Pack generation from Product Delivery artifacts.
- Added route-backed skill id `user-stories-to-ai-coding-pack` through `/api/ai/run-skill`.
- Extended AI Coding Pack generation to use BRD, SRS, user stories, acceptance criteria, and optional Process Task Register context.
- Generated `AGENTS.md`, `CLAUDE.md`, `cursor-rules.md`, `spec.json`, `implementation-plan.md`, `acceptance-criteria.md`, and `test-plan.md` with project goal, non-goals, requirements, user stories, AC, architecture constraints, data/privacy constraints, testing expectations, and traceability refs.
- Added AI Coding Pack quality gate checks for missing acceptance criteria, missing non-goals, missing test expectations, and unresolved open questions.
- Added Export Center action to preview Product Delivery AI Coding Pack before ZIP download.
- Added local audit actions for `generate_product_delivery_ai_coding_pack` and `export_product_delivery_ai_coding_pack`.
- Updated AI Skill Registry and AI Implementation Matrix for Product Delivery AI Coding Pack support.
- Added Product Scope Review and MVP Slicing AI for Product Delivery Core.
- Added route-backed skill ids `product-scope-review` and `mvp-slicing` through `/api/ai/run-skill`.
- Added canonical `ProductScopeReview` output with in-scope items, out-of-scope items, assumptions, open questions, MVP slice, later phases, dependencies, risks, quality issues, and trace links.
- Wired Product Scope Review and MVP Slicing through Product AI/OpenAI/Claude/Mock support with schema validation, quality gate, preview-first behavior, and no auto-save/apply.
- Added Export Center actions to preview Product Scope Review/MVP Slicing and download Scope JSON only after preview.
- Added local audit actions for `generate_product_scope_review_preview` and `export_product_scope_review_draft`.
- Updated AI Skill Registry and AI Implementation Matrix for scope review and MVP slicing support.
- Completed AI User Story and Acceptance Criteria generation for Product Delivery Core.
- Added route-backed skill ids `srs-to-user-stories`, `brd-to-user-stories`, legacy-compatible `brd-or-notes-to-user-stories`, and `user-stories-to-acceptance-criteria` through `/api/ai/run-skill`.
- Extended canonical user story and acceptance criteria models with epics, stable ids, role, goal/action, business value, dependencies, priority/complexity, source requirement refs, source step refs, and quality issues.
- Added quality gates for missing role, missing value, missing acceptance criteria, non-testable acceptance criteria, broad stories, and missing source trace.
- Wired Export Center actions to preview structured user stories from SRS/BRD and preview structured acceptance criteria from user stories before JSON download.
- Added local audit actions for `generate_user_stories_preview`, `export_user_stories_draft`, `generate_acceptance_criteria_preview`, and `export_acceptance_criteria_draft`.
- Updated AI Skill Registry and AI Implementation Matrix for Product AI/OpenAI/Claude/Mock support on story and acceptance-criteria generation.
- Completed AI SRS Generator for Product Delivery Core.
- Added route-backed skill ids `brd-to-srs` and `notes-to-srs` through `/api/ai/run-skill`.
- Extended canonical SRS model with actors/roles, systems/components, stable functional and non-functional requirement ids, data requirements, interface/integration requirements, constraints, quality issues, assumptions, open questions, and trace links.
- Added SRS quality gate checks for requirement not testable, missing actor/system, missing NFR, and unclear dependency.
- Wired SRS generation through Product AI/OpenAI/Claude/Mock support with server-side schema validation and mock/local fallback.
- Added Export Center actions to generate SRS from BRD/PTR or notes/source context, preview structured SRS JSON, and download SRS JSON only after preview.
- Added local audit actions for `generate_srs_preview` and `export_srs_draft`.
- Updated AI Skill Registry and AI Implementation Matrix for SRS route support and remaining Module 3 gaps.
- Completed AI BRD Generator for Product Delivery Core.
- Added route-backed skill ids `notes-to-brd` and `ptr-to-brd`, with `ptr-to-brd-outline` treated as a legacy alias for PTR-based BRD generation.
- Extended canonical BRD model with business objective, background/context, stakeholders, business requirements, process references, risks/dependencies, and quality issues.
- Added BRD quality gate checks for missing objective, missing scope, vague requirement, and missing stakeholder.
- Wired BRD generation through `/api/ai/run-skill` with Product AI/OpenAI/Claude/Mock support, schema validation, quality gate, preview-first behavior, and no auto-apply.
- Added Export Center actions to generate BRD from PTR or notes/source context, preview structured BRD JSON, and download BRD JSON only after preview.
- Added optional uploaded file text input for Product Delivery BRD generation; no persistent file artifact store or OCR was added.
- Updated AI Skill Registry and AI Implementation Matrix for BRD route support and remaining gaps.
- Stabilized Product Delivery Core canonical models for BRD, SRS, UserStory, AcceptanceCriteria, ProductScope, Assumptions, and OpenQuestions.
- Added Product Delivery schema validation helpers and wired deterministic Product Delivery generation through the canonical validated draft model.
- Updated Product Delivery preview in Export Center to show structured counts for source steps, BRD sections, SRS requirements, user stories, acceptance criteria, assumptions, and open questions.
- Enforced preview-first Product Delivery export by disabling/download-blocking markdown export until a draft preview exists.
- Reused canonical Product Delivery validators from AI Skill schema helpers for BRD/SRS/UserStorySet/AcceptanceCriteria responses.
- Updated `docs/AI_IMPLEMENTATION_MATRIX.md` for the structured Product Delivery deterministic slice and remaining real AI route gaps.
- Kept Product Delivery preview/export only; no full Artifact Graph, no auto-save/apply, no D01/D02 generator changes, and no browser AI provider calls were introduced.
- Completed Template Hub AI Template Review output contract.
- Expanded Template Review response validation to include `warnings` and `assumptions` alongside `TemplateRecommendation[]` and quality score.
- Strengthened mock/local Template Review to check BPMN fit, Service Blueprint fit, mandatory fields, lane/row rules, connector/layout risks, and business domain/process type fit.
- Updated Template Hub UI to display AI Template Review quality score, warnings, assumptions, and recommendations as review-only output.
- Preserved no auto-apply for template recommendations; users must still edit/save templates explicitly.
- Updated `docs/AI_IMPLEMENTATION_MATRIX.md` for completed Template Hub AI Template Review behavior.
- Added AI artifact review for generated D01 BPMN and D02 Service Blueprint outputs.
- Added `artifact-review` to AI Skill Registry V2 with Product AI/OpenAI/Claude/Mock support.
- Added `ArtifactReviewResponse` validation for PTR `QARecommendation[]`, template `TemplateRecommendation[]`, and artifact warnings.
- Added a process-modeling artifact review prompt pack that forbids direct BPMN/draw.io XML mutation and routes fixes back to PTR or template recommendations.
- Added deterministic mock/local route support for `/api/ai/run-skill` skill id `artifact-review`.
- Added UI actions `Review BPMN with AI` and `Review Service Blueprint with AI` in the D01/D02 output panels.
- Kept artifact review read-only: generated XML is not changed and no recommendation is auto-applied.
- Updated `docs/AI_IMPLEMENTATION_MATRIX.md` for artifact review skill support.
- Completed AI QA and AI Recommendation V2 hardening for Process Modeling Core.
- Updated QA Panel so AI QA receives `ProcessTask[]`, rule-based QA issues, existing rule recommendations, and selected D01/D02 template metadata.
- Hardened `QARecommendation[]` validation for AI output: source `ai`/`hybrid`, confidence/impact/risk, target step ids, operation kinds, operation step references, and graph-changing safety.
- Normalized graph-changing AI recommendations to high impact/high risk with explicit confirmation required.
- Updated mock AI QA to use rule issue/recommendation context and return hybrid recommendations when extending rule recommendations instead of duplicating them blindly.
- Preserved existing Select safe, Apply selected confirmation, and local feedback logging behavior.
- Updated `docs/AI_IMPLEMENTATION_MATRIX.md` for AI QA/Recommendation V2 behavior.
- Added PTR AI Assistant selected-row actions in Process Task Register.
- Added row selection checkboxes and an AI Assistant menu for normalize, infer actor/system/lane, improve wording, split complex task, generate input/output, and suggest interaction/channel.
- Wired PTR AI Assistant actions to `/api/ai/run-skill` with skill id `process-improvement-recommendation`.
- Returned AI Assistant output as `QARecommendation[]` surfaced through the existing QA Panel recommendation workflow.
- Preserved no direct mutation: recommendations still require QA Panel preview/confirmation before apply.
- Added deterministic mock/local route support for `process-improvement-recommendation` and allowed provider-backed Product AI/OpenAI/Claude execution through Orchestration V2.
- Kept split task recommendations high risk/graph-changing so they are not selected by Select safe.
- Updated `docs/AI_IMPLEMENTATION_MATRIX.md` for PTR AI Assistant route/UI support.
- Completed Module 2 route-backed Draft PTR generation from three sources: structured Manual Input, File Intake extracted text, and pasted Chat/Notes.
- Added route/registry support for `file-to-ptr-draft` and `chat-to-ptr-draft`, with legacy route aliases for `file-to-draft-ptr` and `chat-to-draft-ptr`.
- Added `qualityIssues` to the Draft PTR contract and validation path.
- Wired File Intake PDF/DOCX extracted text through `/api/ai/run-skill` for Product AI/OpenAI/Claude/Mock support; image/OCR remains unsupported.
- Added a Manual Input Chat/Notes card that generates a Draft PTR preview through `/api/ai/run-skill`.
- Kept Apply as explicit Replace/Append only and preserved artifact stale marking after apply.
- Updated `docs/AI_SKILL_REGISTRY.md` and `docs/AI_IMPLEMENTATION_MATRIX.md` for Module 2 draft PTR skills.
- Completed the AI Connection Center provider surface for Product AI, OpenAI, Claude, and Local/Mock.
- Added provider cards with server-derived statuses: `configured`, `missing env`, `disabled`, and `available`.
- Added a Test Connection action that calls `/api/ai/run-skill` server-side and never calls provider APIs directly from the browser.
- Added non-secret Advanced Settings for default provider, model/capability, allow cloud AI, require approval, data usage mode, and simple active-skill provider overrides.
- Updated `.env.example`, `docs/AI_CONNECTION_SETUP.md`, and `docs/AI_IMPLEMENTATION_MATRIX.md` for the completed AI Connection Center behavior.
- Upgraded `/api/ai/run-skill` to AI Orchestration V2 while keeping the same route path.
- Wired route execution to AI Skill Registry V2 for skill validation, prompt pack selection, allowed provider checks, and schema validation dispatch.
- Added route-level provider/data mode enforcement using feature flags, configured provider, allowed providers, provider config status, and optional server `AI_DATA_USAGE_MODE`.
- Added provider timeout handling with optional `AI_PROVIDER_TIMEOUT_MS`.
- Added one scoped malformed-JSON repair attempt for provider output; repaired output still must pass schema validation.
- Added server-safe audit metadata in route responses and server logs without logging full sensitive payloads or full model output.
- Preserved existing deterministic mock/local fallbacks for `input-brief-to-ptr`, `ai-process-qa`, and `ai-template-review`.
- Updated `docs/AI_CONNECTION_SETUP.md` and `docs/AI_IMPLEMENTATION_MATRIX.md` for Orchestration V2 behavior.
- Implemented AI Skill Registry V2 for MVP1-AI under `src/lib/ai/`.
- Added provider-neutral, process modeling, and product delivery prompt pack definitions.
- Added runtime schema helpers for Draft PTR, BRD, SRS, User Story Set, Acceptance Criteria, AI Coding Pack, QARecommendation, and TemplateRecommendation outputs.
- Reused existing canonical validators for StructuredProcessBrief, DraftProcessTaskRegister, QARecommendation, and TemplateRecommendation where available.
- Updated `docs/AI_SKILL_REGISTRY.md` and `docs/AI_IMPLEMENTATION_MATRIX.md` to document Registry V2, prompt packs, schema contracts, and remaining wiring gaps.
- Implemented AI Provider Adapter V2 for Mock, Product AI, OpenAI, and Claude.
- Added a normalized provider response shape with `rawText`, `rawJson`, `parsedJson`, `providerId`, `model`, `requestId`, `tokenUsage`, `latencyMs`, and `warnings`.
- Updated `/api/ai/run-skill` to select providers through a server-side provider factory while preserving existing mock fallback, validation, and preview-first behavior.
- Updated `.env.example`, `docs/AI_CONNECTION_SETUP.md`, and `docs/AI_IMPLEMENTATION_MATRIX.md` for Product AI/OpenAI/Claude/Mock provider support.
- Audited the current AI implementation across the AI skill route, provider types/adapters, AI intake, quality gates, recommendation validation, template review validation, audit log, AI settings UI, AI Input Brief, QA Panel, Template Hub, Product Delivery, and AI Coding Pack export.
- Created `docs/AI_IMPLEMENTATION_MATRIX.md` covering skill id, module, input/output schema, Mock/Product AI/OpenAI/Claude support, validation, UI surface, apply behavior, audit behavior, and gaps.
- Pivoted planning docs from an immediate MVP1 release to MVP1-AI after full Module 2 and Module 3 completion.
- Updated the next implementation plan with the new phase, branch, release target, and priority order.
- Updated the roadmap so MVP1-AI includes full Module 2 Process Modeling Core and Module 3 Product Delivery Core.
- Kept UI/Experience Generation, Business Architecture, and IT/Solution Architecture as future phases.
- Expanded the AI Skill Registry with MVP1-AI skills for Module 2 and Module 3, including status labels: `planned`, `implemented`, `mock`, and `real-ai-ready`.
- Added an ADR to delay release until M2/M3 full AI are complete.
- Did not change application code.

## Files changed

- `src/components/task-register/ProcessTaskRegister.tsx`
- `src/components/export-center/ExportCenter.tsx`
- `src/components/task-register/ProcessTaskRegister.tsx`
- `docs/SESSION_HANDOFF.md`
- `src/components/preview/BpmnPreview.tsx`
- `src/components/bpmn-output/D01BpmnOutput.tsx`
- `src/components/service-blueprint-output/D02ServiceBlueprintOutput.tsx`
- `src/components/export-center/ExportCenter.tsx`
- `docs/SESSION_HANDOFF.md`
- `src/lib/models/product-delivery.ts`
- `src/lib/generators/product-delivery-generator.ts`
- `src/lib/ai/skill-schemas.ts`
- `src/lib/ai/skill-registry-v2.ts`
- `src/lib/ai/prompt-packs.ts`
- `src/app/api/ai/run-skill/route.ts`
- `src/lib/audit/audit-log.ts`
- `src/lib/ai/ai-governance.ts`
- `src/components/export-center/ExportCenter.tsx`
- `src/components/qa-panel/QAPanel.tsx`
- `src/components/template-library/TemplateLibraryEditor.tsx`
- `docs/AI_SKILL_REGISTRY.md`
- `docs/AI_IMPLEMENTATION_MATRIX.md`
- `docs/SESSION_HANDOFF.md`
- `src/app/globals.css`
- `src/components/AppShell.tsx`
- `src/components/Navigation.tsx`
- `src/components/layout/SessionFrame.tsx`
- `src/components/ai-settings/AIProviderSettingsPanel.tsx`
- `src/components/input-brief/AIInputBriefPanel.tsx`
- `src/components/task-register/ProcessTaskRegister.tsx`
- `src/components/qa-panel/QAPanel.tsx`
- `src/components/template-library/TemplateLibraryEditor.tsx`
- `src/components/bpmn-output/D01BpmnOutput.tsx`
- `src/components/service-blueprint-output/D02ServiceBlueprintOutput.tsx`
- `src/components/export-center/ExportCenter.tsx`
- `src/components/bpmn-output/D01BpmnOutput.tsx`
- `src/components/service-blueprint-output/D02ServiceBlueprintOutput.tsx`
- `src/components/template-library/TemplateLibraryEditor.tsx`
- `src/components/qa-panel/QAPanel.tsx`
- `src/app/api/ai/run-skill/route.ts`
- `src/lib/ai/ai-qa-types.ts`
- `src/lib/ai/ai-qa-service.ts`
- `src/lib/ai/ai-template-review-service.ts`
- `src/lib/ai/ai-template-review-types.ts`
- `src/lib/ai/skill-schemas.ts`
- `src/lib/ai/skill-registry-v2.ts`
- `src/lib/ai/prompt-packs.ts`
- `src/lib/recommendation-engine/qa-recommendation-schema.ts`
- `src/lib/template-recommendation-engine/template-recommendation-schema.ts`
- `docs/AI_SKILL_REGISTRY.md`
- `docs/AI_IMPLEMENTATION_MATRIX.md`
- `docs/SESSION_HANDOFF.md`
- `src/components/input-brief/AIInputBriefPanel.tsx`
- `src/lib/ai-intake/draft-ptr-generator.ts`
- `src/lib/ai-intake/draft-ptr-schema.ts`
- `docs/AI_IMPLEMENTATION_MATRIX.md`
- `src/lib/ai/skill-schemas.ts`
- `src/lib/ai/prompt-packs.ts`
- `src/lib/ai/skill-registry-v2.ts`
- `src/lib/ai/providers/provider-types.ts`
- `src/lib/ai/providers/mock-provider.ts`
- `src/lib/ai/providers/product-ai-provider.ts`
- `src/lib/ai/providers/openai-provider.ts`
- `src/lib/ai/providers/claude-provider.ts`
- `src/lib/ai/providers/provider-factory.ts`
- `src/app/api/ai/run-skill/route.ts`
- `.env.example`
- `docs/AI_CONNECTION_SETUP.md`
- `docs/AI_IMPLEMENTATION_MATRIX.md`
- `docs/NEXT_IMPLEMENTATION_PLAN.md`
- `docs/ROADMAP.md`
- `docs/AI_SKILL_REGISTRY.md`
- `docs/DECISION_LOG.md`
- `docs/SESSION_HANDOFF.md`

## Important decisions made

- SRS generation is route-backed real-ai-ready, but remains preview/export only; it does not create or persist Artifact Graph nodes.
- SRS requirements use stable ids (`FR-*`, `NFR-*`) and preserve `ProcessTask.stepId` / BRD requirement references where available.
- `brd-to-srs` and `notes-to-srs` are the active real-ai-ready SRS route ids; `ptr-to-srs-outline` remains a deterministic legacy/full-draft path.
- Template Hub AI Template Review remains display/review-only in this slice; even low-risk template recommendations are not applied automatically.
- Product Delivery Core now has a canonical validated draft model, but it remains preview/export only until Artifact Graph persistence is intentionally added.
- BRD generation is now real-ai-ready through the server-side skill route, but still preview/export only; it does not create or persist Artifact Graph nodes.
- `notes-to-brd` supports notes/chat and optional uploaded file text by payload contract. The current UI provides a paste field for uploaded file text because raw File Intake extraction text is not yet persisted as a reusable source artifact.
- Product Delivery markdown is derived from the validated structured draft, not maintained as a separate source of truth.
- Product Delivery download requires an existing preview draft to preserve Draft -> Preview -> Export behavior.
- Template Review output now includes warnings and assumptions as first-class review metadata.
- AI artifact review is read-only for generated BPMN/draw.io XML; any fix must be represented as a PTR QA recommendation or Template recommendation.
- `artifact-review` uses general `ENABLE_REAL_AI` for provider-backed execution and mock/local fallback otherwise.
- Artifact review UI currently previews counts and warnings to keep D01/D02 output panels uncluttered; deeper recommendation handoff to QA Panel/Template Hub is a later slice.
- AI QA V2 treats rule QA as the first-pass source of deterministic issues and recommendations.
- AI QA may return `source=hybrid` when it extends a rule recommendation with extra rationale/context.
- Graph-changing AI recommendations are always high risk/high impact and require explicit confirmation, regardless of provider output.
- PTR AI Assistant uses `process-improvement-recommendation` rather than adding six separate skill ids for this slice; the selected action is carried in `metadata.ptrAiAction`.
- PTR AI Assistant outputs `QARecommendation[]` so it can reuse existing QA Panel preview/apply/feedback behavior.
- PTR AI Assistant does not mutate `ProcessTask[]` directly.
- Module 2 Draft PTR source skills now use canonical route ids `input-brief-to-ptr`, `file-to-ptr-draft`, and `chat-to-ptr-draft`.
- `qualityIssues` is now part of the Draft PTR AI output contract alongside assumptions, open questions, source summary, confidence, and quality gate warnings.
- File Intake real AI support uses locally extracted text only; OCR/image extraction remains explicitly unsupported.
- AI Connection Center remains a non-secret browser preference UI; provider secrets stay in server env only.
- Test Connection reports server-side readiness and does not perform direct browser provider calls.
- Per-skill provider overrides are stored as local UI preferences in this slice; server execution remains governed by env/config and AI Orchestration V2.
- `/api/ai/run-skill` remains the controlled server-side AI entrypoint for MVP1-AI.
- Orchestration V2 blocks malformed or schema-invalid AI output and returns reviewable validation errors.
- `ai-template-review` remains the UI/route skill id, mapped internally to registry skill `template-review`.
- Server data mode can force local/mock behavior with `AI_DATA_USAGE_MODE=local-only`.
- AI Skill Registry V2 is now the contract layer for Module 2 and Module 3 real AI work.
- Prompt packs are provider-neutral and do not expose API keys or browser-only provider behavior.
- Module 3 and AI Coding Pack now have structured response schemas with route/UI wiring for the active MVP1-AI Product Delivery flows.
- AI Provider Adapter V2 is now the server-side provider abstraction for active AI skill routes.
- Product AI, OpenAI, Claude, and Mock share the same normalized response shape.
- Product AI and Claude are now implemented as server-side adapters, but still require real environment configuration and provider contract testing before production use.
- Product Delivery BRD, SRS, story, criteria, scope/MVP, and AI Coding Pack flows are now route-backed real-ai-ready, preview/export only.
- MVP1 release is delayed until Module 2 Process Modeling Core and Module 3 Product Delivery Core are complete with safe real AI support.
- The active planning branch is now `feature/m2-m3-full-ai`.
- The release target is now `v0.8.0-mvp1-ai`.
- Real AI must remain server-side only, feature-flagged, schema-validated, previewed, and user-approved before apply/save/export.
- Mock/local fallback remains required.
- No API keys should be exposed in browser code.
- AI output must not be auto-applied.

## Current blockers

## RC4 lightweight guidance blocks update - 2026-05-11

- Added concise collapsible "How it works" guidance blocks for Process Modeling, Template Hub, Product Delivery, and AI Development Handoff.
- Each guide uses three short steps and follows the current locale instead of showing bilingual copy by default.
- Kept the guidance visually lightweight so it supports new users without adding another dense panel to the main workflow.
- Kept the change UI-only: no business logic, data model, canonical schema, D01/D02 generator, AI provider route/adapter, browser secret handling, or AI auto-apply behavior was changed.

## RC4 Workspace guided dashboard update - 2026-05-11

- Redesigned Workspace into a guided RC4 dashboard for new users.
- Added a clear hero journey from brief/file/template to PTR, D01 BPMN/D02 Service Blueprint, Product Delivery, and AI Development Handoff Pack.
- Added six Quick Start cards: Start from brief, Import file, Use banking template, Review process quality, Generate product delivery draft, and Export AI handoff pack.
- Expanded Workspace status cards to cover AI/provider, PTR row count, QA issue summary, D01/D02 artifact status, Product Delivery activity, and Export/Handoff package status.
- Added a Banking Starter Pack preview with five banking templates and Preview/Use template CTAs.
- Kept the change UI-only: no data model, canonical schema, D01/D02 generator, AI provider route/adapter, browser secret handling, or AI auto-apply behavior was changed.

## RC4 i18n cleanup update - 2026-05-11

- Cleaned the base Vietnamese dictionary and removed default bilingual labels from the global shell, module navigation, and Input Brief dictionary entries.
- Localized the most visible RC4 UI surfaces for Vietnamese/English separation across Workspace, AI Connection Center, Input Brief/File Intake, Template Hub, QA Panel, PTR, D01 BPMN, D02 Service Blueprint, Product Delivery/Export Center, and AI Run History controls.
- Rebuilt D01/D02 output panels with locale-aware labels/messages while preserving generator logic, server-side AI review route usage, and preview-only review behavior.
- Kept canonical enum values, internal schema keys, technical artifact filenames (`AGENTS.md`, `CLAUDE.md`, `cursor-rules.md`, `spec.json`), and provider names in English where they identify technical artifacts/providers.
- No API key handling, provider adapter behavior, schema, D01/D02 generator logic, or AI auto-apply workflow was changed.

- Artifact review recommendations are validated and returned by the route, but the D01/D02 UI currently shows counts/warnings only; full handoff into QA Panel and Template Hub still needs a scoped follow-up.
- Excel File Intake still uses deterministic local row extraction rather than the new real AI file-to-PTR route because it already produces PTR rows directly.
- Pasted Chat/Notes is a lightweight text-to-draft flow only; it is not a persistent conversational agent.
- The branch may still need to be created or switched in git if it does not already exist.
- Module 3 Jira export and scope/non-scope definition aliasing still need scoped task breakdown using Registry V2.
- Product Delivery BRD route support exists; full Artifact Graph persistence and durable server-side audit are still pending.
- Product AI endpoint contract is generic and needs integration testing with the actual hosted Product AI service.
- Provider-specific Claude/OpenAI schema repair and contract tests are not implemented yet; only route-level malformed JSON repair exists.
- AI Connection Center per-skill override is not wired to server execution yet.
- Full Artifact Graph is intentionally not part of MVP1-AI.

## Next recommended task

Verify Module 3 Product Delivery flows with Mock/Product AI/OpenAI/Claude provider modes, then add Jira-ready export and requirement quality check.

## Exact prompt for next ChatGPT session

Paste this:

"Day la phien tiep theo cua Process Blueprint AI Workbench. Hay doc context trong project/repo, dac biet PRODUCT_CONTEXT.md, CURRENT_STATE.md, NEXT_IMPLEMENTATION_PLAN.md, ROADMAP.md, AI_SKILL_REGISTRY.md, DECISION_LOG.md va SESSION_HANDOFF.md. Truoc tien hay tom tat trang thai hien tai, quyet dinh da chot, viec can lam tiep theo, sau do moi de xuat plan."

## Exact prompt for next Codex session

Paste this:

"Ban dang lam trong repo D:\AI_PRODUCTS\process-blueprint-ai-workbench. Hay doc AGENTS.md va cac tai lieu docs/CURRENT_STATE.md, docs/PRODUCT_CONTEXT.md, docs/NEXT_IMPLEMENTATION_PLAN.md, docs/ROADMAP.md, docs/AI_SKILL_REGISTRY.md, docs/DECISION_LOG.md, docs/SESSION_HANDOFF.md truoc khi code. Sau do chay git status --short. Neu can sua file, hay neu plan bang tieng Viet, liet ke file du kien sua, roi moi trien khai thay doi nho nhat can thiet. Current phase la Complete Module 2 + Module 3 with full real AI support, branch muc tieu la feature/m2-m3-full-ai, release target la v0.8.0-mvp1-ai."
