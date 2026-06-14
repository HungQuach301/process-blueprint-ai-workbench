# CCR LOG — Curriculum Change Requests

Any change to the curriculum is a CCR committed to Git. Format: what / why / evidence.

---

## CCR-0001 — Single source of truth
**Status:** Accepted (2026-06-13)
**What:** `docs/curriculum/CURRICULUM_V7_3.md` is the canonical source of truth for
all curriculum content (lessons, spine, gates, vocabulary, changelog, artifact set).
All other operating files (INDEX, STATUS, lesson briefs, templates) are thin
dashboards/working files that reference the curriculum and never restate its content.
**Why:** The prior operating package extracted VOCABULARY/SPINE/CHANGELOG/ARTIFACT_INDEX
into separate authoritative files, creating two sources of truth that would drift —
ironic given the curriculum preaches single-source-of-truth (§3.7).
**Evidence:** INDEX.md points into curriculum §; no content duplicated.

---

## CCR-0002 — Correct the "no extra intermediate steps" rule
**Status:** Accepted (2026-06-13)
**What:** The rule blocks AI-INVENTED lessons, gates, sub-steps, deliverables, or
"-min/-lite" variants not in the curriculum. It does NOT block the official
spine-minimum scopes. Bài 7-min, 9-min, 17B-min, 22-mini and the two-track markers
ARE the curriculum and must be followed as written.
**Why:** The prior rule named non-existent "3B-min/0E-min" and generalized to "no -min",
which would wrongly ban the real spine-minimum scopes — causing over-scoping (e.g.,
doing full eval harness instead of the minimum baseline), the exact failure the spine
was designed to prevent.
**Evidence:** `NO_EXTRA_INTERMEDIATE_STEPS_RULE.md` rewritten.

---

## CCR-NNNN — <title>
**Status:** Proposed | Accepted | Rejected (date)
**What:** …
**Why:** …
**Evidence:** …
