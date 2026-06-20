# Design System Contract (Bài 0D)

The contract — not an agent's taste — defines the look. AI-generated UI must comply with
this document plus the visual-regression + a11y gates (Bài 21B). This is a *minimal,
honest snapshot* of the current de-facto design, locked as the starting contract; gaps are
listed under "Open decisions" rather than redesigned now (§3.1).

## Tokens (source of truth for look)

- **Runtime source:** CSS custom properties in `src/app/globals.css` `:root`.
- **Typed mirror:** `src/design/tokens.ts` (`as const`). Keep the two in sync (no automated
  guard yet — see Open decisions).

| Group | Tokens |
|---|---|
| Colors | `primaryBlue` (+strong), `aiPurple` (+strong), `successGreen` (+soft), `warningAmber` (+soft), `dangerRed` (+soft), `neutralSlate` (+soft) |
| Radii | `radiusCard` = 8px |
| Elevation | `shadowCard` |
| Typography | `fontFamily` = Arial/Helvetica/sans-serif; `colorBody` = #172033 |

Agents must reference these tokens (via CSS variables or `tokens.ts`) — never hard-code hex,
radii, or shadows.

## Component registry (canonical)

These are the canonical building blocks. Compose screens from them; do not invent ad-hoc
equivalents.

| Component | Class / file | Variants | States covered |
|---|---|---|---|
| Button | `.btn` | `primary`, `ai`, `secondary`, `success`, `danger` | default, hover, disabled |
| Surface card | `.surface-card` | — | static container (white, bordered, shadow) |
| Soft panel | `.soft-panel` | — | static secondary surface |
| Status badge | `.status-badge` | (neutral), `primary`, `ai`, `success`, `warning` | static (pill) |
| App shell | `src/components/AppShell.tsx` | — | structural |
| Navigation | `src/components/Navigation.tsx` | — | structural |
| Section panel | `src/components/SectionPanel.tsx` | — | structural |
| Session frame | `src/components/layout/SessionFrame.tsx` | — | structural |

**Feature surfaces** (compositions of the above, not new primitives): AIInputBriefPanel,
ProcessTaskRegister, QAPanel, TemplateLibraryEditor, ExportCenter, AIProviderSettingsPanel,
D01BpmnOutput, D02ServiceBlueprintOutput, BpmnPreview, D02ServiceBlueprintPreview.

## UI state catalog

Every data/AI surface should have a defined treatment for each state. (These plug into the
Bài 21 AI-native UX states.)

| State | Meaning | Current treatment |
|---|---|---|
| loading | request in flight | per-feature (ad-hoc) — to standardize |
| empty | no data yet | per-feature |
| error | request/validation failed | `danger` colors + message |
| degraded (fallback) | real AI off → local/mock result | per-feature label (e.g. "Phân tích cục bộ") |
| blocked-by-governance | gate/approval required | partial (governance checks exist) |
| ready-for-review | output awaiting human approval | per-feature |

## Agent rules (mirrored in AGENTS.md — Bài 0D-3)

- Use tokens + registry components only. No ad-hoc inline styles or hard-coded color/radius/shadow values.
- A new component, or a change to a token, requires human approval.
- Generated UI must still pass the design contract + visual-regression + a11y gates (Bài 21B).

## Open decisions (gaps found while locking the contract — decide later, do not auto-fill)

1. **Palette asymmetry:** `primaryBlue`/`aiPurple` have a `strong` but no `soft`; `success`/
   `warning`/`danger`/`neutral` have a `soft` but no `strong`. Complete the palette, or leave as-is?
2. **Variant-set mismatch:** buttons have a `danger` variant but no `warning`; status badges have
   `warning` but no `danger`. Align the two sets?
3. **No formal typography or spacing scale** — sizes/padding are ad-hoc in classes. Formalize a
   scale, or keep de-facto?
4. **No automated drift guard** between `globals.css :root` and `tokens.ts` (manual sync for now).
5. **State catalog is per-feature**, not standardized — candidate for a shared states pattern (Bài 21).

## Done (definition)

An AI agent can implement a new screen that passes design review on the first or second
attempt because this contract decides the look, not the agent.
