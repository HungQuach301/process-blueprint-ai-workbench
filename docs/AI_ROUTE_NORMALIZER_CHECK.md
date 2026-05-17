# AI Route Normalizer Integration Check

## Scope

Task: `INT-03-ai-route-normalizer-integration-check`

Goal: verify provider-backed AI route parsing, repair, normalization, schema validation, and safe metadata behavior without changing application behavior.

## Environment

- Date: 2026-05-17
- Branch: `feature/quality-gate-overhaul`
- Verification mode: source inspection, mock/local route smoke test, TypeScript check, production build

## Source Inspection Findings

- Mock/local behavior remains before the provider-backed path. The route computes `mustUseMock` from real AI flags, selected `mock` provider, local-only data mode, or missing provider env, then returns `createMockResponse(...)` before any provider call or normalizer call.
- Provider-backed ordering is correct:
  1. `runConfiguredProviderWithTimeout(...)`
  2. `parseProviderJsonWithOptionalRepair(...)`
  3. `normalizeProviderOutput(...)`
  4. `validateAISkillOutput(...)`
  5. quality gates and route-specific normalized result shaping
- Unsafe normalization is blocked before schema validation. If `outputNormalization.errors.length > 0`, the route returns `422` with `provider_output_normalization_failed`.
- Schema validation still blocks invalid output after normalization. The route calls `validateAISkillOutput(routeSkillId, outputNormalization.normalizedOutput, validationContext)` and returns `422` with `schema_validation_failed` when validation fails.
- Provider response metadata includes safe normalizer metadata only: warning/error counts, changed paths, and issue summaries. It does not include full prompt text, full provider raw text, or full normalized provider output.
- Malformed JSON repair remains scoped. If parsing fails after repair, the route returns `422` without exposing raw provider output.

## Mock/Local Smoke Test

Ran a temporary dev server on port `3100` and posted to `/api/ai/run-skill` with:

- `skillId`: `ai-process-qa`
- `providerId`: `mock`
- minimal generic `processTasks` payload

Result:

- `ok`: `true`
- `mode`: `mock`
- `meta.externalApiCalled`: `false`
- `meta.validationPassed`: `true`
- `meta.outputNormalization`: not present

This confirms the mock/local path did not call or surface provider normalization metadata.

## Provider-Backed Test Note

Provider-backed live execution was not run in this session. No safe real provider configuration was used for this verification task, and the task does not require exposing API keys or forcing external calls.

Provider-backed behavior was verified by source inspection and by prior deterministic normalizer golden fixtures in `src/lib/ai/provider-output-normalizer.test-data.ts`.

## Commands

- `npx.cmd tsc --noEmit`: pass.
- `npm run build`: pass.

## Result

Passed with documentation-only changes.

