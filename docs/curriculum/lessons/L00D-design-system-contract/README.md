# Bài 0D — Design System as Contract & AI UI Generation (workspace)

Authoritative spec: CURRICULUM_V7_3.md §Bài 0D. Workspace only.

## Spine scope
- [ ] Define design tokens as code (src/design/tokens): colors, typography, spacing,
      radii, elevation, state colors.
- [ ] Component registry: canonical components + UI state catalog
      (loading/empty/error/degraded → plugs into Bài 21 AI-native states).
- [ ] AGENTS.md design rules: agents use tokens + registry only; new component
      needs human approval.
- [ ] UI generation prompt pack: feature spec → component spec → implementation.
- [ ] Claude Design (design-time only): sketch screens + state catalog; output feeds
      the contract, never a runtime UI engine.
- [ ] Deliverable: DESIGN_SYSTEM_CONTRACT.md (skeleton provided).

## Metrics
designComplianceRate, reworkRate, time-from-spec-to-UI.
