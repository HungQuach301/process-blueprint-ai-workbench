# Rule — No AI-Invented Steps (corrected, CCR-0002)

## Purpose
Stop any assistant (Claude/Codex/etc.) from ballooning the plan by inventing
lessons, gates, sub-steps, or deliverables that are not in the curriculum.

## BANNED (do not do without a CCR)
- Inventing a new lesson, gate, sub-step, phase, or deliverable not in
  `CURRICULUM_V7_3.md`.
- Creating ad-hoc "-min", "-lite", "-prep", or "-phase-0" variants of a lesson
  that the curriculum does not define.
- Renumbering lessons/gates, or reordering the spine.
- Promoting an official spine-minimum lesson to its full Expansion scope while
  still in the spine.
- Changing the curriculum in chat without a CCR commit.

## OFFICIAL — follow exactly, this is NOT "extra steps"
- The **spine-minimum scopes are the curriculum**: Bài 7-min, Bài 9-min,
  Bài 17B-min, Bài 22-mini. Do the minimum scope in the spine; the full version
  is Expansion. (See §6.0.)
- The **two-track markers** (S, S-min, S?, I, E1–E5) are official.
- **Bài 0E → Gate 0** order is official (hooks guard the cleanup commits).
- **Bài 3B is Interleaved / E1**, NOT a spine step before Bài 7. Its *provenance
  capture* is spine insurance; its *strategy* is decided around RAG time (E1).
- **Bài 8 is conditional**: do its build work only if the Bài 7 baseline shows a
  quality gap worth the cost.

## Mechanism
If something genuinely should change, write a CCR in `CCR_LOG.md` and commit it.
No CCR → no change. The curriculum is the source of truth.
