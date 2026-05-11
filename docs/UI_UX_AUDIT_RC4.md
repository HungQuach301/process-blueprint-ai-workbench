# UI/UX Audit RC4

## Purpose

RC4 goal: move Process Blueprint AI Workbench from an internal technical prototype toward a polished MVP-AI demo experience for PO, BA, SA, Product Manager, Business Architect, and Solution Architect users.

This audit focuses on user clarity, progressive disclosure, visual hierarchy, i18n consistency, and safe AI workflows. It does not propose copying text, images, layout, or branding from Edraw.AI. The useful pattern to learn is: clear entry point, template-first discovery, explicit calls to action, how-it-works guidance, visual preview, and progressive disclosure.

## Audit Principles

- Non-tech users need a guided journey with clear next steps and plain-language outcomes.
- Tech-savvy users need Advanced/Power mode for detailed fields, schemas, audit, AI provider controls, and exported technical artifacts.
- AI output must remain draft, recommendation, or review finding before schema validation, quality gate, preview, user approval, and apply/export.
- Process Task Register remains the canonical model for process artifacts.
- Product direction remains Artifact Graph-centric, but RC4 should not implement Artifact Graph.
- English locale should show English only. Vietnamese locale should show Vietnamese only.
- Technical artifact names can remain English: `AGENTS.md`, `CLAUDE.md`, cursor rules, `spec.json`.

## Summary Priorities

| Priority | Meaning | RC4 interpretation |
| --- | --- | --- |
| P0 | Demo blocker | New users cannot understand where to start, what is safe, or what to do next. |
| P1 | Major polish | Workflow exists but feels dense, inconsistent, or too technical. |
| P2 | Follow-up polish | Improves confidence, aesthetics, or power-user efficiency after core UX is clear. |

## Area Audit

### Workspace

Priority: P0

Current issues:
- Workspace has recently become a dashboard, but it still needs to feel like the product's home rather than a status-only panel.
- It should better explain the end-to-end journey: brief/file -> Draft PTR -> QA -> D01/D02 -> Product Delivery -> AI Development Handoff Pack -> Export.
- Recommended next action is useful, but the dashboard needs stronger visual hierarchy and clearer grouping between "start", "review", and "deliver".

Impact on non-tech users:
- They may still ask "What do I do first?" or "Which artifact matters for me?"
- Status labels can be useful but not enough without a guided journey.

Impact on tech-savvy users:
- They need faster access to advanced areas without losing the simple journey.
- Recent AI run summary is useful, but it should clearly indicate metadata-only audit behavior.

Recommended fixes:
- Add a guided "Start here" strip with the five primary actions and short plain-language outcomes.
- Add a compact "How the workbench works" sequence with 4-5 steps.
- Keep status cards concise and link each card to its module.
- Keep AI run summary metadata-only and move deeper audit details to Export/Audit.

### AI Connection Center

Priority: P1

Current issues:
- Provider configuration and data safety concepts are inherently technical.
- Current status cards are useful but can still feel like infrastructure settings rather than a user-facing AI mode decision.
- Advanced settings can visually compete with basic provider status.

Impact on non-tech users:
- Provider names, feature flags, and data modes may be intimidating.
- They need reassurance that local/mock mode is safe and that API keys are not in the browser.

Impact on tech-savvy users:
- They need quick visibility into provider readiness, fallback behavior, and data mode.
- They need Advanced settings, but not mixed into the primary guided flow.

Recommended fixes:
- Present a simple top summary: "Current AI mode", "External API called?", "Data mode", "Approval required".
- Keep provider cards below the summary.
- Move per-skill override and model details behind Advanced/Power mode.
- Add concise copy that browser never stores provider secrets.

### AI Input Brief

Priority: P0

Current issues:
- The brief flow has the right draft-first architecture, but the visible form can still feel long when mixed with file/chat/draft preview states.
- Users need stronger confidence about what happens after they submit.
- Some labels and helper text may still be too technical or mixed with implementation terms.

Impact on non-tech users:
- They may not understand which sections are required or how much detail is enough.
- Draft PTR preview may feel like a sudden technical artifact if not framed.

Impact on tech-savvy users:
- They need access to raw context, source summary, validation warnings, and draft quality issues.
- They may want advanced fields without making the default form dense.

Recommended fixes:
- Make Guided mode the default with the 7 visible sections.
- Add a clear "What happens next" explanation near the Generate Draft PTR button.
- Keep assumptions, open questions, validation, and source summary in collapsible review panels.
- Put raw payload/debug details in Advanced/Power mode.

### File Intake

Priority: P0

Current issues:
- File Intake has clearer supported-format messaging now, but the "supported vs coming soon" boundary must remain unmistakable.
- File selection, extraction, draft generation, and stale draft clearing should be visually tied together.
- Import file as a workspace action should land the user at the correct visible File Intake area.

Impact on non-tech users:
- Unsupported files can feel like failure unless the message is plain and actionable.
- They need to know the next step after selecting a file.

Impact on tech-savvy users:
- They need file type, extraction status, warnings, and whether real AI or local/mock path will be used.

Recommended fixes:
- Add a dedicated File Intake card in Input Brief with supported format chips.
- Make unsupported file message explicit and non-technical.
- Show file name, type, processing status, draft button, and clear action in a single compact selected-file state.
- Keep extraction warnings in a collapsible technical detail area.

### Template Hub

Priority: P0

Current issues:
- Template Hub has been split into sections, but it remains a high-risk area for visual overload.
- Template metadata, template rules, template review, provider compare, and editor can still compete for attention.
- Template-first discovery should feel more like choosing an output style and less like editing a schema.

Impact on non-tech users:
- Too much template metadata makes it hard to choose D01/D02.
- They need simple labels: what this template is for, whether it is compatible, and when to use it.

Impact on tech-savvy users:
- They need full rule visibility, quality score, metadata, template review output, and editor access.
- They need confidence that recommendations are not auto-applied.

Recommended fixes:
- Keep Current templates and Browse templates as primary.
- Keep Template review and Editor behind tabs or Advanced mode.
- Use simplified cards: name, output type, domain, process type, status, tags, D01/D02 compatibility.
- Put rule JSON, mandatory fields, provider compare, and detailed metadata in drawers/Advanced.

### QA Panel

Priority: P0

Current issues:
- QA Panel has moved toward a review workflow, but it must remain visibly distinct from a raw issue dump.
- Graph-changing recommendations must stay hidden by default and clearly labeled when shown.
- Apply behavior must continue preview-first with confirmation.

Impact on non-tech users:
- Raw issue terminology and recommendation mechanics can be overwhelming.
- They need "what should I fix first?" and "is this safe?" signals.

Impact on tech-savvy users:
- They need affected steps, confidence, risk, operation details, conflicts, and feedback logging.
- They need batch actions but with safety boundaries.

Recommended fixes:
- Keep summary cards for Critical, Warnings, Suggestions, Recommendations.
- Add a recommended next action and make it visually prominent.
- Use tabs for severity groups and Advanced structure changes.
- Replace direct apply wording with Preview change everywhere.
- Keep operation details collapsed by default.

### Process Task Register

Priority: P0

Current issues:
- Simple/Advanced mode now exists, but the PTR is still one of the densest surfaces.
- Sticky columns and row detail drawer help, but table controls need stronger separation between reading, editing, and AI assistance.
- Save state exists but should be consistently visible and understandable.

Impact on non-tech users:
- A wide table can still feel like a database, not a business process.
- They need Simple mode, clear next-step column, review status, and row detail drawer.

Impact on tech-savvy users:
- They need full technical fields, fast edit, duplicate/delete, import/export, AI assistant, and raw field values.
- They need keyboard/table efficiency without sacrificing safety.

Recommended fixes:
- Keep Simple mode as default.
- Add table-level guidance: "read process", "edit rows", "review QA", "generate outputs".
- Keep full technical columns in Advanced.
- Improve row action menu clarity and keep destructive actions visually separated.
- Keep save state visible near Save.

### D01 BPMN

Priority: P1

Current issues:
- D01 preview is valuable, but XML and artifact review details can still crowd the primary diagram flow.
- Users need a clearer "Generate / Preview / Review / Download" sequence.

Impact on non-tech users:
- BPMN can feel technical; visual preview must dominate.
- Raw XML should not appear in the primary path.

Impact on tech-savvy users:
- They need XML, template references, AI artifact review warnings, and download controls.
- They need viewer controls such as fit/zoom.

Recommended fixes:
- Keep diagram preview first.
- Put XML and artifact review details in Advanced.
- Add clear status: Not generated / Stale / Fresh.
- Add short helper copy that D01 is derived from PTR and selected template.

### D02 Service Blueprint

Priority: P1

Current issues:
- D02 is visually useful but can become hard to scan when XML/details are close to the primary preview.
- Users need assurance that one ProcessTask maps to one card and that card overlap is checked.

Impact on non-tech users:
- Service Blueprint should feel like a customer/service view, not an XML generator.
- They need visual preview and download guidance.

Impact on tech-savvy users:
- They need draw.io XML, template row rules, generated status, and artifact review warnings.

Recommended fixes:
- Keep visual preview dominant.
- Group controls into Generate, Review, Download.
- Keep XML in Advanced.
- Add clear stale/fresh status and template/source trace note.

### Product Delivery

Priority: P0

Current issues:
- Product Delivery has been moved into a dedicated module, but the flow can still feel like many generator buttons.
- BRD, SRS, user stories, acceptance criteria, scope review, MVP slicing, and handoff pack need a clearer lifecycle.
- Preview/export-only behavior must be visible.

Impact on non-tech users:
- They need to understand why Product Delivery matters and what sequence to follow.
- Too many actions can make the module feel like a control panel rather than a workflow.

Impact on tech-savvy users:
- They need route-backed skill status, structured JSON previews, trace references, and provider compare in Advanced.

Recommended fixes:
- Organize around stages: Define, Specify, Backlog, Validate, Handoff.
- Use grouped action cards: Generate, Review, Export.
- Show current artifact readiness and last preview state.
- Move Provider Compare to Advanced.
- Keep preview-before-download messaging explicit.

### AI Development Handoff Pack

Priority: P1

Current issues:
- The renamed user-facing title is clearer, but non-tech explanation should stay close to the action.
- Technical file details can overwhelm users if shown too early.

Impact on non-tech users:
- They need to know this is the package to send to a development team or use with Codex, Claude Code, Cursor.
- They do not need to inspect every file unless they choose to.

Impact on tech-savvy users:
- They need included files, `spec.json`, implementation plan, acceptance criteria, test plan, and quality issues.
- They need preview before ZIP download.

Recommended fixes:
- Keep non-tech explanation near the primary action.
- Show included file list in compact form.
- Put file previews and `spec.json` detail in Advanced/details.
- Keep download disabled until preview exists.

### Export Center

Priority: P1

Current issues:
- Export Center should focus on output package ZIP, artifact statuses, audit exports, and release evidence.
- Product Delivery generation should stay out of Export Center primary flow.
- Artifact readiness needs consistent visual language.

Impact on non-tech users:
- They need one clear export package action and confidence that the package is ready.
- Too many secondary exports can distract from the main ZIP.

Impact on tech-savvy users:
- They need per-artifact status, audit JSON, AI Run History export, and package contents.

Recommended fixes:
- Keep main flow: artifact status -> generate package -> download ZIP.
- Keep audit and AI Run History in Advanced / Export evidence.
- Use consistent Fresh/Stale/Not generated badges.
- Link back to modules that need review when status is stale.

### AI Run History

Priority: P1

Current issues:
- AI Run History is important for governance but can dominate if displayed too early.
- It must remain metadata-only and not imply full prompt/output storage.

Impact on non-tech users:
- They may not know why AI run metadata matters.
- Too many fields can be intimidating.

Impact on tech-savvy users:
- They need provider, model, validation status, external API flag, latency, token usage, request id, warnings, and safe errors.

Recommended fixes:
- Keep a short recent summary on Workspace.
- Keep detailed AI Run History under Export/Audit Advanced.
- Add clear "metadata only" copy.
- Highlight failed/invalid runs with suggested next action.

## RC4 P0 Focus

1. App shell, theme, and visual hierarchy must make the product demo-ready.
2. Workspace must guide new users from start to export.
3. i18n cleanup must remove obvious mixed-language UI.
4. Template Hub, QA Panel, PTR, and Product Delivery must use progressive disclosure.
5. Export/Audit must be governance-friendly without dominating the main workflow.
