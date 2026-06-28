# ADR — Scope shared code by consumer, and return each consumer to a known-good config

**Status:** Accepted
**Date:** 2026-06-27
**Owner:** Hung Quach
**Related:** Bài 7-5 (eval harness), `src/lib/ai/provider-output-normalizer.ts`,
`evals/normalizer/test-normalizer.ts`, NO_EXTRA_INTERMEDIATE_STEPS_RULE (smallest change)

## Context

While establishing real-AI baselines (Bài 7-5a), a single bug chain forced repeated
changes to code that is **shared across many AI skills**:

1. OpenAI strict json-schema rejected the draft schemas → we made many fields nullable.
2. Nullable fields meant the model now returns `null`, which broke the **downstream**
   validators of some skills (`process-improvement`, `artifact-review`) → HTTP 422.
3. We added `stripNullsDeep` to the **shared** `provider-output-normalizer.ts`,
   unconditionally, for every schema.
4. That fixed the recommendation skills but **broke `input-brief`** (its
   `DraftProcessTaskRegister` validator requires those nullable fields to be *present*;
   stripping the key made them missing → 422 on 9/10 cases).

Each "fix" healed one consumer and broke another — classic whack-a-mole — because a global
transform on a shared module has a large blast radius. It only converged when we **scoped**
the transform to the schemas that actually need it (`STRIP_NULL_SCHEMAS =
{QARecommendationResponse, ArtifactReviewResponse}`) and **left every other consumer
untouched** (i.e. in its previously-passing configuration).

## Decision

1. **Changes to shared code (normalizers, providers, schemas) must be scoped per
   consumer** — gated by `skillId` / `schemaId` — not applied globally by default. Two
   consumers of the same module can have *opposite* correct behaviours (here: `draft-ptr`
   must keep nulls; recommendation must strip them).

2. **Each consumer must be left in a configuration already observed to work.** Do not invent
   new behaviour for a consumer you cannot test. The convergent fix combined three
   per-skill legs that had each been seen passing independently.

3. **Shared pure functions must be guarded by deterministic unit tests that encode each
   consumer's contract.** `normalizeProviderOutput` now has fixtures locking
   "draft-ptr keeps nulls" vs "recommendation strips nested nulls" vs "non-strip schemas
   keep nulls". A change that breaks one consumer is caught **instantly and for free**,
   not via an expensive, non-deterministic eval run.

4. **"Smallest change" means smallest blast radius, not fewest lines.** A one-line global
   transform on shared code is a *large* change. Prefer a slightly more verbose,
   narrowly-scoped change.

## Consequences

**Positive:** regressions in shared code are caught deterministically and immediately; each
consumer's contract becomes explicit (in tests); no more eval-driven whack-a-mole (this
session burned ~6 full baseline runs before scoping).

**Negative / risks + mitigations:**
- More verbose (per-consumer gating + fixtures). Mitigation: the cost is tiny next to the
  debugging it prevents.
- Risk of forgetting a fixture for a new consumer. Mitigation: convention — *adding a
  consumer to a shared function requires adding its fixture in the same change.*

## Alternatives considered

1. **Global transform** (what we did first) — rejected: silently breaks untested consumers.
2. **Make every consumer tolerant of all variations** — rejected: pushes complexity into
   every consumer and is untestable for skills without datasets.
3. **Drop OpenAI strict mode** — rejected: flips a global flag affecting working skills and
   loses the output-structure guarantee the product intentionally enabled.

## Review triggers

- Adding a new skill/consumer to a shared layer → add its fixture in the same change.
- A shared function grows a 4th+ consumer with divergent needs → consider splitting it.
- A regression is found only by eval (not a unit test) → a deterministic test is missing.
