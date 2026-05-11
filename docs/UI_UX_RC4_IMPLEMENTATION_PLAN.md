# UI/UX RC4 Implementation Plan

## Purpose

This plan breaks the MVP1-AI RC4 UX polish into small implementation blocks that can be delivered and verified independently.

RC4 should move the app from an internal technical prototype to a polished demo-ready workbench for PO, BA, SA, Product Manager, Business Architect, and Solution Architect users.

This document is a planning artifact only. No application code is changed in this documentation block.

## Guardrails

- Keep Process Task Register as the canonical source for process artifacts.
- Do not change `ProcessTask`, `TemplateProfile`, Product Delivery, or AI response schemas unless a later task explicitly requires it.
- Do not modify D01 BPMN or D02 Service Blueprint generator behavior unless a later task explicitly asks for generator work.
- Do not expose provider secrets in browser code.
- Keep provider calls server-side through controlled route/provider adapters.
- Do not auto-apply AI output.
- Keep AI output flow as Draft / Recommendation / Review Finding -> schema validation -> quality gate -> preview -> user approval -> apply/export.
- Keep locale separation strict: English locale shows English-only UI, Vietnamese locale shows Vietnamese-only UI.
- Keep canonical enum/internal values in English.
- Use progressive disclosure: Guided mode for non-tech users and Advanced/Power mode for technical users.
- Do not copy text, image, layout, or branding from Edraw.AI or any other product.

## Recommended Sequence

1. App Shell + Theme
2. i18n cleanup
3. Workspace Dashboard
4. Template Hub redesign
5. Product Delivery module
6. QA Panel redesign
7. PTR table UX
8. Export/Audit polish

The sequence starts with shared navigation/theme and language cleanup because every later UX block depends on a coherent shell and clean labels.

## Block 1: App Shell + Theme

### Priority

P0

### UX goal

Make the app feel like a coherent product instead of a collection of technical panels.

### Scope

- Add or polish a global header with product identity, primary module tabs, AI status, and language selector.
- Add or polish a contextual sidebar grouped by module.
- Add or polish a footer with version, AI mode, data mode, and local/privacy note.
- Normalize global theme tokens:
  - primary blue
  - AI purple
  - success green
  - warning amber
  - danger red
  - slate neutral
- Normalize typography, spacing, 8px card radius, shadows, panel spacing, and button hierarchy.

### Likely future files

- `src/app/page.tsx`
- `src/app/globals.css`
- `src/lib/i18n.ts`

### Acceptance criteria

- Primary modules are visible and scannable.
- Sidebar helps users understand where they are.
- Footer communicates mode and privacy posture.
- Visual language is consistent across major modules.
- No business logic changes.

## Block 2: i18n cleanup

### Priority

P0

### UX goal

Remove mixed-language friction so users trust the product in either English or Vietnamese.

### Scope

- Audit header, sidebar, footer, Workspace, AI Connection Center, Input Brief, File Intake, Template Hub, QA Panel, Process Task Register, D01, D02, Product Delivery, Export Center, and AI Run History.
- Move hardcoded user-facing text into dictionaries where practical.
- Keep technical artifact names in English where appropriate:
  - `AGENTS.md`
  - `CLAUDE.md`
  - cursor rules
  - `spec.json`
- Keep canonical enum/internal values unchanged.

### Likely future files

- `src/lib/i18n.ts`
- `src/app/page.tsx`
- focused component files if the current implementation has split UI modules.

### Acceptance criteria

- English locale does not show Vietnamese UI copy.
- Vietnamese locale does not show English UI copy except approved technical artifact names.
- Internal values and export formats remain canonical.

## Block 3: Workspace Dashboard

### Priority

P0

### UX goal

Make Workspace the starting point for a new user, not a placeholder.

### Scope

- Add overview cards:
  - AI status
  - PTR status
  - QA status
  - Artifact status
  - Product Delivery status
- Add Start here actions:
  - Create from brief
  - Import file
  - Review QA
  - Generate Product Delivery
  - Export package
- Add recommended next action based on local state.
- Add recent AI run summary using metadata only.
- Remove placeholder or skeleton wording.

### Likely future files

- `src/app/page.tsx`
- `src/lib/i18n.ts`

### Acceptance criteria

- New users can identify the next step in under a minute.
- Existing users can jump to active work quickly.
- No AI output is applied automatically.

## Block 4: Template Hub redesign

### Priority

P0

### UX goal

Make templates easy to browse for non-tech users while preserving technical metadata for power users.

### Scope

- Split Template Hub into clear sections or tabs:
  - Current templates
  - Browse templates
  - Template review
  - Editor
- Simplify template cards:
  - name
  - output type
  - domain
  - process type
  - status
  - short recommended-for/tags
- Move detailed metadata to drawer/details.
- Show `Use D01` only for BPMN-compatible templates.
- Show `Use D02` only for Service Blueprint-compatible templates.
- Move Provider Compare to Advanced mode.
- Keep the editor from dominating the browse view.

### Likely future files

- `src/app/page.tsx`
- `src/lib/i18n.ts`

### Acceptance criteria

- Users can quickly see active templates and browse the library.
- Technical users can still inspect and edit full metadata.
- Template recommendation remains preview/review-only and is not auto-applied.
- `TemplateProfile` schema remains unchanged unless explicitly required later.

## Block 5: Product Delivery module

### Priority

P0

### UX goal

Make Product Delivery a primary work area rather than a long action stack inside Export Center.

### Scope

- Add Product Delivery as a primary navigation module if not already present.
- Organize Product Delivery around:
  - BRD
  - SRS
  - User Stories
  - Acceptance Criteria
  - Scope Review
  - MVP Slicing
  - AI Development Handoff Pack
- Replace long button stacks with grouped action cards:
  - Generate
  - Review
  - Export
- Keep preview-before-download behavior.
- Keep all generation/export logic intact.

### Likely future files

- `src/app/page.tsx`
- `src/lib/i18n.ts`

### Acceptance criteria

- Product Delivery no longer feels like an Export Center sub-feature.
- Users understand which artifacts can be generated, reviewed, and exported.
- No existing functionality is removed.

## Block 6: QA Panel redesign

### Priority

P0

### UX goal

Turn QA from an issue dump into a guided review workflow.

### Scope

- Add QA summary cards:
  - Critical
  - Warnings
  - Suggestions
  - Recommendations
- Add a recommended next action.
- Organize findings into tabs or grouped sections:
  - Critical
  - Warnings
  - Suggestions
  - Recommendations
  - Advanced structure changes
- Keep graph-changing recommendations hidden by default.
- Replace direct apply actions on cards with `Preview change`.
- Require confirmation before apply.
- Make cards less text-heavy:
  - issue title
  - why it matters
  - suggested fix
  - affected step
- Preserve recommendation logic and feedback logging.

### Likely future files

- `src/app/page.tsx`
- `src/lib/i18n.ts`

### Acceptance criteria

- Non-tech users can understand issue severity and next action.
- Tech users can still access advanced graph-changing recommendations.
- Safe and advanced actions are visually distinct.

## Block 7: PTR table UX

### Priority

P0

### UX goal

Make Process Task Register readable for non-tech users while keeping full technical control available.

### Scope

- Add or polish Simple mode columns:
  - Step ID
  - Task name
  - Actor
  - System
  - Phase
  - Next step
  - Review status
- Keep Advanced mode with full technical columns.
- Add sticky header and sticky key columns where feasible.
- Add row detail drawer for full row fields where feasible.
- Add save state:
  - Saved
  - Unsaved changes
  - Saving
- Keep Add/Edit/Duplicate/Delete/Save logic intact.

### Likely future files

- `src/app/page.tsx`
- `src/lib/i18n.ts`

### Acceptance criteria

- Non-tech users can read the process flow in Simple mode.
- Technical users can switch to Advanced mode without losing fields.
- `ProcessTask` schema remains unchanged.

## Block 8: Export/Audit polish

### Priority

P1

### UX goal

Make export and audit feel governance-ready without competing with primary creation/review workflows.

### Scope

- Keep Export Center focused on:
  - output package ZIP
  - artifact statuses
  - audit exports
- Keep AI Run History metadata-only and available for audit.
- Move advanced audit details behind progressive disclosure.
- Keep artifact freshness/staleness visible.
- Make AI Development Handoff Pack understandable to non-tech users while keeping technical file details visible.

### Likely future files

- `src/app/page.tsx`
- `src/lib/i18n.ts`

### Acceptance criteria

- Users understand what can be exported and whether artifacts are ready.
- Audit history is available but does not dominate the primary workflow.
- No prompts, full model outputs, or provider secrets are stored/exposed in browser UI.

## Verification Plan For Each Implementation Block

- Run `npx.cmd tsc --noEmit`.
- Run `npm run build`.
- Manually verify the changed module in both English and Vietnamese locales.
- Confirm no unrelated schemas, generators, or provider adapter behavior changed.
- Confirm AI outputs still require preview and user approval before apply/export.

## RC4 Completion Signal

RC4 UI/UX polish is complete when:

- The app has a coherent shell, theme, navigation, and footer.
- Workspace gives a clear guided journey.
- Template Hub, QA Panel, PTR, Product Delivery, and Export Center use progressive disclosure.
- Non-tech users can move from brief/file to review/export without needing to understand internal schemas.
- Tech-savvy users can still access full technical metadata and advanced controls.
- English and Vietnamese locales are cleanly separated.
- TypeScript and production build pass.
