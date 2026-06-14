# Gate 0 — Architecture Cleanliness Checklist

(Mirror of CURRICULUM_V7_3.md Gate 0 evidence — tick as you go.)

```text
[ ] P1.1 Unify skill IDs — no legacy aliases remain (grep proof in PR)
[ ] skill-registry-v2 is the only skill source of truth
[ ] P1.3 Retire skill-engine
[ ] P1.4 Pin dependencies — no `latest`, lockfile committed
[ ] P1.5 SDK vs raw fetch — decision recorded as ADR (use ADR-0000-template)
[ ] Lint — configure or intentionally defer, recorded as ADR
[ ] Typecheck/build green (CI or local log)
[ ] Bài 0E starter hooks active (secrets block, typecheck-on-edit, no-force-push)
    so they guard the cleanup commits themselves
```

ADR stubs to fill: docs/decisions/ADR-sdk-vs-raw-fetch.md, ADR-lint-decision.md
(copy from ADR-0000-template.md).
