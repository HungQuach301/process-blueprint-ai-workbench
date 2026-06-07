# Architecture Principles

## 1. Artifact Graph-centric architecture

The product should evolve from Process Task Register-centric to Artifact Graph-centric architecture.

Process Task Register remains the canonical model for process artifacts, but users may start from BRD, SRS, notes, chat, files, user stories, or architecture intent.

## 2. Canonical models

Process Task Register:
Canonical model for process, BPMN, service blueprint, process QA, and process-related exports.

BRD / SRS:
Canonical models for requirements.

User Story Set:
Canonical model for delivery backlog.

AI Coding Pack:
Canonical export model for AI coding tools.

TraceLink:
The core link between artifacts and elements.

## 3. AI output workflow

AI must not directly mutate source artifacts.

Required flow:
1. Generate draft / recommendation / review finding
2. Validate schema
3. Run quality gates
4. Show preview
5. User review
6. User apply / approve
7. Persist
8. Mark dependent artifacts stale
9. Audit event

## 4. Real AI integration

Real AI may be used in MVP, but:
- API keys must not be exposed in browser code
- AI calls must go through server-side API routes
- Output must pass schema validation
- Invalid output must be blocked
- Sensitive data should not be sent without explicit permission
- Local/mock fallback must remain available

## 5. Extension architecture

Future capabilities should be added through:
- AI Skill Registry
- Export Engines
- Quality Rule Packs
- Domain Packs
- Template Profiles
- Prompt Packs

## 6. Banking and enterprise safety

Assume banking data may be sensitive.

Default principles:
- Local-first where possible
- BYOK-ready
- No auto-apply AI output
- Human approval required
- Audit important AI actions
- Avoid logging sensitive content unnecessarily
- Preserve traceability from generated artifact to source artifact