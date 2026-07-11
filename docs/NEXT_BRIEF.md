# NEXT BRIEF — the current task handed to any session (Cowork / Dispatch / Claude Code)

> Rolling, single-purpose file — **overwritten each time**, not a changelog. Cowork writes the next
> task here; from any device you send the one fixed pointer:
> "Read docs/NEXT_BRIEF.md and run it in Claude Code (close with /close)" — no copy-paste of the brief.

## Task (2026-07-11) — Bài 9-min · slice 1: model capability catalog + routing/cost plan

Run as a Claude Code `/slice`, close with `/close`. This is the FIRST slice of Bài 9 (spine minimum);
the remaining slices are listed at the bottom — do NOT do them in this slice.

### Scope (slice 1 only)

1. Build the **model capability catalog** (data + types): per model — capabilities, cost, context
   length, caching support, `verifiedDate`, `deprecationStatus`. Re-verify each entry against the
   official provider docs and stamp `verifiedDate`. Routing logic must READ this catalog — never
   hard-code model-name strings (catalog rule, v7.1).
2. Write `docs/PROVIDER_ROUTING_COST_OPTIMIZATION_PLAN.md`: the executor/advisor hypothesis tested
   **both directions**, which **2–3 key skills** to test against the **locked Bài 7 baseline**
   (`evals/datasets/<skill>/v1/baseline.json`), the cacheable-prefix design (stable system + domain
   pack + schema first, volatile payload last), and the metric list (see §Metrics below).

### Constraints

- **Cowork boundary:** `src/**` changes go through the **dev subagent + reviewer + human approval** —
  this brief is the spec, not the implementation. Cowork only owns the plan doc (.md).
- **No hard-coded model strings** in routing; catalog entries carry `verifiedDate` + deprecation.
- **No invented sub-steps / `-min` / `-lite` variants** (see `NO_EXTRA_INTERMEDIATE_STEPS_RULE.md`).
  Stay within the Bài 9 spine-minimum scope.
- `tenantId` on any new storage/audit write; AI output stays human-in-the-loop (no auto-apply).
- **Do NOT call external providers in this slice** — catalog + plan doc are offline work.

### Metrics (to define in the plan, measured in later slices)

cost executor-only vs executor+advisor (both directions) · quality vs Bài 7 baseline · latency /
escalation rate · cacheHitRate / costSavedByCachePct · fallbackActivations · cost per valid output.

### Verify

`npm run typecheck` + `npm run lint` green. Catalog types compile; plan doc lists the metrics and the
exact skills + both-direction hypotheses to test. Deliverable path: `docs/PROVIDER_ROUTING_COST_OPTIMIZATION_PLAN.md`.

### Remaining Bài 9-min slices (roadmap — NOT this slice)

2. Run executor/advisor **both directions** on the 2–3 chosen skills vs the locked baseline; record the comparison.
3. Structure prompts for a cacheable stable prefix; enable provider prompt caching; measure hit rate.
4. Add `costPerAttempt` + `escalationReason` metadata to the audit log.
   → Final deliverable: `docs/PROVIDER_ROUTING_COST_REPORT.md` with real numbers.

To resume, read `docs/SESSION_HANDOFF.md` + `docs/curriculum/CURRICULUM_STATUS.md` first.
