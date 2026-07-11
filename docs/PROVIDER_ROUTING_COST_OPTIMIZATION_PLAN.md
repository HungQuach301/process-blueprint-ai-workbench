# Provider Routing & Cost Optimization Plan — Bài 9 (slice 1)

> Scope: this is the **plan/spec** deliverable of Bài 9 slice 1. It is measured in later slices.
> Source of truth for the lesson: `docs/curriculum/CURRICULUM_V7_3.md` (Bài 9). Companion code:
> the model capability catalog in `src/lib/ai/provider-model-catalog.ts`.

## 0. Principle (catalog rule, v7.1)

Provider/model selection is a runtime governance + economics decision, not a hard-coded fact.
Routing logic **reads the model capability catalog** — capabilities, cost, context length, caching
support, `verifiedDate`, `deprecationStatus` — and never hard-codes model-name strings. Catalog
entries are re-verified against official provider docs at the start of the lesson, before the final
case study, and on any deprecation notice. **Executor/advisor assignment is a hypothesis, not a
decision** — the numbers assign the roles per skill.

## 1. Executor/advisor hypothesis (test BOTH directions)

For each skill under test, run two configurations against the **locked Bài 7 baseline** and let the
data assign roles — do not assume "model X is always the advisor":

- **Direction A — cheap executor, escalate to strong advisor.** Executor = cost-conscious model;
  escalate to a higher-capability advisor when confidence is low, the quality gate fails, the skill
  is high-risk, or the output needs deeper review.
- **Direction B — strong executor, cheap advisor/critic.** Executor = higher-capability model;
  a cheaper model acts as critic/second-opinion.

Escalation triggers (recorded per attempt): low self-reported confidence · quality-gate failure ·
high-risk skill class · reviewer flag. Compare/select the final output; record cost, latency,
validation, gate, and cache results **per attempt**.

## 2. Skills under test (vs locked Bài 7 baseline)

The three skills with a **locked** v1 baseline are the test set (2–3 key skills, per brief):

| Skill | Baseline (locked) | Baseline provider/model |
|---|---|---|
| `input-brief-to-ptr` | `evals/datasets/input-brief-to-ptr/v1/baseline.json` | openai / gpt-5.4-mini |
| `process-improvement-recommendation` | `evals/datasets/process-improvement-recommendation/v1/baseline.json` | openai / gpt-5.4-mini |
| `artifact-review` | `evals/datasets/artifact-review/v1/baseline.json` | openai / gpt-5.4-mini |

Judge: `claude-sonnet-4-6` (judge v2), calibrated per-action; acceptance gate = "0 two-level
disagreements + MAD ≤ 0.5" (Bài 7-5b, LOCKED). Each baseline's `skillProvider`/`skillModel` is the
**executor-only** reference point for the both-direction comparison.

Rationale per skill (from `docs/PROVIDER_ROUTING_AUDIT.md`): `artifact-review` needs a large-context
model (full XML); `process-improvement-recommendation` and `input-brief-to-ptr` are structured-output
skills where the executor path already produces good results — good candidates for cheap-executor /
escalate-on-gate-fail (Direction A).

## 3. Cacheable-prefix design

Structure every skill prompt so the **stable prefix is cacheable** and the volatile payload comes
last (prompt caching is a prefix match — any byte change invalidates everything after it):

```
[ stable, cacheable prefix ]           ← cache breakpoint here
  1. frozen system prompt (role, rules, safety, output contract)
  2. domain pack (banking process vocabulary, canonical enums)
  3. output schema / JSON contract
[ volatile suffix — NOT cached ]
  4. per-request payload (the brief / PTR / artifact under review)
```

Rules: freeze the system prompt (no `datetime.now()`, no per-request IDs, no per-user interpolation
in the prefix); serialize tools/domain pack deterministically (sorted keys); keep the model and tool
set stable within a run. Verify with `cache_read_input_tokens > 0` across repeated requests — if it
is zero, a silent invalidator is in the prefix. Minimum cacheable prefix is model-dependent (see the
`minCacheablePrefixTokens` field in the catalog): a prefix below that threshold silently will not
cache.

## 4. Metrics (defined here; measured in later slices)

- **cost** — executor-only vs executor+advisor, for **both** direction hypotheses.
- **quality** — vs the locked Bài 7 baseline (same judge, same acceptance gate).
- **latency** — increase / escalation rate.
- **caching** — `cacheHitRate` / `costSavedByCachePct`. Cost math must include the cache-**write**
  premium (Anthropic: ~1.25× base input for 5-min TTL, ~2× for 1-h TTL), not only the read savings
  captured by the catalog's `cachedInputCostPer1MTokensUsd` — otherwise caching cost is understated.
- **fallbackActivations** — how often the fallback ladder fired.
- **cost per valid output** — total cost ÷ outputs that pass validation + quality gate.

## 5. Catalog dependency + open data item

Cost math reads `src/lib/ai/provider-model-catalog.ts`. As of this slice:

- **Anthropic (Claude) entries carry verified pricing** — `verifiedDate` 2026-07-11, re-verified
  against Anthropic's official model/pricing docs (cost per 1M tokens, context window, prompt-cache
  read price + minimum cacheable prefix, `deprecationStatus`).
- **OpenAI executor-path entries carry NO cost yet (deliberate).** Their catalog ids
  (`gpt-5.4-mini`, …) are project-internal names with no official provider doc verifiable offline,
  and this slice does not call external providers. **Blocking for slice-2 measurement:** fill
  `inputCostPer1MTokensUsd` / `outputCostPer1MTokensUsd` / `cachedInputCostPer1MTokensUsd` /
  `minCacheablePrefixTokens` for the OpenAI executor models from the BYOK provider's official price
  sheet, and stamp `verifiedDate`, **before** any executor-only-vs-executor+advisor cost number is
  reported. Do not fabricate these values.

## 6. Out of scope for this slice (roadmap)

2. Run executor/advisor both directions on the 3 skills vs the locked baseline; record the comparison.
3. Structure prompts for a cacheable stable prefix; enable provider prompt caching; measure hit rate.
4. Add `costPerAttempt` + `escalationReason` metadata to the audit log.
   → Final deliverable: `docs/PROVIDER_ROUTING_COST_REPORT.md` with real numbers.
