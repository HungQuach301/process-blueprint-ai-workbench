# Bài 0E — Dev-Agent Layer & User-Feedback Loop (workspace)

Authoritative spec: CURRICULUM_V7_3.md §Bài 0E. This folder is a workspace, NOT a new step.

## Spine scope (do now)
- [ ] `.claude/agents/*` reviewed and adjusted to your repo (dev, debug, reviewer,
      eval-runner, feedback-triager).
- [ ] Starter hooks active: `.githooks/pre-commit` (secrets), `.githooks/pre-push`
      (no force-push), `.claude/hooks/typecheck-on-edit.sh`.
      Install: `git config core.hooksPath .githooks`.
- [ ] Verify Claude Code hook registration syntax (.claude/settings.json) at docs.
- [ ] `curriculum/scripts/dev.sh` runs; no agent autocommit/push.
- [ ] Deliverables: DEV_AGENT_LAYER.md, FEEDBACK_RECORD_SCHEMA.md.

## Feedback loop (activates when first users arrive)
- Capture → triage (feedback-triager) → fix → verify (eval-runner) → release.
- Confirmed bug → golden dataset v2 case; security report → red-team v3 case.

## Done
Building runs through bounded subagents + deterministic hooks + human-approved diffs.
