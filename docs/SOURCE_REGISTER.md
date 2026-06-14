# SOURCE REGISTER — knowledge source catalog (fill at Bài 3B / E1)

Classify every source BEFORE ingesting. Decide: canonical | corpus | reference-only.
Keep personal and bank sources clearly separated.

| source | type (process/doc/code/template/note) | owner (you/bank) | format | sensitivity (public/internal/PII) | residency | volume | change freq | value (how often needed) | decision (canonical/corpus/reference-only) | status |
|---|---|---|---|---|---|---|---|---|---|---|
| (example) Credit SOP §4 | process | bank | pdf | internal | VN on-prem | 1 doc | quarterly | high | reference-only (provenance) | planned |
| (example) BRD template | template | you | docx | internal | — | 1 | rare | high | canonical | planned |
|  |  |  |  |  |  |  |  |  |  |  |

Notes:
- "reference-only" = bind via SourceRef (Bài 19), do not copy into the product.
- Bank PII sources: mask before any cloud call (Bài 17).
