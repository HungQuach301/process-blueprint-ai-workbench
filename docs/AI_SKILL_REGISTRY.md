# AI Skill Registry

## Skill principles

All AI skills must:
- Use structured input
- Return structured output
- Pass schema validation
- Return assumptions and open questions where relevant
- Never auto-apply output
- Require user review before apply/save
- Write audit metadata when real AI is used
- Support mock/local fallback where possible

## Current MVP skills

### input-brief-to-ptr

Purpose:
Generate Draft Process Task Register from structured brief, file, or chat.

Input:
- StructuredProcessBrief
- Optional source document metadata

Output:
- Draft ProcessTask[]
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
- ProcessTask[]
- Rule-based QA issues
- Selected templates

Output:
- QARecommendation[]
- meta

Apply behavior:
Existing recommendation preview/apply workflow.

### brd-or-notes-to-user-stories

Purpose:
Generate user stories and acceptance criteria from BRD, notes, or structured requirements.

Input:
- BRD draft or notes
- Optional target persona/module/scope

Output:
- UserStorySet draft
- acceptanceCriteria
- assumptions
- openQuestions
- traceLinks

Apply behavior:
User review and save as draft artifact.

### user-stories-to-ai-coding-pack

Purpose:
Generate AI-ready coding context for Codex, Claude Code, Cursor, and similar tools.

Input:
- UserStorySet
- AcceptanceCriteria
- Architecture constraints
- Test expectations

Output:
- AGENTS.md draft
- CLAUDE.md draft
- Cursor rules draft
- spec.json draft
- implementation-plan.md draft
- test-plan.md draft

Apply behavior:
Export only after user review.