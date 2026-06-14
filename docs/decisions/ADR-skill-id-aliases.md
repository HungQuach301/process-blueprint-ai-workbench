# ADR — Skill ID unification and legacy alias scope (Gate 0 / P1.1)

**Status:** Accepted
**Date:** 2026-06-14
**Owner:** Hung Quach
**Related:** Bài 0E, Gate 0 P1.1 (unify skill IDs), `src/lib/ai/skill-registry-v2.ts`

## Context

Gate 0 / P1.1 asks to "unify skill IDs — no legacy aliases remain", with
`skill-registry-v2` as the single source of truth. Slices 1a–1c established
`AI_SKILL_IDS` as that source and migrated the consumers (components + the
`run-skill` route) to import it, and unified the template-review skill to the
canonical id `template-review`.

A follow-up investigation (1c-bis) showed that "remove all legacy aliases" is not
a purely mechanical deletion. The remaining aliases fall into three groups with
different risk and ownership:

- **Group A — `file-to-draft-ptr`, `chat-to-draft-ptr`.** Old skill ids accepted
  as backward-compat in three places: `run-skill/route.ts` (`getRegistrySkillId`
  + helper predicates), `provider-output-normalizer.ts`, and `skill-schemas.ts`
  validators. The UI now sends the new ids (`file-to-ptr-draft`, `chat-to-ptr-draft`).
- **Group B — `ptr-to-brd-outline`.** Inconsistent: it is BOTH a real registry
  entry (in `aiSkillRegistryV2` + `AI_SKILL_IDS`) AND treated by the route as a
  legacy alias that redirects to `ptr-to-brd`. It has no v1 implementation, so the
  alias is what makes it resolve to a working skill.
- **Group C — `ai-template-review`.** After 1c it only remains in the
  provider/settings namespace (`AIProviderSettingsPanel`, `model-provider-types`,
  `provider-output-normalizer`) as a capability/feature-flag key — a different
  namespace from skill ids.

## Decision

1. **Single source of truth achieved.** `AI_SKILL_IDS` in `skill-registry-v2.ts`
   is the canonical id list; consumers import it. This part of P1.1 is done.
2. **Group A — remove the backward-compat acceptance** of `file-to-draft-ptr` and
   `chat-to-draft-ptr` across the three files, since the UI already emits the new
   ids. (Slice 1c-bis.)
3. **Group B — keep `ptr-to-brd-outline` as-is and do not remove it now.** The
   registry-entry-vs-alias contradiction is resolved together with **P1.3 (retire
   skill-engine)** / when the skill is actually implemented or dropped. Documented
   as a known inconsistency.
4. **Group C — out of P1.1 scope.** `ai-template-review` as a provider/settings
   key is a separate namespace; reconciling it belongs to a provider-settings
   cleanup, not skill-id unification. Forcing it to `template-review` risks
   breaking provider configuration.

## Consequences

**Positive:** one source of truth for skill ids; less drift risk (the registry is
typed, so a stray id fails typecheck); scope kept small per
`NO_EXTRA_INTERMEDIATE_STEPS_RULE`.

**Negative / risks + mitigations:** dropping Group A backward-compat means any
*persisted request* still carrying an old id would 400. Risk is low (pre-release;
UI and schemas emit the new ids). Mitigation: change is coordinated across the
three accept-points and verified by typecheck + reviewer; if an old-id failure is
ever reported, re-add a narrow alias.

## Alternatives considered

1. **Aggressively remove A + B + C now** — rejected: Group B needs a real
   implementation decision and Group C touches a different namespace; bundling
   them is scope creep with provider-settings breakage risk.
2. **Defer all alias work** — rejected: Group A is a safe, contained win worth
   capturing now.

## Review triggers

- When implementing or removing the `ptr-to-brd-outline` skill (Group B).
- When reconciling the provider/settings capability namespace (Group C).
- If any client/saved request fails with an old skill id after Group A removal.
