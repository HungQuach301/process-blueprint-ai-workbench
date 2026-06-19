# ADR — AI provider calls: raw fetch over vendor SDKs (Gate 0 / P1.5)

**Status:** Accepted
**Date:** 2026-06-14
**Owner:** Hung Quach
**Related:** Gate 0 P1.5, `src/lib/ai/providers/`

## Context

The product calls three AI providers — Anthropic, OpenAI, and a custom `product-ai`
endpoint — through `src/lib/ai/providers/`. We must decide whether to call them via the
official vendor SDKs (`@anthropic-ai/sdk`, `openai`) or via raw `fetch`.

Current reality: all three providers already use raw `fetch` against the REST endpoints
(`/v1/messages`, `/v1/responses`, and the configurable product-ai endpoint). The two
vendor SDKs are listed in `package.json` but are **not imported anywhere in `src`** — they
are dead dependencies.

## Decision

Use **raw `fetch`** as the single, uniform provider transport, and **remove the unused
SDK dependencies** (`@anthropic-ai/sdk`, `openai`).

## Consequences

**Positive:**
- One uniform abstraction across all three providers, including the custom `product-ai`
  endpoint that no vendor SDK would fit.
- No SDK version churn — consistent with P1.4 (pinned dependencies) and reduces the
  dependency surface.
- Full control over request/response shaping, which the existing
  `provider-output-normalizer` + output schemas already handle.

**Negative / risks + mitigations:**
- We hand-maintain request/response shapes and must track provider API changes ourselves.
  Mitigation: output schemas + the normalizer validate responses; changes are localized to
  one small provider file each.
- No built-in retries / streaming / typed errors from an SDK. Mitigation: add narrowly if
  a concrete need appears (see review triggers); not needed for current skills.

## Alternatives considered

1. **Adopt the vendor SDKs** — rejected: adds dependency weight + churn (against P1.4),
   gives a different client per provider (inconsistent), does not fit the custom product-ai
   endpoint, and would require rewriting two working providers for no current benefit.

## Review triggers

- A concrete need for streaming, automatic retries, or rich typed errors.
- A provider deprecating its plain REST endpoint.
- Maintaining raw request/response shapes becoming a recurring burden.
