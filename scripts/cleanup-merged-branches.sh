#!/usr/bin/env bash
# Delete ONLY junk branches that are provably fully merged into master.
# Safe-by-construction: a branch is deleted only if its tip is an ancestor of origin/master
# (i.e. 100% merged, 0 unique commits). Anything not merged is SKIPPED, never deleted.
# master and release/mvp1 are never candidates.
#
#   bash scripts/cleanup-merged-branches.sh              # DRY-RUN: show what would be deleted
#   DRY_RUN=0 bash scripts/cleanup-merged-branches.sh    # actually delete on origin + local
#
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"

DRY_RUN="${DRY_RUN:-1}"

# Superseded branches (RC iterations, per-lesson branches, old hardening/cleanup branches).
# master and release/mvp1 are intentionally NOT listed.
CANDIDATES=(
  chore/pre-review-cleanup
  curriculum/v7.3-operating-set
  feature/ai-governance-file-extraction
  feature/input-brief-ux-template-cleanup
  feature/lesson-02-ai-skill-design
  feature/lesson-03-structured-output
  feature/lesson-05-validation-evaluation
  feature/m2-m3-full-ai
  feature/mvp1-ai-rc4-ux-redesign
  feature/mvp1-ai-rc5-release-cleanup
  feature/mvp1-ai-rc6-final-ux-ai-hardening
  feature/mvp1-ai-rc7-final-release-cleanup
  feature/mvp1-ai-ui-ux-hardening
  feature/mvp1-ai-ux-redesign-rc3
  feature/process-core-real-ai-hardening
  feature/real-ai-openai-claude
  feature/ui-provider-capability-hardening
  feature/ux-qa-history-delivery-hardening
  feature/quality-gate-overhaul
)

echo "Fetching + pruning..."
git fetch --all --prune

deleted=0; skipped=0
for b in "${CANDIDATES[@]}"; do
  if ! git rev-parse --verify --quiet "origin/$b" >/dev/null; then
    echo "SKIP    $b   (no remote branch)"; skipped=$((skipped+1)); continue
  fi
  if git merge-base --is-ancestor "origin/$b" origin/master; then
    if [[ "$DRY_RUN" == "1" ]]; then
      echo "WOULD DELETE  $b   (fully merged into master)"
    else
      git push origin --delete "$b"
      git branch -D "$b" >/dev/null 2>&1 || true
      echo "DELETED $b"
    fi
    deleted=$((deleted+1))
  else
    echo "SKIP    $b   (NOT fully merged into master — kept for your review)"
    skipped=$((skipped+1))
  fi
done

echo
echo "Summary: eligible=$deleted  skipped=$skipped"
if [[ "$DRY_RUN" == "1" ]]; then
  echo "Dry-run only. To actually delete:  DRY_RUN=0 bash scripts/cleanup-merged-branches.sh"
fi
