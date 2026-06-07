# AI Skill Registry

## Skill principles

All AI skills must:
- Use structured input.
- Return structured output.
- Pass schema validation.
- Return assumptions and open questions where relevant.
- Never auto-apply output.
- Require user review before apply, save, or export.
- Write audit metadata when real AI is used.
- Support mock/local fallback where possible.
- Avoid API key exposure in browser code.

## Status legend

- `planned`: Targeted for MVP1-AI, not implemented yet.
- `implemented`: Deterministic or UI workflow exists, but not necessarily connected to real AI.
- `mock`: Mock/local path exists; real AI path still needs implementation or hardening.
- `real-ai-ready`: Server-side real AI path is scaffolded or available with feature flags, schema validation, preview, and mock/local fallback.

## Registry V2 implementation

Runtime registry V2 is defined under:

- `src/lib/ai/skill-registry-v2.ts`
- `src/lib/ai/prompt-packs.ts`
- `src/lib/ai/skill-schemas.ts`

Every V2 skill definition includes:

- `skillId`
- `module`
- `inputSchema`
- `outputSchema`
- `allowedProviders`
- `requiresApproval`
- `dataSensitivity`
- `promptPackId`
- `version`

The registry is intentionally not wired into all UI surfaces yet. It is the contract layer for the next implementation slice, while the active `/api/ai/run-skill` route continues to support the current real-AI-ready skills.

Prompt packs are split into:

- Provider-neutral prompts: JSON-only output, human approval, no browser secrets, no auto-apply.
- Process modeling prompts: Input Brief to PTR, file to PTR, process QA, and template review.
- Product delivery prompts: BRD, SRS, user stories, acceptance criteria, and AI Coding Pack.

Schema helpers now cover:

- `DraftProcessTaskRegister`
- `BRDResponse`
- `SRSResponse`
- `UserStorySetResponse`
- `AcceptanceCriteriaResponse`
- `ProductScopeReviewResponse`
- `AICodingPackResponse`
- `QARecommendationResponse`
- `TemplateRecommendationResponse`

Existing canonical validators are reused where available:

- `validateStructuredProcessBrief`
- `validateDraftProcessTaskRegister`
- `validateAIQARecommendations`
- `validateTemplateReviewOutput`

## MVP1-AI skill plan

MVP1-AI covers full Module 2 Process Modeling Core and Module 3 Product Delivery Core before release.

### Module 2 - Process Modeling Core

| Skill | Status | Purpose | Primary input | Output | Apply behavior |
| --- | --- | --- | --- | --- | --- |
| `input-brief-to-ptr` | `real-ai-ready` | Generate Draft Process Task Register from structured AI Input Brief. | `StructuredProcessBrief`, optional source metadata | Draft `ProcessTask[]`, assumptions, open questions, source summary, confidence, quality issues | Preview and explicit apply only |
| `file-to-ptr-draft` | `real-ai-ready` | Generate Draft Process Task Register from uploaded PDF/DOCX text extraction or parsed file content. | File-derived text/metadata, extraction warnings, optional user context | Draft `ProcessTask[]`, assumptions, open questions, source summary, confidence, quality issues | Preview and explicit apply only |
| `chat-to-ptr-draft` | `real-ai-ready` | Convert pasted chat, notes, or manual text into Draft Process Task Register. | Chat transcript, workshop notes, manual pasted text, optional brief context | Draft `ProcessTask[]`, assumptions, open questions, source summary, confidence, quality issues | Preview and explicit apply only |
| `ai-process-qa` | `real-ai-ready` | Generate QA recommendations for Process Task Register. | `ProcessTask[]`, rule QA issues, selected templates | `QARecommendation[]`, meta | Existing recommendation preview/apply workflow |
| `process-improvement-recommendation` | `real-ai-ready` | Power PTR AI Assistant selected-row actions beyond deterministic QA. | `ProcessTask[]`, selected `targetStepIds`, `metadata.ptrAiAction`, optional templates | `QARecommendation[]`, warnings | Preview, select, confirm, then apply |
| `artifact-review` | `real-ai-ready` | Review generated D01 BPMN or D02 Service Blueprint artifacts without mutating XML. | `ProcessTask[]`, selected `TemplateProfile`, generated XML, rule QA issues | `QARecommendation[]`, `TemplateRecommendation[]`, artifact warnings | Preview only; fixes route back to PTR or template recommendations |
| `template-review` | `real-ai-ready` | Review D01/D02 template fit and quality. | `TemplateProfile`, optional `ProcessTask[]`, selected artifact context | `TemplateRecommendation[]`, quality score, warnings | User accepts/edits recommendation before save |
| `template-recommendation` | `implemented` | Recommend suitable D01/D02 templates based on process and metadata. | `ProcessTask[]`, template library metadata | Ranked template recommendations | No auto-apply |
| `ptr-to-ai-coding-pack` | `implemented` | Export AI-ready coding context from Process Task Register. | `ProcessTask[]`, selected template metadata, optional project context | `AGENTS.md`, `CLAUDE.md`, cursor rules, `spec.json`, acceptance criteria, implementation plan, test plan | Preview/export only |
| `audit-summary` | `implemented` | Summarize local audit events for review and release evidence. | Local audit log events | Audit summary/export | Read-only |

### Module 3 - Product Delivery Core

| Skill | Status | Purpose | Primary input | Output | Apply behavior |
| --- | --- | --- | --- | --- | --- |
| `notes-to-brd` | `real-ai-ready` | Generate structured BRD from notes/chat and optional source context. | Notes/chat, project context, AI Input Brief summary, uploaded file text | Structured BRD with objective, context, scope, stakeholders, requirements, assumptions, open questions, risks/dependencies, and quality issues | Preview/export only |
| `ptr-to-brd` | `real-ai-ready` | Generate structured BRD from Process Task Register and optional source context. | `ProcessTask[]`, notes/chat, AI Input Brief summary, uploaded file text | Structured BRD with process references to `ProcessTask.stepId` | Preview/export only |
| `ptr-to-brd-outline` | `real-ai-ready` | Legacy route alias for PTR to structured BRD generation. | `ProcessTask[]`, AI Input Brief summary, manual project context | Structured BRD draft with trace references | Preview/export only |
| `brd-to-srs` | `real-ai-ready` | Generate structured SRS from BRD draft, PTR, and optional source context. | BRD draft, optional `ProcessTask[]`, notes/chat, source summary, uploaded file text | Structured SRS with stable functional/non-functional requirement ids, actors/roles, systems/components, data requirements, interfaces, constraints, assumptions, open questions, quality issues, and trace links | Preview/export only |
| `notes-to-srs` | `real-ai-ready` | Generate structured SRS from notes/chat and optional source context. | Notes/chat, project context, AI Input Brief summary, uploaded file text, optional BRD/PTR context | Structured SRS with stable ids, source references where possible, assumptions, open questions, and quality issues | Preview/export only |
| `ptr-to-srs-outline` | `implemented` | Legacy deterministic SRS outline from process and product context. | `ProcessTask[]`, BRD draft, constraints | SRS outline draft, assumptions, open questions | Preview/export only |
| `srs-to-user-stories` | `real-ai-ready` | Generate epics and user stories from structured SRS, PTR, and optional source notes. | SRS draft, optional BRD, `ProcessTask[]`, notes/chat, source summary, uploaded file text | `UserStorySet` with stable story ids, role, goal, business value, acceptance criteria, dependencies, priority/complexity, source requirement refs, and quality issues | Preview/export only |
| `brd-to-user-stories` | `real-ai-ready` | Generate epics and user stories from structured BRD, PTR, and optional source notes. | BRD draft, optional SRS, `ProcessTask[]`, notes/chat, source summary, uploaded file text | `UserStorySet` with stable story ids, role, goal, business value, acceptance criteria, dependencies, priority/complexity, source refs, and quality issues | Preview/export only |
| `brd-or-notes-to-user-stories` | `implemented` | Legacy compatible user story generation from BRD, notes, or structured requirements. | BRD draft or notes, optional PTR/project context | `UserStorySet` draft with trace links and quality issues | Preview/export only |
| `ptr-to-user-stories` | `implemented` | Generate simple user stories from Process Task Register. | `ProcessTask[]`, optional project context | User stories with `ProcessTask.stepId` trace references | Preview/export only |
| `user-stories-to-acceptance-criteria` | `real-ai-ready` | Generate acceptance criteria from reviewed user story preview. | `UserStorySet`, optional `ProcessTask[]`, BRD/SRS, notes/source context | Acceptance criteria with stable ids, story refs, source requirement refs, source step refs, and quality issues | Preview/export only |
| `user-stories-to-jira-export` | `planned` | Convert reviewed user stories into Jira-ready export. | User stories, acceptance criteria, labels, epic metadata | Jira-ready markdown/CSV/JSON draft | Preview/download only |
| `product-scope-review` | `real-ai-ready` | Review product scope boundaries from Product Delivery artifacts. | BRD, SRS, user stories, optional business objective, PTR/source context | In-scope, out-of-scope, assumptions, open questions, MVP slice, later phases, dependencies, risks, quality issues | Preview/export only |
| `mvp-slicing` | `real-ai-ready` | Propose MVP, later, and out-of-scope slices. | BRD/SRS/user stories, optional business objective, PTR/source context | MVP slice, later phases, dependencies, risks, assumptions, open questions, scope boundaries | Preview/export only |
| `scope-nonscope-definition` | `planned` | Draft scope and non-scope from process and product notes. | PTR, notes, BRD/SRS context | Scope/non-scope draft, open questions | Preview/save/export only |
| `requirement-quality-check` | `real-ai-ready` | Review BRD/SRS/user stories/acceptance criteria/AI Coding Pack for ambiguity, missing criteria, and trace gaps. | Product delivery preview artifacts and AI Coding Pack preview | Requirement QA findings, draft patch recommendations, and coverage summary | Preview/recommendation only |
| `user-stories-to-ai-coding-pack` | `real-ai-ready` | Generate AI-ready coding context for Codex, Claude Code, Cursor, and similar tools from reviewed Product Delivery artifacts. | BRD, SRS, user stories, acceptance criteria, optional `ProcessTask[]` | `AGENTS.md`, `CLAUDE.md`, `cursor-rules.md`, `spec.json`, implementation plan, acceptance criteria, test plan, quality issues | Preview/export only |

## Current implemented MVP skills

### input-brief-to-ptr

Purpose:
Generate Draft Process Task Register from structured brief, file, or chat-ready context.

Input:
- `StructuredProcessBrief`
- Optional source document metadata

Output:
- Draft `ProcessTask[]`
- assumptions
- openQuestions
- sourceSummary
- confidence
- qualityIssues

Apply behavior:
User preview and explicit apply only.

### file-to-ptr-draft

Purpose:
Generate Draft Process Task Register from locally extracted file text.

Input:
- File name and file type
- Extracted PDF/DOCX text
- Extraction warnings and detected actors/systems/data/steps when available
- Optional user context

Output:
- Draft `ProcessTask[]`
- assumptions
- openQuestions
- sourceSummary
- confidence
- qualityIssues

Apply behavior:
User preview and explicit Replace/Append only. Image/OCR remains unsupported for MVP1-AI.

### chat-to-ptr-draft

Purpose:
Generate Draft Process Task Register from pasted chat, notes, or manual text.

Input:
- `notes`
- Optional user context from the current Manual Input brief

Output:
- Draft `ProcessTask[]`
- assumptions
- openQuestions
- sourceSummary
- confidence
- qualityIssues

Apply behavior:
User preview and explicit Replace/Append only.

### ai-process-qa

Purpose:
Generate QA recommendations for Process Task Register.

Input:
- `ProcessTask[]`
- Rule-based QA issues
- Selected templates

Output:
- `QARecommendation[]`
- meta

Apply behavior:
Existing recommendation preview/apply workflow.

### template-review

Purpose:
Review D01/D02 template quality and fit.

Input:
- `TemplateProfile`
- Optional `ProcessTask[]`
- Selected artifact context

Output:
- `TemplateRecommendation[]`
- quality score
- warnings
- assumptions

Apply behavior:
No auto-apply. User reviews recommendation and saves template changes explicitly.

### notes-to-brd

Purpose:
Generate a structured BRD draft from notes/chat, AI Input Brief source summary, optional project context, and optional uploaded file text.

Input:
- notes/chat text
- optional project context
- optional AI Input Brief source summary
- optional uploaded file text

Output:
- structured BRD
- business objective
- background/context
- scope and out of scope
- stakeholders
- assumptions
- open questions
- business requirements
- risks/dependencies
- qualityIssues

Apply behavior:
Preview/export only. No auto-save and no Artifact Graph persistence in this slice.

### ptr-to-brd / ptr-to-brd-outline

Purpose:
Generate a structured BRD draft from Process Task Register and optional source context.

Input:
- `ProcessTask[]`
- AI Input Brief source summary when available
- Optional manual project context
- Optional notes/chat
- Optional uploaded file text

Output:
- structured BRD
- business objective
- background/context
- scope and out of scope
- stakeholders
- assumptions and open questions
- business requirements
- process references to `ProcessTask.stepId`
- risks/dependencies
- qualityIssues

Apply behavior:
Preview/export only.

### brd-to-srs / notes-to-srs

Purpose:
Generate a structured SRS draft from reviewed BRD preview, notes/chat, Process Task Register, and optional source context.

Input:
- BRD draft when available
- notes/chat text
- `ProcessTask[]` for source `stepId` traceability
- optional project context
- optional AI Input Brief source summary
- optional uploaded file text

Output:
- structured SRS
- stable functional requirement ids such as `FR-001`
- stable non-functional requirement ids such as `NFR-001`
- actors/roles
- systems/components
- data requirements
- interface/integration requirements
- constraints
- assumptions
- open questions
- qualityIssues for not-testable requirements, missing actor/system, missing NFR, and unclear dependency
- trace links and source references where possible

Apply behavior:
Preview/export only. No auto-save, no XML mutation, and no Artifact Graph persistence in this slice.

### srs-to-user-stories / brd-to-user-stories

Purpose:
Generate structured epics and user stories from SRS, BRD, Process Task Register, notes/chat, and optional file/source summaries.

Input:
- SRS draft for `srs-to-user-stories`
- BRD draft for `brd-to-user-stories`
- optional `ProcessTask[]`
- optional notes/chat and project context
- optional AI Input Brief source summary
- optional uploaded file text

Output:
- epics when useful
- user stories with stable ids such as `US-001`
- role
- goal/action
- business value
- acceptance criteria
- dependencies
- priority or complexity when inferable
- source requirement refs and `ProcessTask.stepId` refs where possible
- qualityIssues for missing role, missing value, missing acceptance criteria, broad stories, and missing trace

Apply behavior:
Preview/export only. No auto-save and no Artifact Graph persistence in this slice.

### user-stories-to-acceptance-criteria

Purpose:
Generate structured acceptance criteria from reviewed user story preview.

Input:
- `UserStorySet`
- optional `ProcessTask[]`
- optional BRD/SRS context
- optional notes/chat, source summary, and uploaded file text

Output:
- acceptance criteria with stable ids such as `AC-US-001-001`
- `storyId`
- Given/When/Then or equivalent testable condition
- source requirement refs and `ProcessTask.stepId` refs where possible
- qualityIssues for missing AC, non-testable AC, missing source trace, and broad stories

Apply behavior:
Preview/export only. No auto-save and no Artifact Graph persistence in this slice.

### product-scope-review / mvp-slicing

Purpose:
Review product scope boundaries and propose MVP/later phase slicing from Product Delivery artifacts.

Input:
- BRD draft
- SRS draft
- `UserStorySet`
- optional `ProcessTask[]`
- optional business objective
- optional notes/chat, source summary, and uploaded file text

Output:
- in-scope items
- out-of-scope items
- assumptions
- open questions
- MVP slice
- later phases
- dependencies
- risks
- qualityIssues for missing scope, missing MVP slice, missing risks, or trace gaps

Apply behavior:
Preview/export only. No auto-save and no Artifact Graph persistence in this slice.

### ptr-to-ai-coding-pack

Purpose:
Generate AI-ready coding context for Codex, Claude Code, Cursor, and similar tools from Process Task Register.

Input:
- `ProcessTask[]`
- selected template metadata when useful
- assumptions/open questions when available
- optional user-entered project context

Output:
- `AGENTS.md` draft
- `CLAUDE.md` draft
- cursor rules draft
- `spec.json`
- `acceptance-criteria.md`
- `implementation-plan.md`
- `test-plan.md`

Apply behavior:
Export only after preview.

### user-stories-to-ai-coding-pack

Purpose:
Generate AI-ready coding context from reviewed Product Delivery artifacts.

Input:
- BRD draft
- SRS draft
- `UserStorySet`
- `AcceptanceCriteriaSet`
- optional `ProcessTask[]`
- optional project context, assumptions, and open questions

Output:
- `AGENTS.md`
- `CLAUDE.md`
- `cursor-rules.md`
- `spec.json`
- `implementation-plan.md`
- `acceptance-criteria.md`
- `test-plan.md`
- qualityIssues for missing acceptance criteria, missing non-goals, missing test expectations, and unresolved open questions

Apply behavior:
Preview/export only. No generated code is applied and no Artifact Graph persistence is created in this slice.

### requirement-quality-check

Purpose:
Review Product Delivery artifacts for requirement quality and basic cross-artifact consistency.

Input:
- BRD draft
- SRS draft
- User Story Set
- Acceptance Criteria Set
- AI Coding Pack preview files when available

Output:
- Requirement QA findings
- Draft patch recommendations
- BRD-to-SRS coverage summary
- SRS-to-User Story coverage summary
- User Story-to-Acceptance Criteria coverage summary
- assumptions, openQuestions, and warnings

Apply behavior:
Preview/recommendation only. The skill does not mutate BRD, SRS, user stories, acceptance criteria, AI Coding Pack files, or Process Task Register data.
