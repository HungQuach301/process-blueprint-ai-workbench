# UX / QA / History / Delivery Hardening Handoff

## Sprint Summary

This sprint hardened the Process Blueprint AI Workbench around reviewability, human approval, and a cleaner main workflow. The work focused on making QA findings actionable, keeping draft/profile context visible, reducing Template Hub noise, enriching AI Run History with safe metadata, and making Product Delivery generation easier to use.

No AI route behavior, output schema contract, D01/D02 generator behavior, Product Delivery generator behavior, or auto-apply/export policy was intentionally changed during the UX hardening tasks.

## Completed Work

### QA Warnings Now Have Recommendations

- Rule QA findings and warnings now receive at least one actionable recommendation.
- Deterministic recommendations were added for missing task name, missing input/output, missing data object/source, missing customer interaction type, end-event final state, and Service Blueprint readiness.
- A safe `MarkReviewStatus` fallback keeps issue codes actionable when no deterministic field-level fix is available.
- Recommendations remain preview/approval driven; nothing is auto-applied.

### Apply All After Review

- QA Panel already supports summary-first review with total findings, total recommendations, safe recommendations, medium/high risk recommendations, and selected count.
- Actions include `Apply All Safe`, `Preview All Recommendations`, and `Apply All After Review`.
- `Apply All After Review` opens a preview flow, groups recommendations by risk, shows affected steps and warnings, and requires explicit confirmation before apply.
- Findings remain read-only review items.

### PTR Journey/Profile Detection

- Draft PTR apply flow now detects a Process Register profile from draft metadata, source summary, process info, and draft task rows.
- Supported detection profiles:
  - SME Loan / Lending
  - Account Opening
  - Payment
  - Servicing
  - Generic fallback
- Applying a draft preserves draft rows and persists `selectedProcessRegisterProfile`.
- Process Task Register shows a detected profile badge with confidence and reason.
- Lending and Account Opening detections align the sample selector to the closest existing sample without replacing applied rows.

### Template Hub Hidden From Main Screen

- Full `TemplateLibraryEditor` no longer appears as a default main workflow section.
- Template Hub is hidden from the sidebar navigation.
- Users can open Template Hub only through explicit `Manage templates` actions.
- The manager opens in an overlay/modal and does not occupy the main workflow by default.
- D01/D02 still show selected template summaries.
- Template QA recommendations remain suggestions only and are not auto-applied.

### AI Run History Enriched

- AI Run History now includes safe operational metadata:
  - skill id
  - provider
  - model
  - runtime options summary
  - input/output/total tokens
  - latency
  - estimated cost placeholder
  - validation status
  - gate status
  - request id
  - external API flag
  - safe context summary
  - output normalization summary
- Context summary is intentionally limited to safe metadata such as payload kind, process task count, selected template id/name, artifact type, prompt pack id, schema id, and payload size.
- Full prompt, full payload, and full output are not stored in local AI Run History.
- Cost displays `-` when pricing or token data is unavailable.

### Product Delivery Cards Redesigned

- Product Delivery Workspace controls were changed from compressed horizontal rows into responsive artifact cards.
- Cards now cover:
  - BRD
  - SRS
  - User Stories
  - Acceptance Criteria
  - Scope Review / MVP Slicing
  - Requirement QA
  - Product Delivery / AI Coding Pack package
- Each card shows title, short description, status badge, source context, summary, primary action, secondary action where applicable, and download control.
- Buttons are no longer squeezed into narrow vertical stacks.
- Optional context remains collapsed.
- Preview-before-export remains intact.
- No auto-export and no auto-apply were introduced.

## Commands Run

The following verification commands were run during this sprint across the implementation slices:

```powershell
npx.cmd tsc --noEmit
npm run build
```

Latest known status:

- `npx.cmd tsc --noEmit`: passed.
- `npm run build`: passed.

Earlier eval note from the broader AI Orchestrator work:

- `npm run test:eval` requires a local dev server at `http://localhost:3000`.
- A previous run could not complete because the dev server was not running in that shell.

## Manual Test Status

Manual browser testing is still pending for the full UX path.

Recommended manual smoke test:

1. Open `http://localhost:3000`.
2. Generate or load a Draft PTR.
3. Apply draft with Replace and Append; confirm rows are preserved and profile badge updates.
4. Open Process Task Register and confirm QA findings have recommendations.
5. Open QA Panel and test `Preview All Recommendations` and `Apply All After Review` confirmation flow.
6. Confirm Template Hub is not visible in the main screen/sidebar by default.
7. Click `Manage templates` from selected template summary, D01, and D02; confirm modal opens and closes.
8. Run one mock/local AI skill and confirm AI Run History shows safe metadata only.
9. Use Product Delivery cards to generate BRD, SRS, User Stories, AC, Scope Review, Requirement QA, and package previews.
10. Confirm download actions require previews and do not auto-export.

## Remaining Risks

- Manual end-to-end browser validation is still needed, especially around modal focus/scroll behavior and responsive layouts.
- AI Run History cost estimation is intentionally incomplete until model pricing metadata is added to the catalog.
- Profile detection is keyword-based and may misclassify ambiguous journeys.
- Payment and Servicing profiles do not yet have dedicated sample datasets, so sample selector alignment is limited to existing Lending and Account Opening samples.
- QA recommendation coverage is broader, but real user data may expose additional issue codes or recommendation conflicts.
- Product Delivery card layout is visually improved, but dense content may still need refinement after real user demo feedback.
- Provider-backed AI smoke tests should still be run with real configured providers.

## Next Lesson

Next recommended lesson:

**Bài 4 Provider Routing & Cost Optimization**

Suggested focus:

- Provider routing policy by skill, data mode, model capability, and cost.
- Skill × provider decision matrix.
- Token and latency baseline per skill.
- Cost estimation from provider model catalog pricing.
- Fallback chain from preferred provider to mock/local.
- Runtime mode defaults for fast, balanced, reasoning, coding, long-context, and structured-output workloads.

