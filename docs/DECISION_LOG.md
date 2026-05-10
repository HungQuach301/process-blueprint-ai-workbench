# Decision Log

## Format

Each decision should use this format:

### ADR-YYYY-MM-DD-XXX — Decision title

Status:
Accepted / Rejected / Superseded

Context:
Why this decision was needed.

Decision:
What was decided.

Rationale:
Why this is the preferred option.

Alternatives considered:
- Option A
- Option B
- Option C

Impact:
Architecture, UX, roadmap, commercial, or technical impact.

Follow-up:
Next actions or future review point.

---

## ADR-2026-05-10-001 — Product should be Artifact Graph-centric

Status:
Accepted

Context:
The product started with Process Task Register as the source of truth for process modeling. However, future capabilities include BRD, SRS, User Stories, UI Spec, Solution Spec, Business Architecture, IT Architecture, and AI Coding Pack.

Decision:
The broader product architecture should be Artifact Graph-centric. Process Task Register remains the canonical process model, but not all workflows must start from PTR.

Rationale:
Users may start from BRD, notes, chat, file, SRS, user stories, or process documents. Forcing every workflow through PTR would reduce adoption. Artifact Graph allows independent workflows while preserving traceability.

Impact:
Add Artifact, TraceLink, TransformationResult, artifact status, stale detection, and cross-artifact QA in future phases.

Follow-up:
Add Artifact Graph foundation after stabilizing Process Modeling Core.

---

## ADR-2026-05-10-002 — MVP should use real AI but only for high-value skills

Status:
Accepted

Context:
The product should release quickly but still prove real AI value.

Decision:
Use real AI in MVP for a small number of controlled skills:
- input/file/chat to Draft PTR
- notes/BRD to User Stories
- User Stories/SRS to AI Coding Pack
- QA/recommendation assistance

Rationale:
This proves product value without trying to make every feature AI-powered at once.

Impact:
Need AI Skill Registry, server-side provider adapters, schema validation, preview, approval, and audit.

Follow-up:
Keep mock/local fallback and avoid exposing API keys in browser code.