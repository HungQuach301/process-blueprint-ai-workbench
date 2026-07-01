# NEXT BRIEF — the current task handed to any session (Cowork / Dispatch / Claude Code)

> Rolling, single-purpose file — **overwritten each time**, not a changelog. Cowork writes the next
> task here; from any device you send the one fixed pointer:
> "Read docs/NEXT_BRIEF.md and run it in Claude Code (close with /close)" — no copy-paste of the brief.

## Task (2026-06-30) — dogfood: rejudge reads rubric-version from rubric.md

Run as a Claude Code `/slice`, close with `/close`.

Sửa `evals/calibration/rejudge.ts`: đọc rubric-version từ front-matter của mỗi `rubric.md`
(dòng `[//]: # (rubric-version: vX)` ở đầu file `evals/datasets/<skill>/v1/rubric.md`) và stamp vào
`baseline.json` ở field mới `rubricVersion` = `vX`, thay cho hằng `JUDGE_VERSION_V2` cứng. Giữ
`judgeVersion` = `JUDGE_VERSION` từ `judge.ts` (phiên bản judge). Nếu không đọc được version →
fallback `"unknown"` + cảnh báo, KHÔNG crash.

Ràng buộc: chỉ sửa `evals/calibration/rejudge.ts` (bỏ hằng ở `judge.ts` nếu cần). typecheck + lint xanh.
