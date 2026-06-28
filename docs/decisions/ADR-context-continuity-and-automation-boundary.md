# ADR — Context continuity across sessions, and the automation boundary

**Status:** Accepted (directional — revisit as the mobile/Dispatch workflow matures)
**Date:** 2026-06-27
**Owner:** Hung Quach
**Related:** docs/OPERATING_DISCIPLINE.md, AGENTS.md §13–14 (required context + work-session
ritual), CLAUDE.md (work-division), ADR-reusable-dev-agent-standard.md,
ADR-architecture-for-stronger-models.md

## Context

Goal: drive the project ~90% from mobile (Dispatch + Cowork + Claude Code Remote Control),
switch freely between tools, and never lose context or waste time re-setting-up. In practice we
hit the **cold-start problem**: a fresh Dispatch/Cowork session has none of the prior chat's
context and had to ask where files were. Separately, we want to automate the Cowork↔Claude Code
handoff further **without** dissolving the work-division (Cowork = docs/plans/review; Claude Code
= code via dev subagent + human approval) or the human gate on `src/` diffs (banking data).

## Decision

### A. Context lives in the repo, not in chat
Every session (Dispatch, Cowork, Claude Code) is a **stateless front-end**; the **repo is the
persistent brain**. Durable state goes in version-controlled files any session reads on connect.
Chat history is ephemeral and must not be the carrier of project state.

### B. Lean, single-purpose context (anti-bloat = NO_EXTRA rule for docs)
- `docs/SESSION_HANDOFF.md` is a **pointer of ≤~15 lines**: current state, active task + branch +
  next step, open decisions. It does NOT duplicate CURRICULUM_STATUS / ROADMAP.
- One doc per purpose; no duplication across docs.
- **gitignore anything a generator rebuilds** (e.g. `labeling-app.html`); commit only durable
  references (e.g. `baseline.json`). Never commit transient scratch or throwaway briefs.

### C. The continuity loop: read-on-start, write-on-end
- **Write-on-end** is folded into `/close` (or a `/handoff` command) → `SESSION_HANDOFF` is
  updated when a slice closes; never forgotten.
- **Read-on-start**: CLAUDE.md/AGENTS.md instruct Claude Code to read `SESSION_HANDOFF` +
  `CURRICULUM_STATUS` first (auto-loaded); a one-line paste-snippet bootstraps Cowork/Dispatch.

### D. Repo as the message bus between Cowork and Claude Code
Cowork writes durable state/decisions (docs); Claude Code reads them, does the code, writes back
via `/close`. The repo mediates the handoff → no copy-paste, context persists, each tool stays in
its lane. The *transient* brief is carried by Dispatch (no file needed); only *durable* state is
filed.

### E. Automation boundary — automate plumbing, keep the gate
- **Automate** the safe / reversible / read-only plumbing: Dispatch routing, the repo
  message-bus, scheduled/background runs (eval, re-judge, agreement, digests), push notifications.
- **Keep human**: approval of `src/` diffs (banking). Never auto-merge code. Make the gate *fast*
  via deterministic hooks/tests so approval is a scope+evidence check, not a deep read.
- The dividing line — *automate what is safe/reversible/read-only; gate what applies to the
  product* — coincides exactly with the work-division boundary, so more automation does not blur
  it.

## Consequences

**Positive:** mobile-90% + free tool-switching with no re-setup; continuity survives session
restarts and tool changes; the boundary stays intact; near-zero repo bloat.

**Negative / risks + mitigations:**
- Handoff goes stale if not updated → mitigation: write-on-end enforced by `/close`.
- Convenience tempts auto-applying code → mitigation: the `src/` gate is explicit and
  banking-justified; only read-only work is automated.
- Doc sprawl creeps back → mitigation: one-doc-per-purpose + gitignore generated artifacts.

## Alternatives considered

1. **Rely on chat memory for continuity** — rejected: ephemeral, per-session, per-tool; exactly
   what caused the cold-start failure.
2. **Duplicate context across many docs** — rejected: bloat + drift.
3. **Auto-merge AI code to remove the human bottleneck** — rejected: dissolves the gate, unsafe
   for banking.

## Review triggers

- Cold-start friction recurs → `SESSION_HANDOFF` is stale or not being read; fix the loop.
- A generated artifact bloats the repo → gitignore it.
- A recurring Cowork→Claude Code chain stabilizes → codify it as a command (build-when-needed).
