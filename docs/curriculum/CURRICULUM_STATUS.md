# CURRICULUM STATUS (rolling 2-week plan — update weekly)

Updated: 2026-06-21
Current spine step: **Bài 7-5a — done (real-AI baselines, 3 skills, stamped).** Next: Bài 7-5b — judge calibration (≥20 hand-labels + judge–human agreement) + harden the harness
Stamped baselines (skill gpt-5.4-mini / judge claude-sonnet-4-6): artifact-review passRate 1.0 (avg 0.93); process-improvement 0.7 (0.75); input-brief 0.2 (0.56, many partials — skill quality genuinely weak, 1 correct-rejection eval-009).
Known debt: input-brief prompt-pack quality is weak (lots of partials); baseline is single-run + non-deterministic (consider temperature 0 / multi-sample at 7-5b); 20 lint warnings (ratcheted at 20, ADR-lint-decision.md); 6 npm-audit moderate/low vulns (dev/transitive — do NOT `audit fix --force`, it downgrades next); 4 Date.now()-id sites → crypto.randomUUID later; DESIGN_SYSTEM_CONTRACT "Open decisions".
Budget this month: ~$1 / $50   (7-4 smoke test + ~6 full baseline runs during the OpenAI-400 / 422-null debugging)

## This week (≤3 items)
- [x] Bài 7-1..7-3: golden datasets v1 × 3 skills (versioned) + rubrics + run-eval scaffolding
- [x] Bài 7-4: LLM-judge runner (evals/common/judge.ts + test:judge) — Claude judge, GOOD>BAD verified
- [x] Bài 7-5a: real-AI baselines × 3 skills stamped; fixed 3 real bugs the eval surfaced (mock-fallback, OpenAI strict-schema 400, null-422)
- [ ] Bài 7-5b: unit-test normalizeProviderOutput + ≥20 hand-labels + judge–human agreement

## Next week (provisional)
- Bài 7-5b: harden harness (deterministic normalizer tests) + judge calibration, activates eval-runner vs stamped baseline
- Then Bài 9 (-min): executor/advisor both directions + prompt caching + cost per attempt

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

## Blocked / decisions needed
- Budget cap set to $50/month (2026-06-14).
- npm audit: on-demand (security-reviewer) + CI later — NOT a hard pre-push gate.
- ui-ux = subagent-first, promote to standalone when needed; UI quality gates at Bài 21B (ADR-reusable-dev-agent-standard).

## Spine insurance (do from day one)
- [ ] tenantId on every new storage/audit write
- [ ] SourceRef captured at generation time (once RAG exists)
- [x] Remote Control enabled
