# DEV_AGENT_LAYER.md — how building and changing this product is governed

> **Deliverable of Bài 0E.** Authoritative spec: `docs/curriculum/CURRICULUM_V7_3.md` §Bài 0E.
> This file documents the *roster as contracts* and the *enforcement tiering*. The
> live definitions are in `.claude/` (now tracked in git) and `.githooks/`.

## Purpose

This is the layer of agents that **build and change** the Process Blueprint AI
Workbench, plus the deterministic gates that make the governance non-skippable.
The principle: we do not build dev agents from scratch — we compose primitives and
apply the *same* disciplines used on the product (skill-as-contract, human-in-the-loop,
enforced governance, version stamping, CCR) one level up.

This is distinct from the product-runtime AI (Bài 16, which is the product's own AI
learning from feedback). Here we govern *our dev process*.

## Enforcement tiering — which primitive enforces what

Choose the weakest primitive that still gives the guarantee you need.

| Primitive | Guarantee | Used for | Lives in |
|---|---|---|---|
| `CLAUDE.md` / rules | Advisory (~80% adherence) | coding style, architecture notes, naming | `.claude/CLAUDE.md`, `.claude/rules/` |
| **Hooks** | Deterministic — cannot be skipped | secrets block, typecheck-on-edit, no-force-push | `.githooks/`, `.claude/hooks/` |
| Subagents | Role + isolated context, returns a summary | dev/debug/reviewer/eval-runner/feedback-triager | `.claude/agents/` |
| Skills | Reusable procedures (former "custom commands") | `/triage`, `/release-notes`, `/new-skill` | `.claude/skills/` |
| Plugins | Versioned bundle of the above, for handover | sharing the same gates + roles with a team | packaged `.claude/` |

**Golden rule (dev-layer twin of §3.4):** anything that must be true **100% of the
time is a hook, not an instruction.** "Never commit secrets", "run typecheck after
edit", "never force-push master" are hooks. Style preferences are `CLAUDE.md`.

## Subagent roster (each is a short contract)

Each subagent is a bounded role of ~30 lines: role + input + output + allowed tools +
boundaries. None may commit or push — the **human approves the final diff**.

| Agent | Role | Tools | Key boundaries |
|---|---|---|---|
| `dev` | Implement ONE scoped change on a feature branch | read, edit, bash | smallest diff; list files before editing; no commit/push; don't touch unrelated files |
| `debug` | Diagnose a failing build/test/typecheck; propose a minimal fix | read, bash | root-cause + smallest patch; no broad refactors; one fix at a time |
| `reviewer` (QA) | Review a diff like a senior engineer before human approval | read, bash | flags scope creep, rule/contract/design violations, secrets, untrusted-content handling, coverage; **does not approve** |
| `eval-runner` | Run the Bài 7 regression eval; report vs the stamped baseline | read, bash | version-stamped pass/fail, score, cost, latency; prefer batch/cached/mock to respect budget; don't change prompts |
| `feedback-triager` | Turn a raw user report into a structured record; propose disposition | read | classifies + proposes (fix now / backlog / eval case / CCR); **does not act** |

The full contracts are in `.claude/agents/*.md`.

## Hooks (the enforcement layer)

Set up *before* Gate 0 so they guard the cleanup commits themselves.

| Event | Hook | Enforces |
|---|---|---|
| `pre-commit` | `.githooks/pre-commit` | block committing secrets (`.env`/`.key`/`.pem`/`creds`/secret patterns; `*.example`/`*.sample` allowed) |
| post-edit | `.claude/hooks/typecheck-on-edit.sh` (registered in `.claude/settings.json`, `PostToolUse` on `Edit|Write`) | run typecheck/lint; block on failure |
| `pre-push` | `.githooks/pre-push` | block force-push to master/main |

Enable the git hooks with: `git config core.hooksPath .githooks`.

> **Verify-against-docs:** the Claude Code hook registration format in
> `.claude/settings.json` changes faster than the bash scripts. Confirm the
> current schema at `code.claude.com/docs/en/hooks` after a Claude Code update.

## Human stays the approver

No agent autocommit or autopush. This is enforced by the `pre-push` hook, not just a
`CLAUDE.md` line. AI output never auto-applies; a human reviews and approves every diff.

## `.claude/` structure

```text
.claude/
  CLAUDE.md          # advisory standards (kept short)
  agents/            # the five subagents above, each ~30 lines
  hooks/             # typecheck-on-edit + settings.json registration
  settings.json      # PostToolUse hook registration
  rules/             # (future) path-scoped behaviors: tests.md, types.md, ...
  skills/            # (future) /triage, /release-notes, /new-skill
  .mcp.json          # (future) connectors with trust boundaries
```

`settings.local.json` and ephemeral session state stay git-ignored; the agent/hook
definitions are tracked so the layer is reproducible and shareable.

## Metrics

`hookBlockEvents` (secrets/force-push prevented) · `triageTurnaround` ·
`bugsConvertedToEvalCases` (Bài 7 v2/v3 growth) · `escapedRegressions` (target → 0 for
guarded cases).

## Guardrails

- **Least privilege:** each subagent gets only the tools it needs.
- **Data safety:** do not run dev agents on a cloud session over a branch with real
  bank data (Bài 0 mobile rule, Bài 17/17B).
- **Anti-over-engineering (§3.1):** start with these few subagents + the three starter
  hooks. Add more only when a repeated pain justifies it. Keep each contract short.
- **Handover (§13b):** package `.claude/` as a versioned plugin so a team inherits the
  same gates and roles.

## Done (definition)

Building and changing the product runs through bounded subagents with deterministic
hooks and human-approved diffs. See `docs/FEEDBACK_RECORD_SCHEMA.md` for how a user
report reliably becomes a guarded eval case or a CCR.
