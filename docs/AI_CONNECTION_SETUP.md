# AI Connection Setup

## MVP1 Safety Rules

- Keep provider API keys on the server only.
- Do not use `NEXT_PUBLIC_*` variables for AI provider secrets.
- Browser components must call `/api/ai/run-skill`; they must not call provider APIs directly.
- AI output must pass schema validation and quality gates before preview.
- AI output must remain a draft, recommendation, or review finding until the user explicitly applies it.
- Mock/local fallback remains the default and is used when feature flags are off or server provider env is incomplete.

## Server Environment

Copy `.env.example` to `.env.local` for local development and set only server-side values:

```env
AI_PROVIDER=openai
AI_MODEL=

PRODUCT_AI_ENDPOINT=
PRODUCT_AI_API_KEY=
PRODUCT_AI_MODEL=

OPENAI_API_KEY=
OPENAI_MODEL=

ANTHROPIC_API_KEY=
CLAUDE_MODEL=

MOCK_AI_MODEL=mock-local

ENABLE_REAL_AI=false
ENABLE_REAL_AI_QA=false
ENABLE_REAL_AI_TEMPLATE_REVIEW=false

# Optional orchestration controls
AI_DATA_USAGE_MODE=no-training
AI_PROVIDER_TIMEOUT_MS=45000
```

Do not add `NEXT_PUBLIC_OPENAI_API_KEY`, `NEXT_PUBLIC_ANTHROPIC_API_KEY`, or similar browser-exposed secrets.

## Feature Flags

- `ENABLE_REAL_AI`
  Enables the real provider path for `input-brief-to-ptr`.
- `ENABLE_REAL_AI_QA`
  Enables the real provider path for `ai-process-qa`.
- `ENABLE_REAL_AI_TEMPLATE_REVIEW`
  Enables the real provider path for `ai-template-review`.

If a flag is `false`, the route returns mock/local output. If a flag is `true` but the selected provider is missing required server env, MVP1 falls back to mock/local output instead of exposing secrets or failing inside the browser.

`AI_DATA_USAGE_MODE` is optional. Supported values are:

- `local-only`
- `cloud-processing`
- `no-training`
- `organization-private-learning`

If `AI_DATA_USAGE_MODE=local-only`, `/api/ai/run-skill` will not call an external provider and will use mock/local behavior where the skill supports it. If it is omitted and real AI is enabled with a non-mock provider, the route reports `no-training` as the server data mode.

`AI_PROVIDER_TIMEOUT_MS` is optional and defaults to `45000`.

## AI Connection Center

The AI Connection Center is the browser UI for non-secret provider preferences.
It shows four provider cards:

- Product AI
- OpenAI
- Claude
- Local / Mock

Provider cards show one of these server-derived statuses:

- `configured`: required server env is present and real AI flags are enabled.
- `missing env`: real AI flags are enabled but the selected provider env is incomplete.
- `disabled`: real AI flags are off.
- `available`: local/mock mode is available without external provider calls.

The Test Connection action calls `/api/ai/run-skill` with a server-side
`test-connection` action. It does not call OpenAI, Claude, Product AI, or any
other provider directly from the browser, and it does not expose API keys.

Advanced Settings can store non-secret local preferences:

- default provider
- default model/capability
- allow cloud AI
- require approval
- data usage mode
- simple per-skill provider override for active skills

Per-skill overrides are local preferences only in this slice. Server-side
execution remains governed by env, feature flags, data mode, provider adapter
configuration, and AI Skill Registry validation.

## Provider Options

Current server-side provider adapters:

- `AI_PROVIDER=mock`
  - Uses local normalized mock provider output.
  - Does not call an external API.

- `AI_PROVIDER=product-ai`
  - Uses `PRODUCT_AI_ENDPOINT`.
  - Optional auth uses `PRODUCT_AI_API_KEY`.
  - Uses `PRODUCT_AI_MODEL` or falls back to `AI_MODEL`.
  - Product AI is server-side only; do not expose Product AI keys in browser code.

- `AI_PROVIDER=openai`
  - Uses `OPENAI_API_KEY`.
  - Uses `OPENAI_MODEL` or falls back to `AI_MODEL`.
  - Calls OpenAI only from `src/app/api/ai/run-skill/route.ts`.

- `AI_PROVIDER=claude`
  - Uses `ANTHROPIC_API_KEY`.
  - Uses `CLAUDE_MODEL` or falls back to `AI_MODEL`.
  - Calls Anthropic Claude only from server-side provider code.

Azure OpenAI, Local AI, and Enterprise AI remain product modes prepared in the UI, but they are not implemented as V2 provider adapters yet.

## Provider Adapter V2 Response Shape

All V2 adapters normalize provider responses to:

- `rawText` or `rawJson`
- `parsedJson` when JSON parsing succeeds
- `providerId`
- `model`
- `requestId`
- `tokenUsage` when available
- `latencyMs`
- `warnings`
- `externalApiCalled`

Skill routes still run schema validation and quality gates after the provider returns. Provider output is never applied directly.

## AI Orchestration V2

`/api/ai/run-skill` now uses AI Orchestration V2 for route-level control.

The route:

- validates `skillId` against `src/lib/ai/skill-registry-v2.ts`;
- validates the input schema before provider execution;
- enforces provider mode, allowed providers, feature flags, and server data mode;
- selects Mock, Product AI, OpenAI, or Claude through the server-side provider factory;
- applies the prompt pack attached to the registered skill;
- parses structured provider output;
- performs one optional malformed-JSON repair attempt when scoped and possible;
- validates the final output schema before returning success;
- returns normalized metadata including provider, model, request id, prompt pack id, schemas, data mode, latency, warnings, and validation status;
- records safe server audit metadata without logging full sensitive payloads or full model output.

Invalid provider output is blocked with a reviewable validation error. It is not applied, saved, or exported by the route.

## Data Warning

When real AI is enabled and configured, process briefs, Process Task Register data, template metadata, and QA context may be sent to the configured server-side provider for processing.

For banking or enterprise data:

- confirm approval before enabling cloud processing;
- avoid sending PII, customer records, account numbers, or internal policy data unless approved;
- prefer local/mock mode for sensitive demos;
- keep provider no-training/data-retention commitments documented outside the browser UI.

## Current Skill Routes

All real AI calls go through:

```text
src/app/api/ai/run-skill/route.ts
```

Current MVP1 skills:

- `input-brief-to-ptr`
  - validates `StructuredProcessBrief`;
  - runs brief quality gate;
  - validates Draft PTR schema;
  - runs Draft PTR quality gate;
  - returns preview-only draft output.

- `ai-process-qa`
  - validates AI QA recommendations against existing step IDs;
  - returns recommendations requiring confirmation;
  - existing recommendation workflow handles preview/apply.

- `ai-template-review`
  - validates template review recommendations and optional quality score;
  - displays recommendations only;
  - does not auto-apply template changes.

Registered-but-not-wired skills are validated against the registry but may return `501` until their deterministic mock or provider-backed workflow is implemented.

## Browser Boundary

Client components may:

- read public AI mode/status returned by `GET /api/ai/run-skill`;
- submit structured payloads to `POST /api/ai/run-skill`;
- show draft/recommendation/review results;
- require user approval before apply.

Client components must not:

- read `OPENAI_API_KEY` or provider secrets;
- call `https://api.openai.com` or another provider endpoint directly;
- auto-apply provider output.

## Verification Checklist

- `rg -n "OPENAI_API_KEY|ANTHROPIC_API_KEY|PRODUCT_AI_API_KEY|apiKey|Authorization|Bearer|process.env" src/components`
  should not show browser-side provider key usage.
- `npx.cmd tsc --noEmit` should pass.
- With all feature flags false, AI workflows should still return mock/local output.
- With a feature flag true but missing the selected provider env, the route should still fall back to mock/local output.
- With a supported provider configured server-side, output must still pass schema validation before it is shown.
