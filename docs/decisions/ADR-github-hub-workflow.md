# ADR — GitHub is the hub for a cross-device (laptop + mobile) workflow

**Status:** Accepted
**Date:** 2026-06-30
**Owner:** Hung Quach
**Related:** ADR-context-continuity-and-automation-boundary.md (this supersedes its
"repo as a *local* message-bus" assumption), docs/OPERATING_DISCIPLINE.md,
ADR-architecture-for-stronger-models.md

## Context

The canonical repo lives in **WSL** (Linux, `~/projects/...`) where Claude Code + git + node
run natively and fast. But **Cowork and Dispatch run on the Windows/cloud side and cannot read
WSL files** (UNC blocked, no WSL mount). Discovered while wiring the ~90%-mobile workflow via
Dispatch. Consequences observed:
- Handing context/briefs from laptop-Cowork to mobile-Dispatch required manual copy-paste and
  risked context loss (two separate sessions).
- Two execution surfaces emerged — **local Claude Code (WSL, Remote Control)** and **Cloud
  Claude Code (runs on the GitHub repo → PR)** — creating a local↔GitHub divergence risk.

The one thing **every** surface can reach is **GitHub**.

## Decision

1. **GitHub is the single hub / source of truth.** Durable state — `SESSION_HANDOFF.md`,
   `NEXT_BRIEF.md`, `CURRICULUM_STATUS.md`, and code — lives in the repo and is synced to GitHub.
   Every surface reads/writes GitHub.

2. **One surface per task — no straddling devices.** Each surface is self-sufficient because it
   reads state from GitHub:
   - Mobile, *code* → **Cloud Claude Code** → PR.
   - Mobile, *plan/think* → **Dispatch** (Cowork).
   - Laptop, *deep work* → **local Claude Code + Cowork** (WSL).

3. **No content copy-paste across devices — only fixed pointers.** e.g. Cloud:
   `Read docs/NEXT_BRIEF.md and do it. Commit and open a PR.` Cowork writes the brief into
   `NEXT_BRIEF.md`; a single `git push` publishes it; the mobile surface reads it via the pointer.

4. **Sync rule = pull-before-local, push-after — automated.** `/slice` and `/start` run
   `git pull --ff-only origin master` first; `/close` pushes; Cloud → PR → merge → laptop pulls on
   the next `/start`. The only rule to remember: *open local work with `/start` or `/slice`.*

5. **Bank-data boundary preserved.** Cloud (runs in Anthropic cloud on GitHub) is for
   **non-sensitive** tasks only (eval, docs, calibration). Sensitive product code touching real
   bank data stays **local** (Remote Control / laptop), per CLAUDE.md.

## Consequences

**Positive:** manual steps collapse to *one fixed pointer* (mobile) or *one push* (laptop→mobile);
no context loss (all surfaces read the same GitHub state); no divergence (pull-first automated);
mobile-90% works **while keeping the fast WSL repo** (no Windows migration needed).

**Negative / risks + mitigations:**
- Cross-device visibility requires state to be committed+pushed → small lag. Mitigation: `/close`
  pushes; update `SESSION_HANDOFF` at session end (enforced by `/close`).
- Discipline to always open local work via `/start`/`/slice`. Mitigation: they auto-pull.

## Alternatives considered

1. **Local-filesystem message-bus** (original ADR-context-continuity) — rejected: Cowork/Dispatch
   cannot read WSL files. GitHub replaces the local FS as the bus.
2. **Migrate the repo to a Windows drive** — viable and would let Cowork/Dispatch touch files
   directly, but slower git/node and abandons WSL-native; unnecessary since Remote Control + Cloud
   already cover mobile.
3. **Copy files/text device-to-device** — rejected: manual, error-prone; the exact pain removed.

## Review triggers

- A surface can't see current state → `SESSION_HANDOFF` is stale on GitHub or wasn't pushed.
- Local and GitHub diverge → `/start`/`/slice` pull-first wasn't run.
- A new surface is added → route it through GitHub under the same rules.
