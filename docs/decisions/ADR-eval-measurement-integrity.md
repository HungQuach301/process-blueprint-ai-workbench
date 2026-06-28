# ADR — Eval measurement integrity: never coerce a failed measurement into a data point

**Status:** Accepted
**Date:** 2026-06-28
**Owner:** Hung Quach
**Related:** Bài 7 (eval harness), `evals/common/judge.ts`,
`evals/calibration/agreement.ts`, ADR-scope-shared-code-by-consumer.md

## Context

During judge calibration, ~20% of cases (6/30) scored `0.00` / verdict `fail`. Investigation
found these were **not real fails**: they were `JSON.parse failed: Unexpected token 'I'` — the
judge returned prose before the JSON ("I'll evaluate…"), the parse threw, and `runJudge`
returned verdict `"fail"` + `overall 0`. A **measurement failure** ("we could not parse the
judge output") had been **silently coerced into a measured result** ("the output scored fail"),
polluting the agreement metric. We nearly tuned the rubrics against parse errors. Temperature 0
reduced sampling variance but not this class; the wild `0.88 → 0.00` swings were the same case
parsing in one run and failing in another.

## Decision

1. **A failed measurement must never become a data point.** "Could not measure" (parse / API /
   timeout failure) is categorically different from "measured a fail". They must be distinct
   statuses — never collapsed.

2. **Measurement errors are a first-class `error` status** — excluded from metrics and
   **surfaced as a count**, never silently counted as `fail`/`0`. `agreement` reports
   "N cases excluded (judge error)" and computes match only over successfully-measured cases.

3. **Prevent at the source with structured output.** The judge uses Claude **tool-use**
   (forced `tool_choice` on a schema'd `submit_verdict`), so the verdict JSON is valid **by
   construction** — this eliminates the parse-failure *class* rather than catching it.

4. **Derive deterministically; do not trust the model's arithmetic.** The model supplies the
   four axis scores + notes (its judgment); the harness computes `overall` and `verdict` from
   the formula. Separate the model's *judgment* from the harness's *derivation*.

5. **Defense in depth, not as the primary fix.** One retry + robust JSON extraction remain only
   as a fallback behind (3).

6. **Harness-wide.** This applies to every model-backed step (judge *and* skill/baseline runs):
   an API/parse error must surface as an error, never absorb into a score.

## Consequences

**Positive:** metrics reflect real signal, not measurement bugs; integrity survives inevitable
future API hiccups (timeouts, rate limits, model drift); the pattern is reusable across the
whole harness.

**Negative / risks + mitigations:**
- Slightly more code (tool-use, error status, metric exclusion). Mitigation: small next to the
  false conclusions it prevents — we nearly tuned rubrics on 20% noise.
- Tool-use couples the judge to Anthropic's tool API. Mitigation: keep it a thin adapter, same
  posture as the provider boundary (ADR-sdk-vs-raw-fetch).

## Alternatives considered

1. **Robust parse + retry only** (the first patch proposed) — rejected as the *sole* fix:
   treats the symptom, does not prevent the class, and leaves the deeper integrity flaw
   (errors coerced into fails).
2. **Keep counting parse failures as `fail`** (status quo) — rejected: silently pollutes every
   metric; it is the root cause of the false 27–33% agreement numbers.
3. **Prefill `{` to force JSON** — viable lighter alternative, but tool-use is preferred because
   the schema is API-guaranteed.

## Review triggers

- A metric moves and you cannot tell signal from measurement error → check the error count first.
- Adding a new model-backed eval step → apply the same error-status discipline.
- A judge/skill error rate is non-trivial → investigate the call; do not absorb it into scores.
