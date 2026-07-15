# NEXT BRIEF — the current task handed to any session (Cowork / Dispatch / Claude Code)

> Rolling, single-purpose file — **overwritten each time**, not a changelog. Cowork writes the next
> task here; from any device you send the one fixed pointer:
> "Read docs/NEXT_BRIEF.md and run it in Claude Code (close with /close)" — no copy-paste of the brief.

## Task (2026-07-11) — Bài 9 · catalog slice: fill provider cost + add newest models

Run as a Claude Code `/slice`, close with `/close`. This is catalog-maintenance under Bài 9 practice
item 1 ("build the model capability catalog with verifiedDate + deprecation fields; re-verify entries
against official provider docs"). It is NOT a new lesson/step. It also clears the §5 prereq that
blocks slice 2 (need real OpenAI cost before measuring).

### Scope (one file: `src/lib/ai/provider-model-catalog.ts`, + its unit test if one exists)

1. **Fill cost/caching fields on the existing `openai-byok` entries** (currently missing). Standard,
   short-context pricing, verified 2026-07-11:

   | id | input $/1M | cached $/1M | output $/1M | deprecationStatus |
   |---|--:|--:|--:|---|
   | `gpt-5.5` | 5.00 | 0.50 | 30.00 | current |
   | `gpt-5.4` | 2.50 | 0.25 | 15.00 | previous-generation |
   | `gpt-5.4-mini` | 0.75 | 0.075 | 4.50 | previous-generation |
   | `gpt-5.4-nano` | 0.20 | 0.02 | 1.25 | previous-generation |

   For each: `supportsPromptCaching: true`, `minCacheablePrefixTokens: 1024`, `verifiedDate: "2026-07-11"`.

2. **Add 3 new `openai-byok` GPT-5.6 entries** (verified 2026-07-11):

```ts
{
  id: "gpt-5.6-sol", provider: "openai-byok", label: "GPT-5.6 Sol",
  description: "Frontier OpenAI model for the most complex reasoning and delivery work.",
  recommendedFor: ["reasoning", "coding", "structured-output"],
  supportsStructuredOutput: true, supportsToolUse: true,
  supportsReasoningEffort: true, supportedReasoningEfforts: ["none", "low", "medium", "high", "xhigh"],
  supportsThinking: false, supportedThinkingTypes: ["none"],
  inputCostPer1MTokensUsd: 5, outputCostPer1MTokensUsd: 30, cachedInputCostPer1MTokensUsd: 0.5,
  supportsPromptCaching: true, minCacheablePrefixTokens: 1024,
  verifiedDate: "2026-07-11", deprecationStatus: "current", status: "active"
},
{
  id: "gpt-5.6-terra", provider: "openai-byok", label: "GPT-5.6 Terra",
  description: "Balanced GPT-5.6 model for product and process work.",
  recommendedFor: ["balanced", "reasoning", "structured-output"],
  supportsStructuredOutput: true, supportsToolUse: true,
  supportsReasoningEffort: true, supportedReasoningEfforts: ["none", "low", "medium", "high", "xhigh"],
  supportsThinking: false, supportedThinkingTypes: ["none"],
  inputCostPer1MTokensUsd: 2.5, outputCostPer1MTokensUsd: 15, cachedInputCostPer1MTokensUsd: 0.25,
  supportsPromptCaching: true, minCacheablePrefixTokens: 1024,
  verifiedDate: "2026-07-11", deprecationStatus: "current", status: "active"
},
{
  id: "gpt-5.6-luna", provider: "openai-byok", label: "GPT-5.6 Luna",
  description: "Cost-optimized GPT-5.6 model for fast structured workflow tasks.",
  recommendedFor: ["fast", "balanced", "structured-output"],
  supportsStructuredOutput: true, supportsToolUse: true,
  supportsReasoningEffort: true, supportedReasoningEfforts: ["none", "low", "medium", "high"],
  supportsThinking: false, supportedThinkingTypes: ["none"],
  inputCostPer1MTokensUsd: 1, outputCostPer1MTokensUsd: 6, cachedInputCostPer1MTokensUsd: 0.1,
  supportsPromptCaching: true, minCacheablePrefixTokens: 1024,
  verifiedDate: "2026-07-11", deprecationStatus: "current", status: "active"
},
```

3. **Add 1 new `claude-byok` Claude Fable 5 entry** (verified 2026-07-11):

```ts
{
  id: "claude-fable-5", provider: "claude-byok", label: "Claude Fable 5",
  description: "Frontier Claude model for highest-quality reasoning and long-form delivery work.",
  recommendedFor: ["reasoning", "coding", "long-context"],
  supportsStructuredOutput: false, supportsToolUse: true,
  supportsReasoningEffort: false, supportedReasoningEfforts: ["none"],
  supportsThinking: true, supportedThinkingTypes: ["auto", "budgeted", "extended"],
  contextWindow: 1_000_000, maxOutputTokens: 128_000,
  inputCostPer1MTokensUsd: 10, outputCostPer1MTokensUsd: 50, cachedInputCostPer1MTokensUsd: 1,
  supportsPromptCaching: true, minCacheablePrefixTokens: 2048,
  verifiedDate: "2026-07-11", deprecationStatus: "current", status: "active"
},
```

### To confirm before merge (do not guess — verify against official docs)

- **GPT-5.6 `contextWindow` / `maxOutputTokens`** — not filled above (per-variant pages not fetched).
  Fetch each model page and add; GPT-5.5 is 1,050,000 / 128,000 so expect similar.
- **`minCacheablePrefixTokens`** — OpenAI ≈ 1024, Claude family 2048 (matching existing entries).
  Confirm on each provider's Prompt Caching guide.

### Constraints

- **Cowork boundary:** this `src` change goes through the **dev subagent + reviewer + human approval**.
- **Only edit** `src/lib/ai/provider-model-catalog.ts` (+ its unit test if present). Do NOT touch routing
  logic, run-skill route, or provider adapters in this slice.
- **Catalog rule (v7.1):** routing reads the catalog; never hard-code model-name strings.
- **Do NOT auto-demote** existing entries — reclassifying `gpt-5.4*` / `claude-opus-4-7` / `claude-sonnet-4-6`
  to `previous-generation` is a human decision; only set what this brief specifies.
- No invented sub-steps / `-min` / `-lite` variants (see `NO_EXTRA_INTERMEDIATE_STEPS_RULE.md`).

### Verify

`npm run typecheck` + `npm run lint` green. Catalog compiles; `findProviderModel("openai-byok", "gpt-5.6-sol")`
and `findProviderModel("claude-byok", "claude-fable-5")` resolve; existing tests still pass.

### After this slice

Slice 2 (Bài 9): run executor/advisor **both directions** on 3 key skills vs the locked Bài 7 baseline
(`evals/datasets/<skill>/v1/baseline.json`) — now unblocked because OpenAI cost is populated.

To resume, read `docs/SESSION_HANDOFF.md` + `docs/curriculum/CURRICULUM_STATUS.md` first.
