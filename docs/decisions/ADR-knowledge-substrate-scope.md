# ADR — Knowledge Substrate Scope: Product vs Connect vs Org/People

**Status:** Accepted
**Date:** 2026-06-13
**Owner:** Hung Quach / Process Blueprint AI Workbench
**Related:** Curriculum v7.3 — Bài 3B (Knowledge Substrate Strategy), Bài 19 (Provenance-by-Reference), Bài 13 (MCP), Bài 14 (RAG), Bài 17/17C (governance, deployment, residency)

---

## Context

Bank and personal knowledge (process docs, templates, source code, notes, glossaries, policies) is fragmented across formats and locations. The recurring design question is *which parts of solving this fragmentation belong inside the product, and which are solved in another scope.* Getting the boundary wrong has three failure modes: bloating the product, rebuilding commodity infrastructure, and colliding with banking compliance (data residency, ownership, NĐ 13, TT 09).

## Decision

Partition responsibility by a single organizing principle:

> The product owns **mechanisms**; people/organizations own **judgment and data**; the ecosystem owns **infrastructure**.

The product does **not unify or own** the bank's data. It **binds to and tracks** it via provenance-by-reference (Bài 19): deliverables reference the exact data region + version they were derived from (metadata, not copies), enabling freshness/staleness tracking and reverse-traceability.

### Column A — Inside the product (build)

These are runtime *mechanisms*. They map onto the existing 8 engines.

| Capability | Engine |
|---|---|
| Canonical schema + common adapters (docx/pdf/notes → canonical) | Core Data Engine |
| Retrieval / grounding / citation / trust-labeling logic | AI Orchestration + Context |
| Domain Pack mechanism (versioned, loadable) | Template Engine |
| Governance runtime: PII masking, tenant isolation, local-only enforcement, trust labels | Governance/Policy Engine |
| MCP connector *capability* (ability to connect) | AI Orchestration |
| Retrieval/eval harness | QA Engine + dev tooling |
| Binding/provenance layer: SourceRef, freshness lifecycle, reverse traceability | Artifact Generation + Governance |
| Region Registry (register canonical regions + version-detection) | Core Data / Governance |
| Foundation-model access via abstraction layer | Model Provider Engine |

### Column B — Connect / buy (ecosystem, do not build)

| Thing | Why not build | How the product relates |
|---|---|---|
| Document stores (SharePoint/Confluence/Drive/Git) | Commodity, owned elsewhere | Connect via MCP; reference, don't copy |
| Vector DB + embedding infrastructure | Commodity infra | Use managed; product orchestrates retrieval |
| Source code repositories & code intelligence | Bank-owned; specialized | Reference via Git/connector; not a code-intel platform |
| Foundation models | Already decided (abstraction layer) | Provider Engine routes to them |

### Column C — Org / people (cannot productize)

| Responsibility | Owner | Product's role |
|---|---|---|
| Inventory & classification judgment (what's worth ingesting / authoritative) | You (curatorial) / bank | Provide `SOURCE_REGISTER` template only |
| Domain Pack *content* (actual banking knowledge/rules) | You / bank experts | Provide the *mechanism* (the pack), not the content |
| Data residency & what data may leave the bank | Bank legal/governance | Respect it; offer deployment options; LEGAL_SOURCE_REGISTER owners |
| On-prem / VPC deployment decision & environment | Bank IT/security | Offer Tier-3 deployment; bank provides environment |
| Credentials / access authorization | Bank IT | Consume via connector; never store improperly |
| Tacit knowledge (in people's heads, undocumented) | People, over time | Capture incrementally via HITL feedback (Bài 0E/18) |

## PLG tier lens (the boundary shifts by tier)

```text
Tier 1 (individual): product solves fragmentation for ONE person's own
  inputs — narrow, BYO key, local-first. Column C nearly empty.
Tier 2 (team): shared workspace store, role-based access, workspace-isolated
  feedback. Light connectors.
Tier 3 (enterprise/bank): the heavy Column B/C work appears — connectors to
  bank systems, residency, on-prem, curation at scale. Much of this is the
  bank's responsibility + your integration/services, NOT perpetual product code.
```

## Consequences

**Positive**
- Only Column A is product backlog. Column B is integration; Column C is onboarding/services + bank responsibility. Roadmap stays disciplined.
- Compliance-safe by construction: bank data stays in the bank; the product holds references (region+version+locator), not copies.
- The Artifact Graph + provenance (Bài 19) becomes the moat *and* the answer to fragmentation.
- Validates the 8-engine decomposition — no missing engine, only a missing boundary statement (now this ADR).

**Negative / risks**
- Depends on source addressability/versioning. Mitigation: Region Registry + content-fingerprint fallback ("changed since bound").
- The provenance store holds metadata (locators/fingerprints/snippets) that can itself leak. Mitigation: masking + tenant isolation on the provenance store.
- Region-level references can be coarse (whole-SOP change flags everything). Mitigation: AI-assisted impact analysis (material vs cosmetic) to avoid alert fatigue; go finer-grained only where eval shows noise.

## Alternatives considered

1. **Ingest and host everything in the product (a unified knowledge base).** Rejected: bloats the product, rebuilds vector/doc infra, and violates residency/ownership for bank data.
2. **Copy bank data into the product per project.** Rejected: compliance landmine; staleness with no provenance; duplicates source-of-truth.
3. **No provenance; regenerate deliverables on demand.** Rejected: loses traceability, can't tell users what to refresh when a region changes, no reverse-impact analysis.

## Review triggers

Re-open this ADR if: a Tier-3 bank requires data to be ingested rather than referenced; source systems gain (or lack) reliable versioning; or the provenance store's metadata is reclassified as sensitive enough to require its own residency controls.
