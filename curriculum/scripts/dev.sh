#!/usr/bin/env bash
# Bài 0E dev-agent pipeline scaffold. Human approves everything; no autocommit/push.
set -euo pipefail

SLICE="${1:-}"
if [ -z "$SLICE" ]; then
  echo "usage: ./curriculum/scripts/dev.sh <branch-slice-name>" ; exit 1
fi

echo "==> creating branch: dev/$SLICE"
git checkout -b "dev/$SLICE" 2>/dev/null || git checkout "dev/$SLICE"

echo "==> baseline checks"
[ -f package.json ] && grep -q '"typecheck"' package.json && npm run typecheck || echo "(no typecheck script)"
[ -f package.json ] && grep -q '"build"' package.json && npm run build || echo "(no build script)"

cat <<TXT

Pipeline ready for slice: $SLICE
Suggested flow (you drive Claude Code / Codex):
  1) dev subagent     -> implement the smallest diff
  2) debug subagent   -> if tsc/build fails
  3) reviewer subagent-> review the diff (risks)
  4) eval-runner      -> if this touches a skill, run regression vs baseline
  5) YOU approve the diff, then commit manually (hooks will guard the commit)

No agent commits or pushes. That is enforced by .githooks.
TXT
