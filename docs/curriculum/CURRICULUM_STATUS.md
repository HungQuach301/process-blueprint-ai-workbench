# CURRICULUM STATUS (rolling 2-week plan — update weekly)

Updated: 2026-06-30
Current spine step: **Bài 7-5b — DONE (judge calibrated, baseline locked).** Next: Bài 9 — executor/advisor both directions + prompt caching + cost per attempt.
Calibrated baseline (skill gpt-5.4-mini / judge claude-sonnet-4-6, per-action question): judge–human within ±1 = 100%, 0 two-level (fail↔pass) disagreements, MAD 0.33, exact-3-class 0.67 (info only). artifact-review 10/10 exact. Acceptance gate = "0 two-level + MAD ≤ 0.5" (not exact-3-class).
7-5b journey — eval surfaced a deeper truth at each layer: judge over-grading → measurement bug (JSON parse coerced to fail = 20% of cases) → wrong question (per-action vs whole-process) → wrong acceptance metric (exact-3-class). Each fixed; baseline now trustworthy.
Budget this month: ~$1 / $50.

## This week (≤3 items)
- [x] Bài 7-1..7-3: golden datasets v1 × 3 skills (versioned) + rubrics + run-eval scaffolding
- [x] Bài 7-4: LLM-judge runner (evals/common/judge.ts + test:judge) — Claude judge, GOOD>BAD verified
- [x] Bài 7-5a: real-AI baselines × 3 skills stamped; fixed 3 real bugs the eval surfaced (mock-fallback, OpenAI strict-schema 400, null-422)
- [x] Bài 7-5b: normalizer unit tests · calibration tooling + labels · re-judge tool · reliable judge (tool-use, error-status) · per-action decision · meaningful gate · calibrated baseline LOCKED

## Next week (provisional)
- Bài 9 (-min): executor/advisor both directions + prompt caching + cost per attempt (activates eval-runner vs the locked baseline)

## Done log
| Week | Item | Evidence |
|---|---|---|
| 2026-06-14 | Curriculum v7.3 operating set adopted | PR #1 (curriculum/v7.3-operating-set) |
| 2026-06-14 | Bài 0E dev-agent layer + deliverables | PR #2 (lesson/0E-dev-agent-layer) |
| 2026-06-14 | Remote Control enabled (mobile) | connected from phone |
| 2026-06-14 | Gate 0 cleanup (P1.1–P1.5 + lint) | master @ 05cc299; ADRs in docs/decisions |
| 2026-06-14 | Lint: cleared 7 errors (helper renames + apostrophe) | master @ 56bd425 |
| 2026-06-14 | Dev-loop automation (/slice, /retro, lint-on-edit, pre-push gate, memory) | master @ 92dd36f |
| 2026-06-14 | Bài 0D: tokens + contract + AGENTS design rules | master @ 745613d |
| 2026-06-14 | security-reviewer agent + Next.js 16.2.9 (5 HIGH fixed) | master @ 003eb11 |
| 2026-06-14 | ADRs: skill-id-aliases, sdk-vs-raw-fetch, lint-decision, reusable-dev-agent-standard | docs/decisions/ |
| 2026-06-21 | Bài 7-1..7-3: golden datasets v1 (3 skills, versioned) + rubrics + run-eval scaffold | evals/datasets/*/v1/ |
| 2026-06-21 | Bài 7-4: LLM-judge runner (Claude judge); GOOD 0.63 > BAD 0.13 verified | evals/common/judge.ts; master merged |
| 2026-06-21 | Bài 7-5a: stamped real-AI baselines × 3 skills; eval surfaced+fixed mock-fallback, OpenAI strict-schema 400, scoped null-422 | evals/datasets/*/v1/baseline.json; master merged |
| 2026-06-27 | Bài 7-5b-1: deterministic unit tests for normalizeProviderOutput (4 fixtures lock null-handling per consumer) | evals/normalizer/test-normalizer.ts; master merged |
| 2026-06-27 | Calibration tooling (blind labeling app + agreement) + 30 human labels; surfaced judge over-grading | evals/calibration/; master merged |
| 2026-06-30 | Bài 7-5b: reliable judge (tool-use structured output + error-status) + re-judge tool; killed 20% JSON-parse measurement bug | evals/common/judge.ts, evals/calibration/rejudge.ts; master merged |
| 2026-06-30 | Bài 7-5b DONE: per-action decision + meaningful agreement gate + LOCKED calibrated baseline (within ±1 100%, MAD 0.33) | evals/datasets/*/v1/baseline.json, evals/calibration/labels.json |

## Blocked / decisions needed
- Budget cap set to $50/month (2026-06-14).
- npm audit: on-demand (security-reviewer) + CI later — NOT a hard pre-push gate.
- ui-ux = subagent-first, promote to standalone when needed; UI quality gates at Bài 21B (ADR-reusable-dev-agent-standard).

## Ad-hoc backlog (NOT spine lessons — fix opportunistically, track here)
- [x] Add `test:normalizer` to `.githooks/pre-push` — done (100% enforcement)
- [ ] input-brief prompt-pack quality (some per-action gaps — real, not a bug)
- [x] Judge non-determinism: judge runs at temperature 0 (done); multi-sample later if needed
- [x] rejudge reads rubric-version from rubric.md + stamps `rubricVersion` (done via Cloud PR #3) — leftover: `JUDGE_VERSION_V2` now a dead export in judge.ts, remove someday
- [ ] Extend deterministic unit tests to other pure functions (schemas, generators, provider adapter)
- [ ] 20 lint warnings (ratcheted, ADR-lint-decision.md) · 6 npm-audit moderate/low (do NOT `audit fix --force`) · 4 Date.now()-id → crypto.randomUUID
- [ ] DESIGN_SYSTEM_CONTRACT "Open decisions" (palette, typography scale, token↔globals drift guard)

## Decisions to record (ADR — docs/decisions/)
- [x] ADR: scope shared code by consumer → docs/decisions/ADR-scope-shared-code-by-consumer.md
- [x] ADR: architecture for stronger models/platform → docs/decisions/ADR-architecture-for-stronger-models.md
- [x] ADR: context continuity + automation boundary → docs/decisions/ADR-context-continuity-and-automation-boundary.md
- [x] ADR: eval measurement integrity (never coerce a failed measurement into a data point) → docs/decisions/ADR-eval-measurement-integrity.md
- [ ] ADR (optional): judge acceptance criteria (0 two-level + MAD ≤ 0.5, not exact-3-class) — rationale currently in agreement.ts comment

## Spine insurance (do from day one)
- [ ] tenantId on every new storage/audit write
- [ ] SourceRef captured at generation time (once RAG exists)
- [x] Remote Control enabled
