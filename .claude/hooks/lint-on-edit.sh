#!/usr/bin/env bash
# Agent-side guard: run ESLint (errors only) after edits. Mirrors typecheck-on-edit.sh.
set -uo pipefail
if [ -f package.json ] && grep -q '"lint"' package.json ; then
  npm run lint -- --quiet
  status=$?
  if [ "$status" -ne 0 ]; then
    echo "Lint errors found — fix before proceeding (warnings are allowed)." >&2
    exit 1
  fi
fi
exit 0
