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

---

## ADR-2026-05-10-003 - Delay MVP1 release until Module 2 and Module 3 full AI are complete

Status:
Accepted

Context:
The project had enough thin-slice functionality to prepare an immediate MVP1 release. However, the product strategy now requires the release to prove a stronger workflow: process modeling plus product delivery, both supported by controlled real AI.

Decision:
Delay the MVP1 release until Module 2 Process Modeling Core and Module 3 Product Delivery Core are complete with full real AI support. The active planning branch is `feature/m2-m3-full-ai`, and the release target is `v0.8.0-mvp1-ai`.

Rationale:
The product moat depends on turning process knowledge into delivery artifacts with traceability, quality gates, human approval, and enterprise-safe AI. Shipping only the immediate thin MVP would underrepresent the intended value and create a second planning reset soon after release.

Alternatives considered:
- Release immediate MVP1 with current thin slices.
- Release Module 2 only and postpone Product Delivery.
- Delay until full Artifact Graph is complete.

Impact:
Roadmap, next implementation plan, AI Skill Registry, and session handoff now point to MVP1-AI. UI/Experience Generation, Business Architecture, and IT/Solution Architecture remain future phases. Application code is unchanged by this decision.

Follow-up:
Implement and verify Module 2 and Module 3 skills with server-side real AI, schema validation, mock/local fallback, no browser API key exposure, and preview/user approval before apply, save, or export.
