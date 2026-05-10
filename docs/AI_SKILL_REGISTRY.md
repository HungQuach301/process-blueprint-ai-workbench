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

## MVP1-AI skill plan

MVP1-AI covers full Module 2 Process Modeling Core and Module 3 Product Delivery Core before release.

### Module 2 - Process Modeling Core

| Skill | Status | Purpose | Primary input | Output | Apply behavior |
| --- | --- | --- | --- | --- | --- |
| `input-brief-to-ptr` | `real-ai-ready` | Generate Draft Process Task Register from structured AI Input Brief. | `StructuredProcessBrief`, optional source metadata | Draft `ProcessTask[]`, assumptions, open questions, source summary, confidence, quality issues | Preview and explicit apply only |
| `file-to-draft-ptr` | `mock` | Generate Draft Process Task Register from uploaded document text or parsed file content. | File-derived text/metadata, optional user context | Draft `ProcessTask[]`, source summary, warnings | Preview and explicit apply only |
| `chat-to-draft-ptr` | `planned` | Convert a guided conversation into Draft Process Task Register. | Chat transcript, structured follow-up answers | Draft `ProcessTask[]`, assumptions, open questions | Preview and explicit apply only |
| `process-qa-recommendation` | `real-ai-ready` | Generate QA recommendations for Process Task Register. | `ProcessTask[]`, rule QA issues, selected templates | `QARecommendation[]`, meta | Existing recommendation preview/apply workflow |
| `process-improvement-recommendation` | `planned` | Suggest semantic process improvements beyond deterministic QA. | `ProcessTask[]`, issue context, domain metadata | `QARecommendation[]`, warnings | Preview, select, confirm, then apply |
| `template-review` | `real-ai-ready` | Review D01/D02 template fit and quality. | `TemplateProfile`, optional `ProcessTask[]`, selected artifact context | `TemplateRecommendation[]`, quality score, warnings | User accepts/edits recommendation before save |
| `template-recommendation` | `implemented` | Recommend suitable D01/D02 templates based on process and metadata. | `ProcessTask[]`, template library metadata | Ranked template recommendations | No auto-apply |
| `ptr-to-ai-coding-pack` | `implemented` | Export AI-ready coding context from Process Task Register. | `ProcessTask[]`, selected template metadata, optional project context | `AGENTS.md`, `CLAUDE.md`, cursor rules, `spec.json`, acceptance criteria, implementation plan, test plan | Preview/export only |
| `audit-summary` | `implemented` | Summarize local audit events for review and release evidence. | Local audit log events | Audit summary/export | Read-only |

### Module 3 - Product Delivery Core

| Skill | Status | Purpose | Primary input | Output | Apply behavior |
| --- | --- | --- | --- | --- | --- |
| `ptr-to-brd-outline` | `implemented` | Generate BRD outline from Process Task Register and optional context. | `ProcessTask[]`, AI Input Brief summary, manual project context | BRD outline draft with trace references | Preview/export only |
| `ptr-to-srs-outline` | `planned` | Generate SRS outline from process and product context. | `ProcessTask[]`, BRD draft, constraints | SRS outline draft, assumptions, open questions | Preview/save/export only |
| `brd-or-notes-to-user-stories` | `planned` | Generate user stories and acceptance criteria from BRD, notes, or structured requirements. | BRD draft or notes, optional persona/module/scope | `UserStorySet` draft, acceptance criteria, assumptions, open questions, trace links | User review and save/export as draft artifact |
| `ptr-to-user-stories` | `implemented` | Generate simple user stories from Process Task Register. | `ProcessTask[]`, optional project context | User stories with `ProcessTask.stepId` trace references | Preview/export only |
| `user-stories-to-acceptance-criteria` | `implemented` | Generate acceptance criteria from PTR-derived user stories. | User stories or `ProcessTask[]` | Acceptance criteria draft | Preview/export only |
| `user-stories-to-jira-export` | `planned` | Convert reviewed user stories into Jira-ready export. | User stories, acceptance criteria, labels, epic metadata | Jira-ready markdown/CSV/JSON draft | Preview/download only |
| `mvp-slicing` | `planned` | Propose MVP, later, and out-of-scope slices. | BRD/SRS/user stories, constraints, priority notes | MVP slice recommendation, risks, assumptions | Recommendation only |
| `scope-nonscope-definition` | `planned` | Draft scope and non-scope from process and product notes. | PTR, notes, BRD/SRS context | Scope/non-scope draft, open questions | Preview/save/export only |
| `requirement-quality-check` | `planned` | Review BRD/SRS/user stories for ambiguity, missing criteria, and trace gaps. | Product delivery artifacts, trace links | Requirement QA findings and recommendations | Recommendation only |
| `user-stories-to-ai-coding-pack` | `planned` | Generate AI-ready coding context for Codex, Claude Code, Cursor, and similar tools from reviewed stories. | User stories, acceptance criteria, architecture constraints, test expectations | `AGENTS.md` draft, `CLAUDE.md` draft, cursor rules draft, `spec.json`, implementation plan, test plan | Export only after user review |

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

### process-qa-recommendation

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

### ptr-to-brd-outline

Purpose:
Generate a lightweight BRD outline from Process Task Register.

Input:
- `ProcessTask[]`
- AI Input Brief source summary when available
- Optional manual project context

Output:
- BRD outline draft
- assumptions and open questions where available
- trace references to `ProcessTask.stepId`

Apply behavior:
Preview/export only.

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
