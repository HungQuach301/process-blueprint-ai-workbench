# Knowledge Substrate Strategy (Bài 3B)

Full rationale: CURRICULUM_V7_3.md §Bài 3B. Boundary decision:
docs/decisions/ADR-knowledge-substrate-scope.md. This doc is the working playbook.

## Principle
Fragmentation = many formats, no shared schema, no trust tiering. Fix by layering,
not one giant store. The product **binds to and tracks** bank data (provenance-by-
reference, Bài 19) — it does not own it.

## The six steps
0. Separate scopes: personal corpus (ingest freely + mask) vs bank corpus (often
   cannot ingest — NĐ 13, TT 09, residency). Separate stores + access.
1. Inventory & classify, don't ingest → fill SOURCE_REGISTER.md.
2. Normalize to canonical schema + adapters (extends PTR).
3. Separate source-of-truth from reference:
   - canonical store (PTR, glossary, templates): small, curated, TRUSTED.
   - reference corpus (RAG): large, fuzzy, CITED — grounding, not truth.
   - source code: code-aware index / Git reference, NOT the doc store.
4. Package stable core as a Domain Pack (Bài 15) — the moat.
5. Ingest incrementally, eval-driven: only sources needed for the 3 key-skill
   golden datasets first (Bài 7); expand where retrieval eval shows a gap (Bài 14).
6. Govern: mask before ingest; tenantId on every record; keep bank data in the
   bank's environment — connect via MCP (Bài 13), don't copy.

## Provenance binding (with Bài 19)
When AI grounds on a retrieved chunk, auto-record a SourceRef
(region + version + locator + boundAt). Grounding IS linking. On a source-version
change, AI-assisted impact analysis decides material vs cosmetic; human approves
refresh. Capture SourceRef from day one (spine insurance).
