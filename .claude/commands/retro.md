---
description: Reflect on recent work and propose process mechanisms for recurring problems (human approves).
argument-hint: [optional scope, e.g. "last 5 commits"]
---
You are running a short retrospective to turn recurring problems into mechanisms. Propose only — the human approves and applies.

Scope: $ARGUMENTS (default: recent commits + reviewer findings + dev-incident notes in agent memory)

Steps:
1. Gather signals from recent `git log`, diffs, reviewer findings, and agent memory: regressions,
   scope creep, line-ending churn, workflow-guardrail violations, repeated lint rules.
2. Classify each: one-off (ignore) vs recurring pattern (>= 2-3 times).
3. For each recurring pattern, propose a mechanism at the right Bài 0E tier: a git/Claude hook
   (must-hold-100%), a step in /slice, a reviewer/agent-memory rule, a CLAUDE.md guardrail, an ADR,
   or a CCR for structural change. Give: the pattern, the evidence (count), the proposed mechanism, where it lives.
4. Do NOT implement. Output a short proposal list (few highest-value items only — avoid over-mechanizing) for the human to approve.
