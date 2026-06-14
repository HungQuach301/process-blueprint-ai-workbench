# DESIGN SYSTEM CONTRACT (skeleton — fill in Bài 0D)

## Tokens (source of truth for look)
- Colors: <primary, surface, text, states (success/warn/error/info)>
- Typography: <font, scale, weights>
- Spacing / radii / elevation: <scale>

## Component registry (canonical)
| Component | Variants/props | States covered |
|---|---|---|
| Button | primary/secondary/ghost | default/hover/disabled/loading |
| Card (recommendation) | … | … |
| … | | |

## UI state catalog
loading | empty | error | degraded(fallback) | blocked-by-governance | ready-for-review

## Agent rules (also in AGENTS.md)
- Use tokens + registry components only. No ad-hoc inline styles.
- New component or token change requires human approval.
