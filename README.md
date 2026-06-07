# Process Blueprint AI Workbench

AI-assisted workbench for analyzing, standardizing, validating, and generating
enterprise process artifacts. Built for PO/BA/SA at banks. Next.js (App Router) +
TypeScript. Process Task Register is the single source of truth; AI produces drafts,
recommendations, and review findings that require human approval before apply.

## Status

- Tag: `v0.8.0-pre-review` · Target: `v0.8.0-mvp1-ai`
- Module 2 (Process Modeling Core): largely complete
- Module 3 (Product Delivery Core): in progress

## AI

- Real AI via server-side route only (`/api/ai/run-skill`); no API keys in browser.
- Providers: OpenAI + Claude + product-ai + mock (server-side `provider-factory`).
- Structured output via provider json_schema; schema + quality gate before display.
- Token / latency / estimated cost recorded in audit log.
- Eval harness under `evals/`.

## Setup

```bash
npm install
cp .env.example .env.local   # fill provider keys; keep them server-side
npm run dev                  # http://localhost:3000
```

To enable real AI, set in `.env.local`:
- `ENABLE_REAL_AI=true` (and the QA/Template flags as needed)
- `AI_PROVIDER=openai` or `claude`
- `OPENAI_API_KEY` + `OPENAI_MODEL`, and/or `ANTHROPIC_API_KEY` + `CLAUDE_MODEL`

## Scripts

- `npm run dev` · `npm run build` · `npm run start`
- `npm run typecheck` · `npm run lint`
- `npm run test:eval` (and `:process-improvement`, `:artifact-review`)

## Docs

See `docs/` — start with `CURRENT_STATE.md` and `AGENTS.md`.