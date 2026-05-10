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
OPENAI_API_KEY=
AI_MODEL=

ENABLE_REAL_AI=false
ENABLE_REAL_AI_QA=false
ENABLE_REAL_AI_TEMPLATE_REVIEW=false
```

Do not add `NEXT_PUBLIC_OPENAI_API_KEY`, `NEXT_PUBLIC_ANTHROPIC_API_KEY`, or similar browser-exposed secrets.

## Feature Flags

- `ENABLE_REAL_AI`
  Enables the real provider path for `input-brief-to-ptr`.
- `ENABLE_REAL_AI_QA`
  Enables the real provider path for `ai-process-qa`.
- `ENABLE_REAL_AI_TEMPLATE_REVIEW`
  Enables the real provider path for `ai-template-review`.

If a flag is `false`, the route returns mock/local output. If a flag is `true` but `OPENAI_API_KEY` or `AI_MODEL` is missing, MVP1 falls back to mock/local output instead of exposing secrets or failing inside the browser.

## Provider Options

Current scaffolded provider:

- `AI_PROVIDER=openai`

Other providers such as Claude, Azure OpenAI, Local AI, and Enterprise AI are product modes prepared in the UI, but they are not implemented as provider adapters in MVP1. Do not enable unsupported providers until a server-side adapter and validation path exist.

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

- `rg -n "OPENAI_API_KEY|apiKey|Authorization|Bearer|process.env" src/components`
  should not show browser-side provider key usage.
- `npx.cmd tsc --noEmit` should pass.
- With all feature flags false, AI workflows should still return mock/local output.
- With a feature flag true but missing `OPENAI_API_KEY` or `AI_MODEL`, the route should still fall back to mock/local output.
- With a supported provider configured server-side, output must still pass schema validation before it is shown.
