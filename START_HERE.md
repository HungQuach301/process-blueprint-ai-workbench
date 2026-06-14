# START HERE — Curriculum v7.3 operating set

This package gives you exactly what you need to **start executing**, nothing more.
It deliberately does NOT pre-create the deliverables of all 28 lessons — those are
produced as you do each lesson. It contains: the source of truth, a thin operating
layer, and the real scaffolding for spine step 1 (Bài 0E).

## Operating model (from Curriculum §3.7)
- `docs/curriculum/CURRICULUM_V7_3.md` is the **single source of truth**.
- Chat is a workspace. Changes to the curriculum happen ONLY via a CCR commit
  (see `docs/curriculum/CCR_LOG.md`).
- The modular files here are **thin dashboards/working files** — they point INTO
  the curriculum, they do not restate it. This avoids two-sources-of-truth drift.
  (Decided in CCR-0001.)

## Two fixes baked in (from the review)
- **CCR-0001**: single source of truth = the curriculum file; operating docs are pointers.
- **CCR-0002**: the "no extra steps" rule corrected — it blocks AI-INVENTED
  lessons/gates/steps, but the official spine-minimum scopes (Bài 7-min, 9-min,
  17B-min, 22-mini) ARE the curriculum and must be followed as written.
  See `docs/curriculum/NO_EXTRA_INTERMEDIATE_STEPS_RULE.md`.

## Install into your repo (from repo root)
```bash
unzip AI_ORCHESTRATION_CURRICULUM_V7_3_STARTER.zip -d .
git add -A
git status --short
git diff --cached --stat
# review, then:
git commit -m "docs: adopt curriculum v7.3 operating set + Bài 0E scaffold"

# enable the deterministic git hooks (secrets + force-push guards)
git config core.hooksPath .githooks
chmod +x .githooks/* .claude/hooks/*.sh curriculum/scripts/dev.sh
```

## What to do first (the only correct start)
1. Open `docs/curriculum/CURRICULUM_STATUS.md`, fill the budget cap.
2. Execute **Bài 0E** (spine step 1): the `.claude/` agents + hooks are scaffolded;
   verify hook syntax against docs, enable Remote Control (mobile).
3. Then **Gate 0** cleanup using `GATE0_CHECKLIST.md`.
4. Do NOT start Bài 9 routing/cost. Do NOT promote any `-min` lesson to its full
   version. Do NOT insert Bài 3B before Bài 7 (3B is interleaved/E1).
5. For the next chat/session, paste `docs/curriculum/NEXT_CONTEXT_PACK.md`.

## Verify-against-docs items (things that change fast)
- Claude Code subagent frontmatter + hook registration: `code.claude.com/docs`.
- Remote Control / mobile setup: `code.claude.com/docs/en/remote-control`.
The bash hook *scripts* and git hooks here are stable; only the Claude-Code-side
registration format needs verifying.
