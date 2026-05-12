# Session Handoff

## Last updated

2026-05-12

## Current branch

`feature/mvp1-ai-rc7-final-release-cleanup`

## Current product phase

Complete Module 2 + Module 3 with full real AI support.

## Release target

`v0.8.0-mvp1-ai`

## What was done in the last session

- Completed RC7 Block 8 Product Delivery layout and generate-all cleanup.
- Added a top-right primary `Generate All Product Delivery` / `Tạo toàn bộ hồ sơ bàn giao` action in the Product Delivery header.
- Reworked Product Delivery overview into six responsive artifact cards: BRD, SRS, User Stories, Acceptance Criteria, Scope/MVP, and AI Handoff Pack, each with status, primary action, and download when a preview exists.
- Wired Generate All to create preview-first draft artifacts for BRD, SRS, User Stories, Acceptance Criteria, and Scope/MVP using existing Product Delivery generators; nothing is auto-exported or auto-applied.
- Moved remaining Product Delivery draft, Markdown export, Requirement QA, and provider compare controls into Advanced/More surfaces to reduce UI noise while preserving functionality.
- Kept this RC7 cleanup scoped: no Product Delivery schema, ProcessTask schema, D01/D02 generator, AI route/provider adapter, provider secret handling, or AI auto-apply behavior was changed.
- Completed RC7 Block 7 Template Hub tab, upload, and review-action cleanup.
- Renamed Template Hub tabs to `Templates in use` / `Mẫu biểu đang sử dụng` and `Templates library` / `Thư viện mẫu biểu`, and removed Template Review as a standalone tab.
- Moved template review into `Review template with AI` / `Rà soát mẫu bằng AI` actions in Templates in use, template card detail, and Template editor.
- Kept AI Template Review on the existing server-side `/api/ai/run-skill` `ai-template-review` path with provider adapter support, schema validation, and no auto-apply.
- Added MVP JSON TemplateProfile upload in Template editor; uploaded templates open in the basic metadata editor while raw JSON rules remain in Advanced, and other file formats are marked as coming soon.
- Kept this RC7 cleanup scoped: no TemplateProfile schema, D01/D02 generator, AI route/provider adapter, provider secret handling, or AI auto-apply behavior was changed.
- Completed RC7 Block 6 D01/D02 AI review feedback routing cleanup.
- Kept `Review BPMN with AI` and `Review Service Blueprint with AI` on the existing server-side `/api/ai/run-skill` `artifact-review` route with OpenAI/Claude/Product AI/mock support through the provider adapter.
- Ensured artifact review feedback lands in QA Engine with visible source labels `BPMN AI Review` and `Service Blueprint AI Review`.
- Updated D01/D02 and QA Engine status messages to report how many recommendations were added to QA Engine after review, while continuing to scroll users to QA Engine.
- Kept artifact review output as QA recommendations or review-only template/artifact findings; no BPMN XML or draw.io XML is modified directly and no AI output is auto-applied.
- Completed RC7 Block 5 QA Engine recommendation toolbar layout cleanup.
- Reworked the QA recommendation toolbar into a responsive first-row action layout: Generate AI recommendations, Apply selected, Apply all safe, Apply all recommendations, and More.
- Highlighted Generate AI recommendations with the existing AI purple button style while keeping the `ai-process-qa` call on the server-side `/api/ai/run-skill` route.
- Moved recommendation filters and AI status into a separate options area so toolbar buttons no longer crowd, overlap, or clip on the right.
- Kept Provider Compare behind the More/advanced toggle and preserved the existing provider-compare confirmation behavior.
- Kept Apply all recommendations preview-first with high-risk and graph-changing counts/warnings before any confirmation; no AI output is auto-applied and feedback logging remains unchanged.
- Kept this RC7 cleanup scoped: no ProcessTask schema, D01/D02 generator, AI route/provider adapter, provider secret handling, feedback store, recommendation apply engine, or AI auto-apply behavior was changed.
- Completed RC7 Block 4 Process Task Register toolbar cleanup.
- Moved PTR AI Assistant into the main header action group next to Save changes and More, while removing the visible bulk-action strip with Select needs-review rows, More AI actions, and Clear selection.
- Changed PTR AI Assistant to run with one click: selected rows are used as context when present, otherwise the full Process Task Register is sent as the default review scope through the existing `/api/ai/run-skill` `process-improvement-recommendation` path.
- Kept PTR AI output as QA recommendations/review findings only; recommendations still require QA Panel preview/confirmation before any apply.
- Exposed row actions directly as Details, Duplicate, and Delete buttons in the table action column instead of hiding Duplicate/Delete behind a row overflow menu.
- Kept this RC7 cleanup scoped: no ProcessTask schema, D01/D02 generator, AI route/provider adapter, provider secret handling, recommendation apply workflow, or AI auto-apply behavior was changed.
- Completed RC7 Block 3 Input with AI cleanup.
- Renamed the main AI intake surface from AI Input Brief to Input with AI / Nhập liệu với AI in navigation, shell labels, and the section title.
- Reorganized Input with AI tabs so Manual Input, Import File, Chat / Notes, and Voice Input coming soon are peer tabs; Chat / Notes now calls the existing `chat-to-ptr-draft` route-backed draft workflow from its own tab.
- Kept Manual Input lighter by limiting suggestion chips behind Show more / Hiển thị thêm disclosure so cards stay compact by default.
- Clarified generation actions as Generate Draft PTR with AI / Tạo PTR nháp bằng AI and Generate local draft / Tạo nháp local, while preserving Draft Preview and explicit user Apply before PTR mutation.
- Kept this RC7 cleanup UI-only: no AI route/provider adapter logic, provider secrets, data model, canonical schema, D01/D02 generator, recommendation apply workflow, or AI auto-apply behavior was changed.
- Completed RC7 Block 2 AI Connection Center redesign into three provider mode cards.
- Replaced the old Product AI / OpenAI / Claude / Local-Mock card set with Platform Provided AI, Your AI, and Local while keeping provider execution routed through the existing server-side adapter path.
- Moved underlying provider, model display name, capability, data mode, feature flags, trust status, and per-skill override details into Advanced Settings; per-skill override is collapsed by default.
- Clarified Your AI copy so MVP configuration uses server environment variables only, with secure BYOK UI marked as coming soon and no browser API-key entry or localStorage secret storage.
- Kept this RC7 cleanup UI/docs-only: no AI route/provider adapter logic, provider secrets, data model, canonical schema, D01/D02 generator, recommendation apply workflow, or AI auto-apply behavior was changed.
- Completed RC7 Block 1 final header and dashboard cleanup.
- Kept the global header focused on product identity and the language selector, with the selector aligned to the right edge of the header container.
- Removed the shell hero/banner that showed the release value proposition text, including `From business intent to governed delivery artifacts.` in English.
- Simplified the Dashboard to a compact Workspace Status surface and removed the Dashboard hero/journey and `Recommended next action` section.
- Kept Quick Start, Banking Starter Pack, and Recent AI Runs out of the Dashboard default view; Banking Starter Pack remains in Template Hub and AI Run History remains in export/audit surfaces.
- Kept this RC7 cleanup UI-only: no business logic, AI route/provider adapter, provider secrets, data model, canonical schema, D01/D02 generator, recommendation apply workflow, or AI auto-apply behavior was changed.
- Hardened AI provider secret boundaries before MVP1-AI release by marking provider/orchestration files as server-only.
- Added `import "server-only";` to the provider factory, OpenAI provider, Claude provider, Product AI provider, and `/api/ai/run-skill` route entrypoint so files that read provider env secrets or instantiate provider calls cannot be imported into client bundles.
- Verified the intended boundary remains: browser components use `/api/ai/run-skill` and sanitized metadata only; provider secrets remain server-side.
- Kept this hardening behavior-preserving: no provider request logic, fallback behavior, AI skill logic, schema, UI, D01/D02 generator, recommendation apply workflow, or `NEXT_PUBLIC_*` secret variable was changed.
- Completed RC6 Block 8 AI setup docs and environment example cleanup for OpenAI, Claude, Product AI, and mock/local fallback.
- Updated `.env.example` with RC6 preferred server-side env names: `AI_DEFAULT_PROVIDER`, `AI_ALLOW_CLOUD`, `AI_REQUIRE_APPROVAL`, `OPENAI_DEFAULT_MODEL`, `CLAUDE_DEFAULT_MODEL`, `PRODUCT_AI_BASE_URL`, and `PRODUCT_AI_DEFAULT_MODEL`, while keeping legacy runtime aliases for compatibility.
- Added provider-factory alias support so the new RC6 env names work through the existing server-side provider adapter path without exposing API keys in browser code.
- Expanded `docs/AI_CONNECTION_SETUP.md` with OpenAI, Claude, Product AI, and mock/local setup instructions, data warnings, server-side-only guidance, and no-`NEXT_PUBLIC_*` secret rules.
- Updated `docs/AI_REAL_PROVIDER_COVERAGE_RC6.md` to reflect the preferred RC6 provider env names and compatibility aliases.
- Kept this RC6 Block 8 scoped to setup/docs/provider-env compatibility: no AI skill logic, prompt logic, data model, canonical schema, D01/D02 generator, recommendation apply workflow, Product Delivery workflow, or AI auto-apply behavior was changed.
- Completed RC6 Block 7 real AI provider coverage audit for OpenAI, Claude, Product AI, and mock/local fallback.
- Added `docs/AI_REAL_PROVIDER_COVERAGE_RC6.md` with per-skill coverage for Input Brief, File Intake, chat/notes draft PTR, PTR AI Assistant, QA Engine, D01/D02 artifact review, Template Review, Product Delivery generation/review skills, Requirement QA, and AI Coding Pack handoff.
- Confirmed by code inspection that active real-AI-ready skills route through `/api/ai/run-skill`, use server-side provider adapters, validate inputs/outputs, keep preview/recommendation/review surfaces, and avoid browser API key exposure.
- Documented RC6 limitations: D01/D02 use shared `artifact-review`, `ptr-to-ai-coding-pack` remains deterministic/legacy in the active UI, Product AI depends on endpoint contract, and planned skills remain out of real-provider coverage.
- Kept this RC6 audit documentation-only: no provider adapter, AI route, schema, data model, D01/D02 generator, UI behavior, or AI auto-apply workflow was changed.
- Completed RC6 Block 6 Product Delivery horizontal card cleanup.
- Reworked the Product Delivery overview into a responsive card grid with Summary, Generate, Review, Export, and AI Development Handoff surfaces.
- Kept `Generate Product Delivery Draft` as the primary Generate action and left BRD/SRS/User Stories/Acceptance Criteria generation inside the existing More generate actions disclosure.
- Split AI Handoff into its own card with preview, ZIP download, and included-file summary so Export stays focused on previewed JSON/Markdown artifacts.
- Kept this RC6 cleanup UI-only: no Product Delivery AI skill logic, provider route/adapter, provider secrets, data model, canonical schema, D01/D02 generator, or AI auto-apply behavior was changed.
- Completed RC6 Block 5 D01/D02 artifact review routing to QA Engine.
- Kept `Review BPMN with AI` and `Review Service Blueprint with AI` on the existing server-side `artifact-review` skill route with ProcessTask data, selected template, generated XML, and rule QA issues as input.
- Routed returned PTR `QARecommendation[]` into QA Engine via the existing recommendation preview/confirmation/apply workflow instead of leaving counts only in D01/D02 panels.
- Added review-only QA Engine visibility for `TemplateRecommendation[]` and artifact warnings, with a Template Hub link for any template update.
- Updated D01/D02 review status messages to report how many recommendations were added to QA Engine and scroll the user back to QA Engine after review.
- Kept this RC6 cleanup workflow-only: no BPMN/draw.io XML mutation, no D01/D02 generator change, no AI provider adapter change, no data model/schema change, and no AI auto-apply behavior was changed.
- Completed RC6 Block 4 QA Engine recommendation toolbar cleanup.
- Rebalanced the QA Engine recommendation toolbar so `Generate AI recommendations` / `Tạo gợi ý bằng AI` is the prominent AI action, followed by Select safe, Apply selected, Apply all safe, Apply all recommendations, and More.
- Moved Provider Compare out of the default toolbar row and into the More/advanced surface so the main recommendation actions no longer feel crowded.
- Tightened safe recommendation selection so Select safe / Apply all safe exclude graph-changing, high-risk, non-low-risk, and conflicting recommendations.
- Preserved the existing `/api/ai/run-skill` AI QA route, preview/confirmation modal, feedback logging, batch apply audit metadata, and no-auto-apply behavior.
- Kept this RC6 cleanup UI/workflow-only: no AI provider adapter, provider secrets, data model, canonical schema, D01/D02 generator, or recommendation apply engine was changed.
- Completed RC6 Block 3 AI Assistant one-click cleanup for Process Task Register.
- Changed the PTR `AI Assistant` button from a menu opener into a one-click default action that uses the currently selected rows and routes through the existing `process-improvement-recommendation` skill.
- Added lightweight context selection for the default PTR AI action: infer missing actor/system/lane first, then missing input/output, split complex task, interaction/channel, or wording improvement.
- Moved the old PTR AI action choices into `More AI actions` / `Tác vụ AI nâng cao` so advanced options remain available without blocking the default click.
- Kept AI output as QA recommendations in the existing QA Panel preview/confirmation/apply workflow, and added clearer local/mock fallback copy when no external provider call is made.
- Kept this RC6 cleanup UI/workflow-only: no AI provider route/adapter, provider secrets, data model, canonical schema, D01/D02 generator, recommendation apply logic, or AI auto-apply behavior was changed.
- Completed RC6 Block 2 AI Input Brief generation-action clarity cleanup.
- Clarified the Manual Input draft actions so Real AI mode shows `Tạo PTR nháp bằng AI` / `Generate Draft PTR with AI` as the primary AI action and keeps `Tạo PTR nháp local/mock` / `Generate local/mock Draft PTR` as the secondary local path.
- Clarified mock/local mode so the primary action is `Tạo PTR nháp` / `Generate Draft PTR`, with helper text stating no external provider is called and the AI action disabled until Real AI is enabled.
- Preserved the existing `input-brief-to-ptr` server-side route flow, schema validation, Draft PTR preview, explicit Replace/Append approval, local/mock fallback behavior, audit logging, and no-auto-apply rule.
- Kept this RC6 cleanup UI/copy-only: no AI provider route/adapter, provider secrets, data model, canonical schema, D01/D02 generator, or provider execution logic was changed.
- Completed RC6 Block 1 header and navigation cleanup.
- Removed the horizontal module menu from the sticky header so primary navigation now relies on the sidebar/section order.
- Removed noisy AI status/provider/data-mode chips from the header and hero surface; AI mode/data mode remain available in AI Connection Center and the compact footer summary.
- Enforced the visible module/page order: Dashboard, AI Connection Center, AI Input Brief, Process Task Register, QA Engine, Generate D01 BPMN XML, Generate D02 Service Blueprint, Template Hub, Product Delivery, and Output Package ZIP.
- Kept this RC6 cleanup UI-only: no AI provider route/adapter, provider secret handling, data model, canonical schema, D01/D02 generator, recommendation apply workflow, or AI auto-apply behavior was changed.
- Completed the MVP1-AI RC5 final visual consistency pass.
- Tightened Dashboard spacing and reused shared section/card styling while keeping Quick Start, Banking Starter Pack, and Recent AI Runs out of the default dashboard.
- Normalized Template Hub guide/current-template cards with shared Advanced, compact card, button, badge, and empty-state styling so the module stays lighter by default.
- Refined Product Delivery action hierarchy: one primary Generate draft action, AI generation/review actions use AI styling, and export actions no longer appear as a dense stack of primary buttons.
- Kept Output Package ZIP focused on final package/export status with AI Run History still inside Advanced.
- Kept this RC5 visual pass UI-only: no data model, canonical schema, AI provider route/adapter, D01/D02 generator, recommendation confirmation/apply workflow, browser secret handling, or AI auto-apply behavior was changed.
- Completed the MVP1-AI RC5 final i18n and copy cleanup.
- Reviewed the visible RC5 module order from Dashboard through Output Package ZIP for obvious mixed-language labels, helper text, buttons, and status copy.
- Cleaned Vietnamese UI copy in AI status, AI Connection Center, AI Input Brief, QA Engine, Product Delivery, and Output Package ZIP where English terms were not required.
- Preserved technical/provider/product names such as OpenAI, Claude, Product AI, Process Task Register/PTR, BRD, SRS, BPMN, AGENTS.md, CLAUDE.md, and spec.json.
- Kept this RC5 cleanup copy-only: no data model, canonical schema, AI provider route/adapter, D01/D02 generator, recommendation apply workflow, browser secret handling, or AI auto-apply behavior was changed.
- Completed the MVP1-AI RC5 Output Package ZIP cleanup.
- Kept Output Package ZIP focused on artifact status cards, Generate all artifacts, Download ZIP, Export Audit Log JSON, and Export AI Run History JSON.
- Kept AI Run History visible/exportable inside the existing Advanced expandable section so it does not dominate the default Output Package ZIP screen.
- Preserved Product Delivery generation inside the dedicated Product Delivery module and kept Output Package ZIP as the final packaging/export module.
- Kept this RC5 cleanup UI-only: no export artifact generator, Product Delivery skill logic, AI provider route/adapter, ProcessTask model, canonical schema, D01/D02 generator, browser secret handling, or AI auto-apply behavior was changed.
- Completed the MVP1-AI RC5 Product Delivery action cleanup.
- Reorganized Product Delivery actions into three clear groups: Generate, Review, and Export.
- Made `Generate Product Delivery Draft` the single primary Generate action and moved BRD/SRS/User Stories/Acceptance Criteria generation into a collapsed more-actions area.
- Moved `Generate MVP Slicing` into the Review group alongside `Run Requirement QA` and `Review Product Scope`.
- Kept export actions focused on BRD/SRS/Stories/AC JSON, Product Delivery Markdown, and AI Handoff Pack ZIP.
- Kept this RC5 cleanup UI-only: no Product Delivery skill logic, AI provider route/adapter, ProcessTask model, canonical schema, D01/D02 generator, browser secret handling, or AI auto-apply behavior was changed.
- Completed the MVP1-AI RC5 QA Engine recommendation-action cleanup.
- Renamed the QA surface title to `QA Engine` and added the clear `Generate AI recommendations` / `Tạo gợi ý bằng AI` action while keeping the existing `ai-process-qa` server-side route/provider-adapter flow.
- Made mock/local status explicit beside the AI recommendation action so users can see when no external provider call is used.
- Added visible recommendation actions for Apply selected, Apply all safe, and Apply all recommendations; all three still open preview/confirmation before apply.
- Added Apply all recommendations confirmation details for total recommendations, high-risk count, graph-changing count, affected steps, conflicts, warnings, and an explicit all-recommendations warning.
- Preserved Select safe safeguards so graph-changing/high-risk recommendations are not selected by default, while keeping explicit Apply all available after confirmation.
- Kept this RC5 cleanup UI/workflow-only: no recommendation schema, ProcessTask model, AI provider route/adapter, D01/D02 generator, browser secret handling, feedback logging, audit logging, or AI auto-apply behavior was changed.
- Completed the MVP1-AI RC5 AI Input Brief Draft PTR visibility cleanup.
- Hid Draft PTR validation/errors until the user explicitly starts a Generate Draft PTR / Generate with AI / file or notes draft generation action.
- Kept the Draft PTR preview hidden until draft rows exist, renamed the preview heading to `Bản nháp Process Task Register` / `Draft Process Register`, and preserved explicit Replace/Append approval before applying.
- Cleared stale validation errors and draft previews when the brief, chat/notes, selected files, or reset/cancel actions change the source context.
- Kept this RC5 cleanup UI-state only: no AI provider route/adapter, provider secrets, data model, Process Task Register schema, D01/D02 generator, or AI auto-apply behavior was changed.
- Completed the MVP1-AI RC5 AI Connection Center provider-card cleanup.
- Simplified provider cards so each card shows provider name, short description, and server-derived status only.
- Replaced noisy Mode/Selected/Real AI style badges in provider cards with a single selected-card border/highlight and small `Current provider` text.
- Moved technical AI details into Advanced Settings: current mode, browser provider preference, server provider, effective provider, data mode, model, feature flags, and the existing trust summary.
- Kept the data warning visible but more compact, and preserved the server-side provider route boundary with no browser API key exposure.
- Kept this RC5 cleanup UI-only: no provider logic, AI route, provider adapter, data model, D01/D02 generator, or AI auto-apply behavior was changed.
- Completed the MVP1-AI RC5 Dashboard and navigation cleanup.
- Reordered the header and sidebar modules into the release workflow order: Dashboard, AI Connection Center, AI Input Brief, Process Task Register, QA Engine, Generate D01 BPMN XML, Generate D02 Service Blueprint, Template Hub, Product Delivery, and Output Package ZIP.
- Simplified Dashboard by removing the visible Quick Start, Banking Starter Pack, and Recent AI Runs sections while keeping workspace summary, AI status, artifact/process/product/export status, and recommended next action.
- Kept Banking Starter Pack in Template Hub and kept AI Run History in the Output Package ZIP / Export Center advanced audit surface.
- Moved the QA Engine surface after the Process Task Register table in the page flow while preserving the existing recommendation preview/confirmation/apply workflow.
- Kept this RC5 cleanup UI-only: no data model, canonical schema, D01/D02 generator, AI provider route/adapter, browser secret handling, or AI auto-apply behavior was changed.
- Completed the final MVP1-AI RC4 visual consistency pass.
- Added shared UI primitives for section headers, action rows, status messages, empty states, advanced panels, and raw previews.
- Normalized `SessionFrame` header/action spacing so major modules share a more consistent SaaS workbench frame.
- Polished D01 BPMN and D02 Service Blueprint surfaces with consistent section labels, status messages, review summaries, and Advanced raw XML panels without changing generator behavior.
- Standardized File Intake action buttons and error/status messages while preserving supported-file handling, stale draft clearing, and draft preview/apply flow.
- Moved Product Delivery raw markdown/JSON/spec previews behind Advanced panels so non-technical users see summary cards first and technical users can still inspect raw output.
- Localized and visually normalized QA recommendation confirmation modals while preserving preview-before-apply, batch confirmation, feedback logging, and graph-changing recommendation safeguards.
- Kept this RC4 pass UI-only: no data model, canonical schema, D01/D02 generator, AI provider route/adapter, browser secret handling, or AI auto-apply behavior was changed.
- Improved AI trust UX and provider status clarity for MVP1-AI RC4.
- Added a shared AI trust status component for the global shell and AI Connection Center, showing Mock/Real AI mode, selected/effective provider, data mode, and whether an external provider call is possible.
- Updated the global header/hero/footer status surfaces to use the unified trust summary instead of separate local formatting.
- Updated AI Connection Center provider cards so selected providers are clear, while missing-env or disabled providers no longer look like primary ready providers.
- Added missing-env setup guidance that points to `.env.local` / server env and keeps API keys out of browser UI.
- Polished AI Run History safe-detail copy while keeping history metadata-only and not storing full prompts or full model outputs.
- Kept provider routes/adapters, AI schemas, D01/D02 generators, browser secret handling, and AI apply/approval behavior unchanged.
- Improved Process Task Register UX for MVP1-AI RC4.
- Kept Simple mode focused on business-readable columns while adding clearer Simple/Advanced helper text.
- Improved the bulk action area with selected row count shown against total rows and a quick action to select rows with `needsReview` status.
- Kept Advanced mode as the full technical field set and preserved the existing row detail drawer for full-row inspection.
- Improved row action accessibility while preserving Add/Edit/Duplicate/Delete/Save/import/export behavior.
- Kept the `ProcessTask` schema, D01/D02 generators, AI provider logic, and AI recommendation preview/approval flow unchanged.
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

## RC4 QA Panel guided review workflow update - 2026-05-11

- Refined QA Panel into a guided review workflow with existing summary cards, recommended next action, and tabs for Critical, Warnings, Suggestions, Recommendations, and Advanced structure changes.
- Kept issue cards focused on title/affected step, why it matters, suggested fix, and compact recommendation metadata.
- Ensured graph-changing recommendations are separated into Advanced structure changes, hidden by default, excluded from Select safe, and not selectable for batch preview/apply.
- Kept recommendation cards preview-first with `Preview change`; apply remains available only after confirmation in the preview dialog.
- Preserved existing recommendation generation, preview/apply helpers, confirmation flow, feedback logging, provider compare route usage, and local audit behavior.
- No ProcessTask schema, recommendation schema, D01/D02 generator, AI provider route/adapter, browser secret handling, or AI auto-apply behavior was changed.

## RC4 Product Delivery dedicated module update - 2026-05-11

- Promoted Product Delivery into the navigation section list so it appears as a real primary sidebar module, aligned with the existing top menubar tab.
- Reframed the Product Delivery surface as a dedicated page instead of an Export Center subsection.
- Added Product Delivery section navigation for Overview, BRD, SRS, User Stories, Acceptance Criteria, Scope/MVP, and AI Development Handoff Pack.
- Added overview status cards for Product Delivery artifacts and lightweight empty states for artifact sections before previews exist.
- Kept the existing Generate, Review, and Export grouped action cards and preserved all generation, review, download, ZIP, and audit logging behavior.
- Kept Export Center focused on output package ZIP, artifact statuses, audit log export, and AI Run History export.
- No data model, canonical schema, D01/D02 generator, AI provider route/adapter, browser secret handling, or AI auto-apply behavior was changed.

## RC4 Template Hub gallery redesign update - 2026-05-11

- Polished Template Hub into a clearer template gallery with progressive disclosure.
- Kept the existing four tabs: Current templates, Browse templates, Template review, and Editor, while reducing global header actions that made the module feel like an admin config page.
- Made Current templates show D01/D02 selections with compatibility/status signals and contextual quick actions for browse, preview, and editor.
- Made Browse templates easier to scan with gallery cards showing only name, output type, domain, process type, status, short tags, Preview, and compatible Use D01/D02 actions.
- Moved fields count, version, notation standard, mandatory fields, and raw rule JSON into collapsed details/advanced drawers.
- Kept Template Review no-auto-apply, Provider Compare advanced/off by default, Basic editor first, and Advanced JSON rules collapsed by default.
- Kept the change UI-only: no TemplateProfile schema, D01/D02 generator, AI provider route/adapter, browser secret handling, or AI auto-apply behavior was changed.

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
