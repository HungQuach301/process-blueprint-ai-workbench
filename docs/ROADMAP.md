# Product Roadmap

## Phase 0 - Planning Pivot and Governance Alignment

Goal:
Move the project plan from an immediate MVP1 release to an MVP1-AI release after Module 2 and Module 3 are complete with safe real AI support.

Scope:
- Align implementation plan, roadmap, AI Skill Registry, decision log, and session handoff.
- Keep Process Task Register as the canonical process source for Module 2 artifacts.
- Keep real AI behind server-side skill routes, feature flags, schema validation, and user approval.
- Preserve mock/local fallback.

Success criteria:
- The active release target is `v0.8.0-mvp1-ai`.
- The active planning branch is `feature/m2-m3-full-ai`.
- No application code is required for the planning pivot.

## Phase 1 - MVP1-AI: Full Module 2 + Module 3

Goal:
Release an individual-first MVP for PO, BA, SA, Product Manager, Business Architect, and Solution Architect users that proves the core process-to-product-delivery workflow with real AI support.

Release target:
`v0.8.0-mvp1-ai`

### Module 2 - Process Modeling Core

Scope:
- AI Input Brief to Draft Process Task Register.
- File Intake to Draft Process Task Register.
- Process Task Register edit/save/import/export.
- D01 BPMN generation from Process Task Register and selected template.
- D02 Service Blueprint generation from Process Task Register and selected template.
- QA Panel with rule QA and AI-assisted review.
- Recommendation Engine with preview, confirmation, feedback logging, and no auto-apply.
- Template Hub with D01/D02 template selection, review, and recommendation workflow.
- Export Center with process artifacts, AI Coding Pack, and audit-ready metadata.
- Banking starter templates and domain pack structure where useful for MVP1-AI.

### Module 3 - Product Delivery Core

Scope:
- BRD outline generation.
- SRS outline generation.
- User story generation.
- Acceptance criteria generation.
- Jira-ready export.
- MVP slicing.
- Scope and non-scope drafting.
- Requirement quality check.
- Product delivery exports that preserve traceability to `ProcessTask.stepId` where possible.

### Real AI scope

Required behavior:
- Real AI only through controlled server-side AI skill routes.
- No API key in browser code.
- Feature flags remain available:
  - `ENABLE_REAL_AI`
  - `ENABLE_REAL_AI_QA`
  - `ENABLE_REAL_AI_TEMPLATE_REVIEW`
- Structured input and output.
- Schema validation before display, apply, save, or export.
- Draft / Recommendation / Review Finding -> Preview -> User Apply.
- Mock/local fallback for every MVP1-AI skill.
- Audit metadata for real AI calls.

Recommended MVP1-AI skills:
- `input-brief-to-ptr`
- `file-to-draft-ptr`
- `chat-to-draft-ptr`
- `process-qa-recommendation`
- `template-review`
- `template-recommendation`
- `ptr-to-brd-outline`
- `ptr-to-srs-outline`
- `brd-or-notes-to-user-stories`
- `user-stories-to-acceptance-criteria`
- `user-stories-to-jira-export`
- `requirement-quality-check`
- `user-stories-to-ai-coding-pack`

Success criteria:
- Users can move from notes/files/brief to Draft PTR, QA, D01 BPMN, D02 Service Blueprint, BRD/SRS outline, user stories, acceptance criteria, and exports.
- Real AI can be enabled safely without browser key exposure.
- Every AI output is reviewable before apply, save, or export.
- Module 2 and Module 3 workflows pass manual regression and build checks.

## Phase 2 - Artifact Graph and Traceability

Scope:
- Artifact list.
- Artifact relationship view.
- Traceability Matrix.
- Stale detection.
- Regenerate affected artifacts.
- Compare versions.
- Cross-artifact QA.

## Phase 3 - UI / Experience Generation

Scope:
- Requirement to UI Spec.
- User Story to Screen Inventory.
- Process Step to Screen Flow.
- Field and Validation definition.
- UI prompt export for AI coding tools.

## Phase 4 - Business Architecture

Scope:
- Business Capability Landscape.
- Process-to-capability mapping.
- Value stream mapping.
- Business object map.
- Policy, risk, and control mapping.

## Phase 5 - IT / Solution Architecture

Scope:
- IT Capability Landscape.
- Application Landscape.
- Integration and Data Flow.
- Solution Blueprint.
- Non-functional requirement mapping.
- Architecture decision support.

## Phase 6 - Team and Commercial Readiness

Scope:
- User account.
- Workspace sharing.
- Team templates.
- Team rule packs.
- Comments and review.
- Version history.
- BYOK paid tier.
- Watermark control.

## Phase 7 - Enterprise

Scope:
- Organization workspace.
- SSO.
- RBAC.
- Enterprise audit.
- Compliance/domain rule packs.
- Private deployment.
- Enterprise AI endpoint.
- Process mining integration.
- Spec drift detection vs code.
