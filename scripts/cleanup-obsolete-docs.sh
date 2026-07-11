#!/usr/bin/env bash
# Retire obsolete Codex-era state/planning docs and stage the doc-normalization edits.
# Safe: only `git rm` tracked files from the explicit list; stages everything for your review.
# Nothing is committed unless you pass --commit.
#
#   bash scripts/cleanup-obsolete-docs.sh            # stage only (review), no commit
#   bash scripts/cleanup-obsolete-docs.sh --commit   # stage + commit
#
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"

OBSOLETE=(
  docs/CURRENT_STATE.md
  docs/ROADMAP.md
  docs/NEXT_IMPLEMENTATION_PLAN.md
  docs/MILESTONE_1_TECHNICAL_STATUS.md
  docs/MVP1_RELEASE_NOTES.md
  docs/MVP1_RELEASE_CHECKLIST.md
  docs/MVP1_AI_STABLE_RELEASE_CHECK.md
  docs/USER_FACING_READINESS_CHECK.md
  docs/AI_ORCHESTRATOR_SESSION_HANDOFF.md
  docs/AI_ORCHESTRATOR_LESSON_02_HANDOFF.md
  docs/AI_ORCHESTRATOR_LESSON_03_HANDOFF.md
)

echo "== Removing obsolete docs =="
for f in "${OBSOLETE[@]}"; do
  if git ls-files --error-unmatch "$f" >/dev/null 2>&1; then
    git rm -q -- "$f"
    echo "  removed: $f"
  else
    echo "  skip (not tracked): $f"
  fi
done

echo
echo "== Staging doc-normalization edits =="
# NOTE: .codex/CURRENT_TASK.md is gitignored by design (a local rolling task file),
# so it is intentionally NOT staged here — its reset stays local-only.
git add -A -- \
  README.md \
  AGENTS.md \
  .codex/PROMPT.md \
  docs/NEXT_BRIEF.md \
  docs/SESSION_HANDOFF.md \
  docs/curriculum/NEXT_CONTEXT_PACK.md \
  docs/curriculum/CCR_LOG.md \
  docs/curriculum/CURRICULUM_V7_3.md \
  docs/AI_SKILL_DESIGN_REVIEW.md \
  docs/PROVIDER_ROUTING_AUDIT.md \
  scripts/cleanup-obsolete-docs.sh \
  scripts/cleanup-merged-branches.sh

echo
echo "== Staged changes =="
git status --short
echo
git diff --cached --stat

if [[ "${1:-}" == "--commit" ]]; then
  git commit -m "docs: retire obsolete Codex-era state docs; point to curriculum single source of truth"
  echo
  echo "Committed. Review, then push:  git push origin master"
else
  echo
  echo "DRY-RUN (staged only). Re-run with --commit to commit, or undo staging with:  git reset"
fi
