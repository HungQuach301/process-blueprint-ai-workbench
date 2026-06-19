# ADR — Lint: configure ESLint 9 flat config with a tracked baseline (Gate 0)

**Status:** Accepted
**Date:** 2026-06-14
**Owner:** Hung Quach
**Related:** Gate 0 (lint decision), `eslint.config.mjs`, `package.json`

## Context

`npm run lint` was a placeholder (`echo TODO: configure ESLint 9 flat config`). Gate 0
requires a lint decision: configure or intentionally defer, recorded here. `eslint` and
`eslint-config-next` are already installed.

## Decision

**Configure** ESLint 9 (flat config) now via `eslint.config.mjs` using `eslint-config-next`,
and make `npm run lint` real. Establish a **documented baseline** rather than block on zero
violations.

Baseline after `--fix` (typecheck + build both green):

| Count | Severity | Rule | Note |
|---|---|---|---|
| 18 | warn (downgraded) | `react-hooks/set-state-in-effect` | real fix = lazy initializer; downgraded to keep output readable |
| 5 | **error** | `react-hooks/rules-of-hooks` | **real bugs** — hooks called in callbacks |
| 2 | warn | `react-hooks/exhaustive-deps` | review dep arrays |
| 1 | **error** | `react/no-unescaped-entities` | unescaped `'` in JSX |
| 1 | **error** | `react-hooks/purity` | `Date.now()` during render |
| 1 | warn | `import/no-anonymous-default-export` | in `eslint.config.mjs` itself |

## Consequences

**Positive:** a real linter now runs; it already surfaced 7 genuine issues (5 of them real
hook bugs) that typecheck did not catch; the baseline is explicit and reviewable.

**Negative / risks + mitigations:** `npm run lint` currently exits non-zero (7 errors), so
lint is **not yet a CI gate** — `typecheck` + `build` remain the gate. The 7 errors are
tracked tech debt to fix incrementally, prioritizing the 5 `rules-of-hooks` bugs.
`set-state-in-effect` is temporarily `warn` (not silenced) with a note to migrate to lazy
initializers.

## Alternatives considered

1. **Defer lint entirely** — rejected: we wanted the safety net active now; it immediately
   paid off by finding real bugs.
2. **Fix every violation now** — rejected: a rabbit hole mid-Gate-0; the bugs predate lint
   and are better fixed as bounded follow-up slices.

## Review triggers

- When the 5 `rules-of-hooks` / `purity` bugs are fixed → consider gating lint in CI.
- When `set-state-in-effect` instances are migrated → restore it to `error`.
