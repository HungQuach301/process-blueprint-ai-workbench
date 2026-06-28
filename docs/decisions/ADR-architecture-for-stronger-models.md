# ADR — Architecture stance for a strengthening model + agent platform

**Status:** Accepted (directional — revisit as the platform evolves)
**Date:** 2026-06-27
**Owner:** Hung Quach
**Related:** AGENTS.md §12 (product strategy / moat), docs/PRODUCT_NORTH_STAR.md,
docs/ROADMAP.md, ADR-sdk-vs-raw-fetch.md, ADR-reusable-dev-agent-standard.md

## Context

Foundation models and the surrounding agent platform (Claude Agent SDK, Dynamic Workflows,
Managed Agents, MCP) are improving rapidly. For an ambitious product — an AI Process & Spec
workbench over banking data — we need an explicit architecture stance so the product **rides
the model up** instead of being commoditized or absorbed by the platform.

Observed principle from Claude Code's own design: keep the harness thin and model-agnostic,
treat context as the scarce resource, and make safety/governance a first-class citizen. The
same principle applies to *our* product, which is itself a harness around the model.

## Decision

**Guiding rule: build *thin* where the platform is heading; build *deep* where it never will.**

1. **Keep the model boundary thin, model-agnostic, and swappable.** Providers read the model
   from config (already true — see ADR-sdk-vs-raw-fetch); skills must not bake model-specific
   quirks. Add **per-task model routing** (cheap model for simple skills, strong for hard
   ones; cross-family judge — already practised: skill `gpt-5.4-mini`, judge
   `claude-sonnet-4-6`). Do **not** invest deeply in middle logic the model will soon do
   better; keep the boundary to model quirks clean and test-guarded
   (see ADR-scope-shared-code-by-consumer).

2. **Invest deep in the durable moat the platform will not provide:**
   - **Context engineering** — Artifact Graph, Traceability Matrix, Domain Packs (banking).
     Core competency = *assembling the right context*, not prompt cleverness.
   - **Governance / determinism for a regulated domain** — schema validation, quality gates,
     human approval, audit, `tenantId`, `SourceRef`. As models become more autonomous this
     matters *more*, not less; it is the banking moat.
   - **The eval/quality harness** — version-stamped baselines + a calibrated judge — is what
     lets us safely adopt stronger *or* cheaper models.

3. **Keep skills composable so orchestration can be added when the work exists.** The skill
   chain (notes→BRD→SRS→user-stories→AI-coding-pack) is a latent multi-step workflow. Build
   any orchestration **thin enough to adopt the platform's** (Agent SDK / Dynamic Workflows)
   rather than hand-rolling a bespoke multi-agent engine. Honor build-when-needed
   (ADR-reusable-dev-agent-standard, §3.1).

4. **Treat MCP as the integration boundary** — consume external systems (Jira, Confluence,
   core banking) via MCP, and expose the workbench as a tool other agents can call. Bet on
   interoperability so the product lives inside a multi-agent world rather than as an island.

## Consequences

**Positive:** model/platform improvements *lift* the product instead of obsoleting it; the
moat concentrates in defensible areas (domain context + governance) and away from
commoditized ones (prompting, raw generation); the thin boundary makes model upgrades a
config change.

**Negative / risks + mitigations:**
- Tempting to over-build orchestration / multi-agent now. Mitigation: build-when-needed; the
  activation map in ADR-reusable-dev-agent-standard governs roster growth.
- Betting on still-evolving standards (MCP / Agent SDK). Mitigation: keep adapters thin so we
  can swap if standards shift.
- "Deep governance" can slow shipping. Mitigation: it *is* the product for banking; treat it
  as feature, not overhead.

## Alternatives considered

1. **Build a deep bespoke orchestration/agent engine now** — rejected: the platform will
   provide it; idle complexity drifts.
2. **Couple tightly to one model for maximum quality now** — rejected: lock-in; model-quirk
   coupling already caused the strict-schema/null bug chain.
3. **Compete on raw generation quality** — rejected: that is exactly what foundation models
   commoditize.

## Review triggers

- Platform ships orchestration/memory primitives we hand-built → adopt them, delete ours.
- A skill needs deep model-specific tuning → revisit the thin-boundary stance for that skill.
- MCP / Agent SDK standards shift materially → revisit adapters.
- Starting a new Domain Pack → it belongs in the *deep* context layer, not the thin model layer.
