#!/usr/bin/env bash
# Agent-side guard: run typecheck after edits during a Claude Code session.
# Registered via .claude/settings.json (verify exact schema at code.claude.com/docs).
set -uo pipefail
if [ -f package.json ] && grep -q '"typecheck"' package.json ; then
  npm run typecheck
  status=$?
  if [ "$status" -ne 0 ]; then
    echo "Typecheck failed — fix before proceeding." >&2
    exit 1
  fi
fi
exit 0
