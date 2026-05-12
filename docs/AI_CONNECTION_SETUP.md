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
ENABLE_REAL_AI=false
ENABLE_REAL_AI_QA=false
ENABLE_REAL_AI_TEMPLATE_REVIEW=false

# Supported values: mock, product-ai, openai, claude.
AI_DEFAULT_PROVIDER=mock

# Deployment policy defaults. Keep cloud off until explicitly approved.
AI_ALLOW_CLOUD=false
AI_REQUIRE_APPROVAL=true

# OpenAI, server-side only.
OPENAI_API_KEY=
OPENAI_DEFAULT_MODEL=

# Claude, server-side only.
ANTHROPIC_API_KEY=
CLAUDE_DEFAULT_MODEL=

# Product AI, server-side only.
PRODUCT_AI_BASE_URL=
PRODUCT_AI_API_KEY=
PRODUCT_AI_DEFAULT_MODEL=

# Optional shared fallback / compatibility values.
AI_MODEL=
AI_PROVIDER=mock
OPENAI_MODEL=
CLAUDE_MODEL=
PRODUCT_AI_ENDPOINT=
PRODUCT_AI_MODEL=
MOCK_AI_MODEL=mock-local

# Optional orchestration controls.
AI_DATA_USAGE_MODE=no-training
AI_PROVIDER_TIMEOUT_MS=45000
```

Do not add `NEXT_PUBLIC_OPENAI_API_KEY`, `NEXT_PUBLIC_ANTHROPIC_API_KEY`, or similar browser-exposed secrets.

The RC6 preferred env names are `AI_DEFAULT_PROVIDER`,
`OPENAI_DEFAULT_MODEL`, `CLAUDE_DEFAULT_MODEL`, `PRODUCT_AI_BASE_URL`, and
`PRODUCT_AI_DEFAULT_MODEL`. The server provider factory still supports the
older aliases `AI_PROVIDER`, `OPENAI_MODEL`, `CLAUDE_MODEL`,
`PRODUCT_AI_ENDPOINT`, and `PRODUCT_AI_MODEL` for compatibility.

## Enable OpenAI

Use OpenAI only when cloud processing is approved for the data in the current
workspace:

```env
ENABLE_REAL_AI=true
ENABLE_REAL_AI_QA=true
ENABLE_REAL_AI_TEMPLATE_REVIEW=true

AI_DEFAULT_PROVIDER=openai
AI_ALLOW_CLOUD=true
AI_REQUIRE_APPROVAL=true

OPENAI_API_KEY=<server-side only>
OPENAI_DEFAULT_MODEL=<approved OpenAI model>
AI_DATA_USAGE_MODE=no-training
```

Expected behavior:

- Browser actions call `/api/ai/run-skill`; they do not call OpenAI directly.
- The route uses the server-side OpenAI provider adapter.
- Output is returned only as a draft, recommendation, or review finding.
- Schema validation, quality gates, preview, and user approval still apply
  before any apply/export workflow.

## Enable Claude

Use Claude only when cloud processing is approved for the data in the current
workspace:

```env
ENABLE_REAL_AI=true
ENABLE_REAL_AI_QA=true
ENABLE_REAL_AI_TEMPLATE_REVIEW=true

AI_DEFAULT_PROVIDER=claude
AI_ALLOW_CLOUD=true
AI_REQUIRE_APPROVAL=true

ANTHROPIC_API_KEY=<server-side only>
CLAUDE_DEFAULT_MODEL=<approved Claude model>
AI_DATA_USAGE_MODE=no-training
```

Expected behavior:

- Browser actions call `/api/ai/run-skill`; they do not call Anthropic
  directly.
- The route uses the server-side Claude provider adapter.
- Output is still preview/review only until the user explicitly applies or
  exports it.

## Enable Product AI

Use Product AI when an internal or tenant-controlled provider endpoint is
available:

```env
ENABLE_REAL_AI=true
ENABLE_REAL_AI_QA=true
ENABLE_REAL_AI_TEMPLATE_REVIEW=true

AI_DEFAULT_PROVIDER=product-ai
AI_ALLOW_CLOUD=true
AI_REQUIRE_APPROVAL=true

PRODUCT_AI_BASE_URL=<server-side endpoint>
PRODUCT_AI_API_KEY=<server-side only, if required>
PRODUCT_AI_DEFAULT_MODEL=<approved Product AI model>
AI_DATA_USAGE_MODE=organization-private-learning
```

Product AI must return parseable structured content that can pass the same
skill output schemas used for OpenAI, Claude, and mock/local mode.

## Mock / Local Fallback

For demos with sensitive data, incomplete provider setup, or offline
development, keep mock/local mode:

```env
ENABLE_REAL_AI=false
ENABLE_REAL_AI_QA=false
ENABLE_REAL_AI_TEMPLATE_REVIEW=false

AI_DEFAULT_PROVIDER=mock
AI_ALLOW_CLOUD=false
AI_REQUIRE_APPROVAL=true
MOCK_AI_MODEL=mock-local
AI_DATA_USAGE_MODE=local-only
```

Mock/local fallback:

- does not call external providers;
- still uses the same UI draft/recommendation/review surfaces;
- still requires user approval before apply/export where the workflow supports
  apply/export;
- is also used when real AI is enabled but required provider env is missing.

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
For RC7 it shows three provider mode cards:

- Platform Provided AI
  - AI provided by the platform through server-side configuration.
  - Maps to the server-side Product AI / product gateway mode.
- Your AI
  - Use your own organization or developer AI provider.
  - For MVP, configure OpenAI keys, Anthropic keys, or enterprise endpoints through server environment variables only.
  - Secure BYOK UI is coming soon; the browser UI must not request or store API keys.
- Local
  - Uses mock/local fallback.
  - Makes no external provider call.

Provider mode cards show one of these server-derived statuses:

- `configured`: required server env is present and real AI flags are enabled.
- `missing env`: real AI flags are enabled but the selected provider env is incomplete.
- `disabled`: real AI flags are off.
- `available`: local/mock mode is available without external provider calls.

The Test Connection action calls `/api/ai/run-skill` with a server-side
`test-connection` action. It does not call OpenAI, Claude, Product AI, or any
other provider directly from the browser, and it does not expose API keys.

Advanced Settings can store non-secret local preferences:

- underlying model provider
- model name / model family display name
- capability: fast, standard, or reasoning
- allow cloud AI
- require approval
- data usage mode
- collapsed per-skill provider override for active skill groups

The underlying provider selector may show Product gateway, OpenAI, Claude,
enterprise endpoint, local/mock, and Gemini as disabled / coming soon when no
real Gemini adapter exists.

Per-skill overrides are local preferences only in this slice. Server-side
execution remains governed by env, feature flags, data mode, provider adapter
configuration, and AI Skill Registry validation.

## Provider Options

Current server-side provider adapters:

- `AI_DEFAULT_PROVIDER=mock`
  - Uses local normalized mock provider output.
  - Does not call an external API.

- `AI_DEFAULT_PROVIDER=product-ai`
  - Uses `PRODUCT_AI_BASE_URL`.
  - Optional auth uses `PRODUCT_AI_API_KEY`.
  - Uses `PRODUCT_AI_DEFAULT_MODEL` or falls back to `AI_MODEL`.
  - Product AI is server-side only; do not expose Product AI keys in browser code.

- `AI_DEFAULT_PROVIDER=openai`
  - Uses `OPENAI_API_KEY`.
  - Uses `OPENAI_DEFAULT_MODEL` or falls back to `AI_MODEL`.
  - Calls OpenAI only from `src/app/api/ai/run-skill/route.ts`.

- `AI_DEFAULT_PROVIDER=claude`
  - Uses `ANTHROPIC_API_KEY`.
  - Uses `CLAUDE_DEFAULT_MODEL` or falls back to `AI_MODEL`.
  - Calls Anthropic Claude only from server-side provider code.

Compatibility aliases are still accepted:

- `AI_PROVIDER` for `AI_DEFAULT_PROVIDER`
- `OPENAI_MODEL` for `OPENAI_DEFAULT_MODEL`
- `CLAUDE_MODEL` for `CLAUDE_DEFAULT_MODEL`
- `PRODUCT_AI_ENDPOINT` for `PRODUCT_AI_BASE_URL`
- `PRODUCT_AI_MODEL` for `PRODUCT_AI_DEFAULT_MODEL`

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

`AI_ALLOW_CLOUD=true` should be treated as an operator/deployment approval
signal. It does not make browser code safe to call providers directly; all
provider calls must still go through the server route and provider adapter.

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
- `rg -n "NEXT_PUBLIC_.*(OPENAI|ANTHROPIC|CLAUDE|PRODUCT).*KEY" .env.example docs src`
  should not show public provider secret variables.
- `npx.cmd tsc --noEmit` should pass.
- With all feature flags false, AI workflows should still return mock/local output.
- With a feature flag true but missing the selected provider env, the route should still fall back to mock/local output.
- With a supported provider configured server-side, output must still pass schema validation before it is shown.
