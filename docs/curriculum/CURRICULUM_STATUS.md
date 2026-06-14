# CURRICULUM STATUS (rolling 2-week plan — update weekly)

Updated: 2026-06-13
Current spine step: **Bài 0E — Dev-Agent Layer**
Next: Gate 0 cleanup
Budget this month: $______ / $______   (fill the cap; track spend per lesson)

## This week (≤3 items)
- [ ] Bài 0E: finalize `.claude/` (subagents + starter hooks), enable git hooks
      (`git config core.hooksPath .githooks`) → evidence: PR / commit
- [ ] Bài 0E: enable Claude Code Remote Control (mobile) → evidence: works from phone
- [ ] Gate 0: P1.1 skill-ID cleanup → evidence: grep proof in PR

## Next week (provisional)
- Gate 0: P1.3 retire skill-engine, P1.4 pin deps, P1.5 SDK ADR, lint ADR
- Bài 0D: design tokens + component registry + AGENTS.md design rules

## Done log
| Week | Item | Evidence |
|---|---|---|
| — | (none yet) | — |

## Blocked / decisions needed
- Budget cap number — set it.
- (Add any decision that needs a CCR or ADR here.)

## Spine insurance (do from day one)
- [ ] tenantId on every new storage/audit write
- [ ] SourceRef captured at generation time (once RAG exists)
- [ ] Remote Control enabled
