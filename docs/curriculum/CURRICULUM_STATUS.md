# CURRICULUM STATUS (rolling 2-week plan — update weekly)

Updated: 2026-06-14
Current spine step: **Bài 0E — Dev-Agent Layer**
Next: Gate 0 cleanup
Budget this month: $0 / $50   (track spend per lesson)

## This week (≤3 items)
- [x] Bài 0E: finalize `.claude/` (subagents + starter hooks), enable git hooks
      (`git config core.hooksPath .githooks`) → evidence: PR #1 + #2 merged
- [x] Bài 0E: enable Claude Code Remote Control (mobile) → evidence: connected from phone
- [ ] Gate 0: P1.1 skill-ID cleanup → evidence: grep proof in PR

## Next week (provisional)
- Gate 0: P1.3 retire skill-engine, P1.4 pin deps, P1.5 SDK ADR, lint ADR
- Bài 0D: design tokens + component registry + AGENTS.md design rules

## Done log
| Week | Item | Evidence |
|---|---|---|
| 2026-06-14 | Curriculum v7.3 operating set adopted | PR #1 (curriculum/v7.3-operating-set) |
| 2026-06-14 | Bài 0E dev-agent layer + deliverables | PR #2 (lesson/0E-dev-agent-layer) |
| 2026-06-14 | Remote Control enabled (mobile) | connected from phone |

## Blocked / decisions needed
- Budget cap set to $50/month (2026-06-14).
- (Add any decision that needs a CCR or ADR here.)

## Spine insurance (do from day one)
- [ ] tenantId on every new storage/audit write
- [ ] SourceRef captured at generation time (once RAG exists)
- [x] Remote Control enabled
