# Draft PTR Gate Integration Check

## Scope

Task: `INT-02-draft-ptr-gate-integration-check`

Goal: verify the Input Brief -> Draft PTR preview -> `GateVerdict` -> Source Coverage advisory path without changing application behavior.

## Environment

- Date: 2026-05-17
- Branch: `feature/quality-gate-overhaul`
- Verification mode: source inspection, deterministic fixture check, TypeScript check, production build

## Integration Findings

- Input Brief Draft PTR preview computes the gate verdict from validated draft metadata with `runDraftPtrGateV1(draftMeta)`.
- The Draft PTR Gate verdict is rendered in the preview as a separate gate status area with status badge, blockers, warnings, and advanced score/dimension details.
- Source Coverage is computed separately with `createSourceCoverageAdvisory(draftMeta)`.
- Source Coverage is rendered as an advisory-only section after the gate verdict, including source mode, coverage percentage, row-level source references, and advisory warnings.
- Source Coverage advisory is not part of the `GateVerdict` score, blockers, or warnings.
- Apply remains explicit through the existing Replace/Append actions. No auto-apply behavior was introduced.

## Golden Fixture Coverage

Reviewed `src/lib/quality-engine/draft-ptr-gate-v1.test-data.ts` and verified required fixture ids through `scripts/test-draft-ptr-gate.ps1`:

- `passing-draft-ptr`: gate passes with no blockers or warnings.
- `blocker-draft-ptr`: gate fails on a schema completeness blocker.
- `gateway-safety`: gate fails on missing gateway yes/no branch coverage.
- `source-coverage-advisory-only`: gate passes while source coverage advisory reports missing source coverage as non-blocking.

## Manual UI Note

No browser automation tool is configured in this session, so the click-through UI check was not executed in a live browser. The integration was verified by reading the connected UI code path, running the deterministic fixture script, and passing TypeScript/build checks.

Suggested live browser smoke steps when a browser is available:

1. Open `http://localhost:3000`.
2. Use Input Brief in mock/local mode to generate Draft PTR.
3. Confirm the Draft PTR Gate status appears in the preview.
4. Confirm blockers/warnings appear for known incomplete draft data.
5. Confirm Source Coverage appears in a separate advisory-only section.
6. Confirm Replace/Append Apply remains explicit and Source Coverage alone does not block Apply.

## Commands

- `powershell -ExecutionPolicy Bypass -File scripts/test-draft-ptr-gate.ps1`: pass.
- `npm run build`: pass.
- `npx.cmd tsc --noEmit`: pass after `npm run build` regenerated `.next/types`.

## Result

Passed with documentation-only changes.

Note: the first standalone `npx.cmd tsc --noEmit` run before build failed because the existing `.next/types/validator.ts` referenced a missing generated `./routes.js`. Running `npm run build` regenerated the Next type artifacts, and the required `npx.cmd tsc --noEmit` command passed afterward.
