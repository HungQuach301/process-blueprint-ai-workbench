# CURRICULUM STATUS (rolling 2-week plan — update weekly)

Updated: 2026-06-14
Current spine step: **Bài 0D — done.** Next: Bài 7 (-min) — golden dataset v1 × 3 skills + baseline + judge calibration (activates eval-runner)
Known debt: 20 lint warnings (ratcheted at 20, ADR-lint-decision.md); 6 npm-audit moderate/low vulns (dev/transitive — do NOT `audit fix --force`, it downgrades next); 4 Date.now()-id sites → crypto.randomUUID later; DESIGN_SYSTEM_CONTRACT "Open decisions". 5 HIGH Next.js vulns fixed @ 003eb11; 7 lint errors fixed @ 56bd425.
Budget this month: $0 / $50   (track spend per lesson)

## This week (≤3 items)
- [x] Bài 0D: tokens + contract + AGENTS.md design rules → evidence: DESIGN_SYSTEM_CONTRACT.md
- [x] Dev-loop automation (/slice, /retro, pre-push gate, memory) + security-reviewer + Next.js security fix
- [ ] Bài 7 (-min): golden dataset v1 × 3 skills + baseline + judge calibration

## Next week (provisional)
- Bài 7 (-min): eval harness baseline (activates eval-runner)
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

## Blocked / decisions needed
- Budget cap set to $50/month (2026-06-14).
- npm audit: on-demand (security-reviewer) + CI later — NOT a hard pre-push gate.
- ui-ux = subagent-first, promote to standalone when needed; UI quality gates at Bài 21B (ADR-reusable-dev-agent-standard).

## Spine insurance (do from day one)
- [ ] tenantId on every new storage/audit write
- [ ] SourceRef captured at generation time (once RAG exists)
- [x] Remote Control enabled
