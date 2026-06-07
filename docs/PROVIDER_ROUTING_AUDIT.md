# Provider Routing Audit

Date: 2026-05-24

Scope: Bài 4 - Provider Routing & Cost Optimization entry audit.

Sources reviewed:
- `AGENTS.md`
- `docs/SESSION_HANDOFF.md`
- `docs/AI_ORCHESTRATOR_LESSON_03_HANDOFF.md`
- `docs/AI_IMPLEMENTATION_MATRIX.md`
- `src/app/api/ai/run-skill/route.ts`
- `src/lib/ai/skill-registry-v2.ts`
- `src/lib/ai/providers/provider-factory.ts`
- `src/lib/ai/providers/provider-types.ts`
- `src/lib/ai/providers/openai-provider.ts`
- `src/lib/ai/providers/claude-provider.ts`
- `src/lib/ai/providers/product-ai-provider.ts`
- `src/lib/ai/provider-model-catalog.ts`
- `src/lib/ai/ai-governance.ts`
- `src/components/ai-settings/AIProviderSettingsPanel.tsx`
- `src/lib/audit/audit-log.ts`

---

## 1. Executive Summary

### Current Provider Routing Maturity

The current routing model is **single-provider, env-driven, flat**. One server env var (`AI_PROVIDER`) selects the provider for all skills. Every skill that supports a real provider goes to the same one. There is no skill-level routing, no cost-aware model selection, no tiered fallback chain, and no per-skill provider enforcement beyond a single feature-flag split (`ENABLE_REAL_AI` vs `ENABLE_REAL_AI_QA` vs `ENABLE_REAL_AI_TEMPLATE_REVIEW`).

The mock/local fallback is robust and deterministic. The three real providers (OpenAI, Claude, Product AI) are each implemented as server-side adapters with normalized response shapes. Structured output exists for OpenAI on three skills. Claude and Product AI are prompt-constrained and validator-protected. No cost calculation or provider cost catalog exists.

Routing maturity: **Level 1 (flat env routing)**. Bài 4 target: **Level 3 (skill-aware policy-based routing with cost ceiling and fallback chain)**.

### Main Risks

1. **All skills use the same provider.** A high-cost model chosen for `artifact-review` will also run for `input-brief-to-ptr`, `notes-to-brd`, and every other real-AI skill with no differentiation.
2. **No cost calculation or ceiling.** `estimatedCostUsd` is hardcoded `null` in the route. There is no per-model token rate, no cost per run, and no budget guard.
3. **No tiered fallback.** If the configured provider fails or times out, the route returns an error. There is no secondary provider (e.g., OpenAI → Claude → mock) for resilience.
4. **artifact-review is token-heavy.** Full BPMN/draw.io XML is sent as part of the payload. No context trimming exists. With expensive models this becomes the highest-cost call per session.
5. **Per-skill UI overrides are not wired server-side.** The AI Connection Center lets users pick per-skill providers and models, but `createAISkillRequestBody` reads those preferences from browser localStorage and passes them in the request body. The server currently ignores the per-skill model preference unless explicitly handled; it uses its own env for the actual provider.
6. **No token/cost baseline exists.** There is no eval or monitoring data for input/output token counts per skill, so it is impossible to rank skills by cost risk without running them.

### Next Recommended Changes

1. Create a Provider Routing Policy document as the governed decision layer for skill → provider mapping.
2. Add a Provider Cost Catalog with token-based pricing for each model in the catalog.
3. Wire `estimatedCostUsd` in the route using catalog pricing after each real provider call.
4. Add a skill-level cost tier classification (low/medium/high/very-high) to the skill registry.
5. Define and implement a fallback chain for real provider failures: primary → secondary → mock/local.
6. Optimize `artifact-review` context to send XML summaries rather than full XML by default.
7. Run token/latency baseline evals for the three covered skills before Bài 4 implementation.

---

## 2. Current Provider Modes

### mock / local

- **Provider ID**: `mock`
- **Server env**: Not required. `AI_PROVIDER=mock` or env missing.
- **Activation**: Default when `ENABLE_REAL_AI` is false, `AI_DATA_USAGE_MODE=local-only`, or the configured provider is not set up.
- **Model**: `MOCK_AI_MODEL` env, fallback `"mock-local"`.
- **Behavior**: Deterministic, synchronous, no external HTTP call. Each skill has a dedicated mock handler.
- **Structured output**: Not applicable. Mock handlers return pre-validated JSON.
- **Token usage**: Not reported.
- **Cost**: Zero.
- **Latency**: Negligible (< 5ms typical).

### product-ai

- **Provider ID**: `product-ai`
- **Server env**: `AI_PROVIDER=product-ai`, `PRODUCT_AI_ENDPOINT` (required), `PRODUCT_AI_API_KEY` (optional), `PRODUCT_AI_MODEL` or `AI_MODEL`.
- **Activation**: When `ENABLE_REAL_AI=true` and product-ai env is configured.
- **Behavior**: POSTs to a generic endpoint with `requestId`, `skillId`, `model`, `messages`, `payload`, `runtimeOptions`. Expects a normalized JSON response.
- **Structured output**: Not wired. Schema selection in the route currently only applies to `providerId === "openai"`.
- **Token usage**: Parsed from `adapted.inputTokens`, `adapted.outputTokens`, `adapted.totalTokens` in the response adapter.
- **Response format**: Accepts `rawText`, `rawJson`, `parsedJson`, `content`, `text`, `outputText`, or `output_text` via the generic response adapter.
- **Contract risk**: HIGH. The endpoint contract is generic and not contract-tested. Provider output must pass the same normalizer + validator path as any provider.

### openai

- **Provider ID**: `openai`
- **Server env**: `AI_PROVIDER=openai`, `OPENAI_API_KEY` (required), `OPENAI_MODEL` or `AI_MODEL`.
- **Activation**: When `ENABLE_REAL_AI=true` and OpenAI env is configured.
- **API**: OpenAI Responses API (`https://api.openai.com/v1/responses`).
- **Structured output**: Wired for three skills via native `json_schema` format (`draft_process_task_register`, `qa_recommendation_response`, `artifact_review_response`).
- **Runtime options**: `reasoning.effort` (for reasoning-capable models), `text.verbosity`, `max_output_tokens`, `temperature`.
- **Token usage**: Reported via `adapted.inputTokens`, `adapted.outputTokens`, `adapted.totalTokens`.
- **Default model from catalog**: `gpt-5.4-mini` (fast, structured-output capable, reasoning-capable).

### claude

- **Provider ID**: `claude`
- **Server env**: `AI_PROVIDER=claude`, `ANTHROPIC_API_KEY` (required), `CLAUDE_MODEL` or `AI_MODEL`.
- **Activation**: When `ENABLE_REAL_AI=true` and Claude env is configured.
- **API**: Anthropic Messages API (`https://api.anthropic.com/v1/messages`).
- **Structured output**: NOT wired. Claude does not use native `json_schema` in this codebase. Claude skills are prompt-constrained only. Schema selection in `getStructuredOutputSchemaForSkill` returns `undefined` when `providerId !== "openai"`.
- **Runtime options**: `thinking` (type and budget_tokens mapped from `claudeThinkingType` + `claudeThinkingBudgetTokens`), `max_tokens` (defaults to 4096), `temperature`.
- **Thinking models**: `claude-opus-4-7` uses always-on extended thinking; `claude-sonnet-4-6` supports budgeted thinking.
- **Token usage**: Reported via the response adapter.
- **Default model from catalog**: `claude-sonnet-4-6`.

### azure / local placeholders

- **azure-openai**: Present in `ModelProvider` type and `aiModelOptionsByProvider` map. Maps to `openai-byok` in `getCatalogProvider`. The server provider factory normalizes `azure-openai` to `openai`. **NOT separately wired as a distinct server provider.** No separate Azure endpoint or deployment env.
- **local-model** / **no-ai**: Present in the model catalog as `local-rules`. Maps to `mock` in `mapModelProviderToServerProvider`. **Not a distinct server provider.**

---

## 3. Current Skill Coverage

All skills in Skill Registry V2. Status column: `real-ai-ready` = available to real providers; `implemented` = deterministic/local only; `planned` = not yet implemented.

### Module 2 — Process Modeling

#### `input-brief-to-ptr`

| Field | Value |
|---|---|
| Skill ID | `input-brief-to-ptr` |
| Module | Module 2 - Process Modeling |
| Allowed providers | mock, product-ai, openai, claude |
| UI surface | AI Input Brief Panel — Manual Input tab Generate button |
| Default provider behavior | Real AI when `ENABLE_REAL_AI=true` + provider configured; otherwise deterministic mock. |
| Structured output | OpenAI `json_schema` wired (`draft_process_task_register`). Claude/Product AI prompt-constrained only. |
| Fallback behavior | Falls back to deterministic `generateDraftProcessTaskRegister` if real AI disabled or provider missing. |
| Token / cost risk | **Medium**. Input: 7-section brief (typically 500–2000 chars). Output: 8–20 ProcessTask rows. Manageable with a fast model. |
| Routing maturity | **Good**. The most mature skill path; structured output, quality gate, eval, and fallback are all in place. |

#### `file-to-ptr-draft`

| Field | Value |
|---|---|
| Skill ID | `file-to-ptr-draft` |
| Module | Module 2 - Process Modeling |
| Allowed providers | mock, product-ai, openai, claude |
| UI surface | AI Input Brief Panel — File Intake tab |
| Default provider behavior | Real AI when `ENABLE_REAL_AI=true`; otherwise builds brief from extracted file text and runs local draft. |
| Structured output | NOT wired. Uses DraftProcessTaskRegister output schema by name but no OpenAI json_schema selected for this skill in the route. |
| Fallback behavior | Falls back to brief-from-file-payload + local draft generator when real AI disabled. |
| Token / cost risk | **Medium-High**. Extracted file text can be large (truncated to 1800 chars in brief construction). Full file text is not sent to provider, but context can still be dense. |
| Routing maturity | **Moderate**. No structured output wired. JSON repair fallback covers output failures. |

#### `chat-to-ptr-draft`

| Field | Value |
|---|---|
| Skill ID | `chat-to-ptr-draft` |
| Module | Module 2 - Process Modeling |
| Allowed providers | mock, product-ai, openai, claude |
| UI surface | AI Input Brief Panel — Chat/Notes tab |
| Default provider behavior | Real AI when `ENABLE_REAL_AI=true`; otherwise builds brief from notes text and runs local draft. |
| Structured output | NOT wired. |
| Fallback behavior | Falls back to brief-from-chat-payload + local draft generator when real AI disabled. |
| Token / cost risk | **Low-Medium**. Notes text is typically shorter than a full file. |
| Routing maturity | **Moderate**. Same pattern as `file-to-ptr-draft` without structured output. |

#### `ai-process-qa`

| Field | Value |
|---|---|
| Skill ID | `ai-process-qa` |
| Module | Module 2 - Process Modeling |
| Allowed providers | mock, product-ai, openai, claude |
| UI surface | QA Panel — Run AI QA & Suggest button |
| Default provider behavior | Real AI when `ENABLE_REAL_AI_QA=true`; otherwise `runMockAIQA` with rule context. Uses **separate feature flag** (`ENABLE_REAL_AI_QA`). |
| Structured output | NOT wired. `getStructuredOutputSchemaForSkill` returns undefined for this skill. |
| Fallback behavior | Mock QA with rule issue context. |
| Token / cost risk | **High**. Input includes full `ProcessTask[]` (can be 20–50 rows) + rule issues + existing recommendations + template metadata. Large context. |
| Routing maturity | **Basic**. No structured output. Graph-changing risk enforcement is server-side. Real-AI flag separate from main `ENABLE_REAL_AI`. |

#### `ai-process-qa-finding`

| Field | Value |
|---|---|
| Skill ID | `ai-process-qa-finding` |
| Module | Module 2 - Process Modeling |
| Allowed providers | mock, product-ai, openai, claude |
| UI surface | QA Panel — Findings section AI action |
| Default provider behavior | Real AI when `ENABLE_REAL_AI_QA=true`; otherwise derives findings from rule QA via `qaIssuesToFindingSet`. |
| Structured output | NOT wired. |
| Fallback behavior | Deterministic finding derivation from rule QA issues. |
| Token / cost risk | **Medium**. Input is PTR + QA issues. Output is read-only findings (no apply operations). Lower risk than qa-recommendation. |
| Routing maturity | **Basic**. Review-only output. No structured output schema. |

#### `process-improvement-recommendation`

| Field | Value |
|---|---|
| Skill ID | `process-improvement-recommendation` |
| Module | Module 2 - Process Modeling |
| Allowed providers | mock, product-ai, openai, claude |
| UI surface | Process Task Register — AI Assistant selected-row actions |
| Default provider behavior | Real AI when `ENABLE_REAL_AI=true`; otherwise deterministic PTR assistant recommendations by action type. |
| Structured output | OpenAI `json_schema` wired (`qa_recommendation_response`). Claude/Product AI prompt-constrained only. |
| Fallback behavior | Deterministic per-action mock recommendations. |
| Token / cost risk | **Medium**. Input includes selected PTR rows, action type, templates. Typically 1–5 selected rows. |
| Routing maturity | **Good**. Structured output added in Bài 3. Eval dataset exists. Needs smoke test with real provider. |

#### `artifact-review`

| Field | Value |
|---|---|
| Skill ID | `artifact-review` |
| Module | Module 2 - Process Modeling |
| Allowed providers | mock, product-ai, openai, claude |
| UI surface | D01 BPMN Output and D02 Service Blueprint Output — Review with AI button |
| Default provider behavior | Real AI when `ENABLE_REAL_AI=true`; otherwise deterministic warnings-only mock response. |
| Structured output | OpenAI `json_schema` wired (`artifact_review_response`). |
| Fallback behavior | Read-only mock warnings: "Mock artifact review checked generated XML." |
| Token / cost risk | **VERY HIGH**. Input includes full generated BPMN or draw.io XML (can be 50k–200k+ chars) + full `ProcessTask[]` + template. This is the highest-cost skill by far. No context trimming exists. |
| Routing maturity | **Moderate**. Structured output wired. But input context size is still uncontrolled. Should be forced to a cost-effective model or limited context before real provider use. |

#### `template-review` / `ai-template-review`

| Field | Value |
|---|---|
| Skill ID | `template-review` (registry), `ai-template-review` (route alias) |
| Module | Module 2 - Process Modeling |
| Allowed providers | mock, product-ai, openai, claude |
| UI surface | Template Library Editor — Run Template QA / AI Template Review |
| Default provider behavior | Real AI when `ENABLE_REAL_AI_TEMPLATE_REVIEW=true`; otherwise `runMockTemplateReview`. Uses **separate feature flag**. |
| Structured output | NOT wired. |
| Fallback behavior | Comprehensive local mock review: BPMN/SB fit, mandatory fields, lane/row rules, connector risks, domain fit. |
| Token / cost risk | **Low-Medium**. Input is a `TemplateProfile` (typically small). No full PTR or XML required. |
| Routing maturity | **Moderate**. Separate feature flag. Local mock is quite capable. |

### Module 3 — Product Delivery

All Module 3 skills (`notes-to-brd`, `ptr-to-brd`, `brd-to-srs`, `notes-to-srs`, `srs-to-user-stories`, `brd-to-user-stories`, `user-stories-to-acceptance-criteria`, `product-scope-review`, `mvp-slicing`, `requirement-quality-check`, `user-stories-to-ai-coding-pack`) share the following pattern:

| Field | Value |
|---|---|
| Allowed providers | mock, product-ai, openai, claude |
| Structured output | NOT wired. No `json_schema` is selected for any Module 3 skill in `getStructuredOutputSchemaForSkill`. |
| Fallback behavior | Deterministic generators for each skill. |
| Token / cost risk | **Medium to High**. BRD/SRS/User Story generation sends notes/brief text. `requirement-quality-check` sends full BRD + SRS + UserStorySet + AC set — potentially the second-highest cost skill after `artifact-review`. `user-stories-to-ai-coding-pack` also aggregates many artifacts. |
| Routing maturity | **Basic**. No structured output schemas. Route determines mock vs real by `ENABLE_REAL_AI`. |

#### Cost risk ranking for Module 3

1. `requirement-quality-check` — sends all Product Delivery artifacts at once. Very high input token count.
2. `user-stories-to-ai-coding-pack` — sends BRD + SRS + user stories + AC + optional PTR.
3. `product-scope-review` / `mvp-slicing` — sends BRD + SRS + user stories.
4. `brd-to-srs`, `notes-to-srs` — medium context.
5. `srs-to-user-stories`, `brd-to-user-stories` — medium context.
6. `notes-to-brd`, `ptr-to-brd` — lowest input context in Module 3.
7. `user-stories-to-acceptance-criteria` — user story set only; bounded.

### Module 5 — AI Coding Pack

`ptr-to-ai-coding-pack`: deterministic only (`implemented`). No real provider path.

`user-stories-to-ai-coding-pack`: `real-ai-ready`. Same pattern as Module 3.

### Planned skills (not yet active)

`user-stories-to-jira-export`, `scope-nonscope-definition`: `planned`. No implementation. Not a Bài 4 concern.

---

## 4. Current Runtime Options

### Model Selection

Server-side model selection flow:

1. Route reads `AI_PROVIDER` env → selects provider via `getConfiguredAIProviderId()`.
2. Route reads model via `getConfiguredAIModel(providerId)`:
   - mock: `MOCK_AI_MODEL` or `"mock-local"`
   - product-ai: `PRODUCT_AI_MODEL` or `AI_MODEL`
   - openai: `OPENAI_MODEL` or `AI_MODEL`
   - claude: `CLAUDE_MODEL` or `AI_MODEL`
3. Request body from UI (`createAISkillRequestBody`) may include a `model` field from browser localStorage settings. The route receives this but the actual provider call uses the env-configured model, not the browser-supplied one, because `createConfiguredAIProvider` reads env at startup and does not accept per-request model overrides from the UI.

**Gap**: UI model preference from `perSkillModelOverrides` is passed in the request body but is not read or applied by the server route. The server always uses env-configured model.

### Reasoning / Thinking Options

**OpenAI** (`openai-provider.ts`):
- `reasoningEffort`: maps to `reasoning.effort` if model supports it (detected via `modelLikelySupportsReasoningEffort`).
- `textVerbosity`: maps to `text.verbosity` if model supports it.
- Models with reasoning effort: `gpt-5.x` prefix, `o` prefix, or catalog metadata `supportsReasoningEffort: true`.

**Claude** (`claude-provider.ts`):
- `claudeThinkingType` + `claudeThinkingBudgetTokens`: maps to `thinking` block.
- `claude-opus-4-7`: always-on thinking (budget tokens ignored).
- `claude-sonnet-4-6`: budgeted thinking with `budget_tokens`.
- Other models: enabled thinking without budget.
- `max_tokens`: defaults to 4096 if `maxOutputTokens` not set. **Potential issue for complex skills.**

**Product AI**:
- `runtimeOptions` object is forwarded as-is in the POST body. Provider handles them according to its own contract.

### Per-Skill Overrides

UI stores `perSkillProviderOverrides` and `perSkillModelOverrides` in browser localStorage.

`createAISkillRequestBody` reads these and includes `providerId` and `model` in the POST body.

**Server-side enforcement**: The route receives `providerId` from the request body but uses it only to enforce allowed providers from the registry. The actual `createConfiguredAIProvider` call uses the env `AI_PROVIDER` — not the UI-provided `providerId`. This means per-skill provider routing from the UI is **not enforced server-side** in the current implementation.

### What Is UI Preference vs Server-Enforced

| Setting | Where stored | Server-enforced? |
|---|---|---|
| Provider selection (default) | `AI_PROVIDER` env | **Yes** |
| Model selection | `OPENAI_MODEL` / `CLAUDE_MODEL` / `AI_MODEL` env | **Yes** |
| Per-skill provider override | Browser localStorage | **No** — UI preference only |
| Per-skill model override | Browser localStorage | **No** — UI preference only |
| Reasoning effort | UI localStorage → request body → `normalizeProviderRuntimeOptions` | **Yes** — applied by provider adapter |
| Claude thinking type / budget | UI localStorage → request body → provider adapter | **Yes** — applied by Claude adapter |
| Data usage mode | `AI_DATA_USAGE_MODE` env + UI preference | **Yes** for server env; UI for display only |
| Allow cloud AI | UI localStorage | **No** — soft confirmation only; server does not block by this flag |
| Timeout | `AI_PROVIDER_TIMEOUT_MS` env | **Yes** |

---

## 5. Current Fallback Behavior

### When Route Uses Mock/Local

The route falls back to mock/local in all of the following conditions:

1. `isRealAIEnabledForSkill()` returns false:
   - `ENABLE_REAL_AI` is not `"true"` (most skills)
   - `ENABLE_REAL_AI_QA` is not `"true"` (for `ai-process-qa`, `ai-process-qa-finding`)
   - `ENABLE_REAL_AI_TEMPLATE_REVIEW` is not `"true"` (for `ai-template-review`)
2. Configured provider is `mock`.
3. `AI_DATA_USAGE_MODE=local-only`.
4. Selected skill is not in `isRouteBackedByDeterministicMock` list (unknown skills return 400).

Each skill has a dedicated mock response function (e.g., `createMockInputBriefResponse`, `createMockAIQAResponse`). These are deterministic and validated before return.

### When Provider Env Missing

If `ENABLE_REAL_AI=true` but `isAIProviderConfigured(providerId)` returns false:

- The route proceeds with `runConfiguredProviderWithTimeout` which calls `createConfiguredAIProvider`.
- `createConfiguredAIProvider` for `openai` or `claude` passes empty string for `apiKey`.
- The provider adapter will throw: `"OPENAI_API_KEY is required when OpenAI is enabled"` or similar.
- The route catches the error and returns a 500 with `error_code: "provider_error"`.

**Gap**: There is no automatic fallback from "provider env missing" to mock/local. The route returns an error. The UI shows a user-friendly message but cannot retry automatically.

### When Data Mode Is local-only

`getServerDataUsageMode` returns `"local-only"` when `AI_DATA_USAGE_MODE=local-only`. The route checks this and uses mock/local for all data processing.

### When Provider Output Is Invalid

1. Provider returns non-OK HTTP status → provider adapter throws → route returns 500.
2. Provider returns OK but malformed JSON → route attempts one JSON repair call via `parseProviderJsonWithOptionalRepair` → if repair fails → route returns 422.
3. Provider returns OK, JSON parses, but normalizer reports unsafe errors → route returns 422.
4. Provider returns OK, JSON parses, normalizer passes, but `validateAISkillOutput` fails → route returns 422.
5. Provider returns OK, JSON passes validation, but quality gate fails (`canPreview=false`) → route returns 422.

All 422 responses include `validationErrors` for reviewable error display.

### Limitations

- **No tiered fallback chain.** If real provider fails or times out, the result is an error response. No automatic retry on secondary provider.
- **No circuit breaker.** Repeated provider failures are not tracked. Each request independently tries and fails.
- **No partial context fallback.** If payload is too large to fit in the provider context window, the call fails. There is no automatic context reduction.
- **Timeout applies to primary call only.** The JSON repair call also uses `runConfiguredProviderWithTimeout` with the same provider. If the provider is down, repair also fails.
- **Mock fallback must be explicitly triggered.** There is no automatic fallback from real provider failure to mock/local within a single request lifecycle.

---

## 6. Cost / Latency Observability

### Current Token Fields

`AITokenUsage` in `provider-types.ts`:
```ts
{
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
}
```

All three real providers (OpenAI, Claude, Product AI) report token usage via the response adapter. The route includes token fields in the response metadata:
```ts
inputTokens: result.tokenUsage?.inputTokens,
outputTokens: result.tokenUsage?.outputTokens,
totalTokens: result.tokenUsage?.totalTokens,
```

### Model Fields

The route response metadata includes:
- `providerId`: the server provider id (e.g., `"openai"`)
- `model`: the model string from the provider response (e.g., `"gpt-5.4-mini"`)

### Cost Fields

`estimatedCostUsd: null` is hardcoded in `createProviderMeta`. **No cost calculation is performed.** There is no token rate catalog, no per-model pricing, and no cost estimate anywhere in the route or audit log.

The `AIRunRecord` type in `audit-log.ts` has `estimatedCostUsd?: number | null`. `metadataCost` can read it if a number is provided. But the source is always `null` from the route.

### AI Run History Limitations

Browser-local `localStorage` only. The audit log stores `ai_call` entries derived from `logAICallAudit` in `ai-governance.ts`. Each record contains:
- `skillId`, `provider`, `model`, `latencyMs`, `validationStatus`, `externalApiCalled`
- `tokenUsage` (input/output/total)
- `estimatedCostUsd: null` (always null)
- `contextSummary`: payload kind, process task count, template id, artifact type, prompt pack id, schema id, payload size

**What is missing for Bài 4:**

| Missing item | Impact |
|---|---|
| Token-per-skill baseline data | Cannot rank skills by cost without running them. |
| Per-model token rate ($/1k tokens) | Cannot calculate `estimatedCostUsd`. |
| Provider latency per skill | Cannot set reasonable per-skill SLAs. |
| Aggregate cost per session | No budget guard or usage report. |
| Server-side durable audit | Browser localStorage is lost on clear/private. No server-side per-tenant cost tracking. |
| Context size tracking per skill | Payload size is recorded but not correlated with token count. |

---

## 7. Risk Assessment

### High-Cost Skills

| Skill | Risk level | Reason |
|---|---|---|
| `artifact-review` | **VERY HIGH** | Full generated BPMN/draw.io XML in payload. XML can be 50k–200k+ chars. No context trimming. |
| `requirement-quality-check` | **HIGH** | Sends all Product Delivery artifacts: BRD + SRS + UserStorySet + AC + optional coding pack files. |
| `user-stories-to-ai-coding-pack` | **HIGH** | Aggregates BRD + SRS + user stories + AC + optional PTR context. |
| `ai-process-qa` | **HIGH** | Sends full PTR (20–50 tasks) + rule issues + recommendations + template metadata. |
| `product-scope-review` / `mvp-slicing` | **Medium-High** | Sends BRD + SRS + user stories + PTR. Bounded by artifact size. |

### High-Latency Skills

Same as high-cost skills. Additionally:
- `artifact-review`: Full XML parse by the provider is slow.
- Reasoning-mode calls (`claude-opus-4-7` with thinking, OpenAI with high `reasoningEffort`): Latency multiplies with thinking budget.

Default timeout: **45 seconds** (`DEFAULT_PROVIDER_TIMEOUT_MS`). For `artifact-review` with a large XML + reasoning model, this may be insufficient.

### Schema-Sensitive Skills

These skills have explicit structured output schemas. Schema validation is the last gate before preview:

| Skill | Schema name | Sensitivity |
|---|---|---|
| `input-brief-to-ptr` | `draft_process_task_register` | High — any schema rejection blocks Draft PTR preview. |
| `process-improvement-recommendation` | `qa_recommendation_response` | High — schema rejection blocks PTR AI Assistant. |
| `artifact-review` | `artifact_review_response` | Medium — review output blocked; user can still regenerate XML. |

Skills **without** json_schema: `ai-process-qa`, `ai-process-qa-finding`, `template-review`, all Module 3 skills. These are prompt-constrained only and are more vulnerable to `schema_validation_failed`.

### Provider-Specific Skills

| Skill | Provider concern |
|---|---|
| `artifact-review` | Full XML context only makes sense with a large-context model. Claude Opus 4.7 (200k context) or OpenAI models with long context. GPT-5.4-mini may truncate large BPMN. |
| `process-improvement-recommendation` | OpenAI json_schema is the safest path. Claude needs prompt discipline. |
| `input-brief-to-ptr` | Both OpenAI (json_schema) and Claude (budgeted thinking) produce good results. |
| `requirement-quality-check` | Heavy artifact context — needs a large-context model. |
| `ai-process-qa` | Graph-changing safety enforcement is route-side, so any provider can be used with validated output. |

### Skills That Should Not Use Expensive Models by Default

| Skill | Recommended model tier | Reason |
|---|---|---|
| `chat-to-ptr-draft` | Fast / cost-effective | Short notes input. Does not need reasoning. |
| `file-to-ptr-draft` | Fast / cost-effective | Extracted text input. No reasoning needed. |
| `template-review` | Fast / cost-effective | Small TemplateProfile input. Local mock already covers most cases. |
| `ai-process-qa-finding` | Fast / cost-effective | Review-only output. No apply operations. |
| `notes-to-brd` | Balanced | Short notes. Quality matters but reasoning is not required. |
| `notes-to-srs` | Balanced | Same as above. |
| `artifact-review` | Large-context required | Must use a model with 100k+ context window for large XML. Should avoid fast/nano models. |
| `requirement-quality-check` | Balanced to reasoning | Depends on artifact volume; should have a context-adaptive routing rule. |

---

## 8. Bài 4 Implementation Backlog

### 8.1 Provider Routing Policy Document

**Goal**: Define the governed decision layer for skill → provider → model mapping.

Contents needed:
- Skill classification by cost tier: `low`, `medium`, `high`, `very-high`.
- Default model per cost tier per provider.
- Which skills require structured output (currently: `input-brief-to-ptr`, `process-improvement-recommendation`, `artifact-review` on OpenAI).
- Which skills are safe for local/mock-only (e.g., `template-review`, `ai-process-qa-finding`).
- Context window requirements per skill (e.g., `artifact-review` needs 100k+).
- Per-skill timeout recommendation.

Suggested file: `docs/PROVIDER_ROUTING_POLICY.md`.

### 8.2 Provider Cost Catalog

**Goal**: Wire `estimatedCostUsd` calculation in the route using real per-model token rates.

Implementation:
- Add `inputCostPer1kTokens` and `outputCostPer1kTokens` fields to `ProviderModelMetadata` in `provider-model-catalog.ts`.
- Add a `calculateEstimatedCost(model, tokenUsage)` pure function.
- Call it in `createProviderMeta` after the provider response is received.
- Surface the result in audit log and AI Run History.
- Add a `costCeilingUsd` per skill tier in the routing policy.

### 8.3 Fallback Chain

**Goal**: Define and implement a tiered fallback when the primary provider fails or times out.

Design:
- Introduce a `fallbackChain: AIProviderId[]` concept in the routing policy.
- Default chain suggestion: `openai → mock` (Claude is not a safe automatic fallback due to no structured output support).
- Implement in the route: if primary provider call throws or returns 5xx, try the next provider in the chain before returning an error.
- Mock/local must always be the final fallback.
- Log each fallback step in the audit metadata.

### 8.4 Context Optimization

**Goal**: Reduce token cost for high-cost skills before real provider use.

Priority skills:
- `artifact-review`: Send XML summary (element counts, first 200 chars) instead of full XML by default. Add an `artifactContext: "summary" | "full"` option.
- `ai-process-qa`: Trim `ProcessTask[]` to relevant fields only (e.g., strip `comment`, `notes`, long `input`/`output` for large PTRs). Cap at N rows for cost control.
- `requirement-quality-check`: Send artifact summaries (requirement counts, story counts) rather than full artifact JSON where possible.

### 8.5 Eval Comparison by Provider

**Goal**: Capture token/latency/quality baseline for each covered skill × provider combination.

Steps:
1. Add token/latency capture to existing eval runners (`evals/input-brief-to-ptr/run-eval.ts`, etc.).
2. Run each eval against both `mock` and `openai` providers with dev server running.
3. Record: input tokens, output tokens, latency ms, schema validation pass rate, quality gate pass rate.
4. Create `docs/PROVIDER_EVAL_BASELINE.md` with results.
5. Use baseline to set per-skill `costCeilingUsd` and `timeoutMs` recommendations.

### 8.6 Server-Side Per-Skill Provider Routing

**Goal**: Enforce per-skill provider selection server-side, not just as a UI preference.

Current gap: UI sends `providerId` and `model` in the request body. The server reads `providerId` for allowed-provider enforcement but still uses `AI_PROVIDER` env for the actual provider factory call.

Design:
- Add a skill-aware routing resolver to the route that can override `getConfiguredAIProviderId()` when the request includes a valid per-skill `providerId` that is in the skill's `allowedProviders` list.
- Add a server-side routing policy config (separate from browser preferences) that maps skill tiers to allowed provider/model combinations.
- Keep env as the global default; allow skill-level overrides from the routing policy config file.

---

## Summary Table

| Area | Current state | Bài 4 target |
|---|---|---|
| Provider routing | Single env provider for all skills | Skill-aware policy with cost tier routing |
| Cost tracking | `estimatedCostUsd: null` hardcoded | Real cost from catalog pricing |
| Fallback chain | Error on provider failure | Defined chain with mock as last resort |
| Token baseline | No data | Eval-measured baseline per skill |
| Structured output coverage | 3 skills (OpenAI only) | Extend to all Module 3 skills on OpenAI |
| Context optimization | Full XML / full artifacts sent | Summarized context for high-cost skills |
| Server-side per-skill routing | Not implemented | Routing policy wired to route |
| Latency / timeout per skill | Global 45s | Per-skill timeout recommendations |
