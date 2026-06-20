# ADR — Reusable dev-agent standard (core + optional roles, staged activation)

**Status:** Accepted
**Date:** 2026-06-14
**Owner:** Hung Quach
**Related:** Bài 0E (dev-agent layer), §13b (handover as a versioned plugin),
`docs/DEV_AGENT_LAYER.md`, `docs/DESIGN_SYSTEM_CONTRACT.md`

## Context

We want to standardize how we build a product so the process is reusable for future
products, not only `process-blueprint-ai-workbench`. The dev-agent layer built in Bài 0E
(subagents + deterministic hooks + human-approved diffs) is the natural reusable asset.

The decision: what does the standard contain, and how does it scale to an ambitious
product (here: an AI workbench over banking data) without over-provisioning agents that
sit idle and drift — which would violate our own anti-over-engineering rule (§3.1,
NO_EXTRA_INTERMEDIATE_STEPS_RULE).

## Decision

1. **The reusable asset is the governance pattern, not a fixed list of agents.** What
   carries across products: the enforcement tiering (hook → command → subagent → CLAUDE.md),
   the contract pattern (e.g. DESIGN_SYSTEM_CONTRACT), the `/slice` + `/retro` loop, the
   human-approves-every-diff rule, and the ADR/CCR habit. Agents are swappable; the pattern
   is the standard.

2. **Package it as a versioned template/plugin** (§13b): `.claude/` (core agents, hooks,
   `/slice`, `/retro`) + `.githooks/` + `CLAUDE.md` + an ADR set + a contract skeleton. A
   new product clones the template and enables the optional roles it needs.

3. **Structure the roster as Core + Optional/Lifecycle, define all but instantiate when the
   work exists** ("define-all, build-when-needed"). The full catalog lives in the standard;
   each product/lifecycle stage activates the subset that applies.

4. **Every agent routes through one shared contract + one set of gates + human approval.**
   No parallel pipelines, no second governance. New roles plug into the existing reviewer +
   hooks + pre-push gate.

### Roster, classification, and activation map

| Agent | Role | Class | Instantiate when |
|---|---|---|---|
| `dev` | implement one scoped change | core | now (present) |
| `debug` | diagnose a failing build/test/typecheck | core | now (present) |
| `reviewer` | review a diff vs rules/contracts/risks | core | now (present) |
| `eval-runner` | run regression eval vs stamped baseline | domain: AI | present; activates at Bài 7 (eval harness) |
| `feedback-triager` | turn a user report into a structured record | lifecycle | present; activates once users exist |
| `ui-ux` | generate UI from the design contract | domain: UI | when building screens (0D-4 / Bài 21) |
| `security-reviewer` | deep security / data-handling review | domain: sensitive-data | early (banking data) or when security review recurs |
| `test-writer` | author tests | optional | when test-writing becomes a recurring task |
| `release` / devops | release + rollback path | lifecycle | at Bài 20 (release) |

The first five exist today in `.claude/agents/`; the rest are defined here and created at
their activation point.

## Consequences

**Positive:** one reusable operating layer across products; the roster scales without idle
agents; honors anti-over-engineering (build a role only when its work exists); each new
product starts from a known-good template instead of from scratch.

**Negative / risks + mitigations:**
- A full catalog tempts premature building. Mitigation: the activation map above + letting
  `/retro` + agent memory surface which roles a product actually needs.
- Coordination grows with the roster (who calls whom). Mitigation: the main agent / `/slice`
  orchestrates per task; codify standard chains (e.g. dev → reviewer → security-reviewer →
  eval-runner) only after real use, not upfront.
- Drift between the template and live products. Mitigation: version the template; pull
  improvements back as template updates.

## Alternatives considered

1. **One fixed roster for every product** — rejected: over-provisions backend-only products
   and under-provisions others; no per-product fit.
2. **Build the entire roster upfront in this product** — rejected: idle agents drift, add
   maintenance and cognitive load, and several are lifecycle-gated; contradicts §3.1.

## Review triggers

- Starting a new product: clone the template, enable the applicable optional roles.
- A role recurs across products: promote it from optional to core in the template.
- Coordination among many agents becomes a pain: define standard agent chains.
- A new enforcement need appears: add it at the right tier (hook/command/CLAUDE.md), not as
  another agent by default.
