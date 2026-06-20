---
description: Run one bounded change end-to-end — branch, plan, dev, reviewer, verify — then stop for approval.
argument-hint: <mô tả slice cần làm>
---
You are running ONE small, bounded change (a "slice"). Do NOT commit or push — the human reviews and approves.

Slice request: $ARGUMENTS

Work through these steps in order; stop and report if any step hits a blocker:

1. Branch. Run `git branch --show-current`. If on master/main, create a dedicated branch (`git checkout -b slice/<short-name>`) so the slice is isolated (one slice = one branch). If already on a feature branch, stay.

2. Plan. State the smallest change that satisfies the request and list the exact files you expect to touch. Keep scope minimal — do not invent extra steps (docs/curriculum/NO_EXTRA_INTERMEDIATE_STEPS_RULE.md). If ambiguous or wide-reaching, ask before editing.

3. Implement with the dev subagent. Only the planned change, preserve LF line endings, touch no unrelated files.

4. Review with the reviewer subagent: scope creep, rule/contract compliance, secrets, anything masking a real bug. Summarize blocking vs non-blocking — the human adjudicates what is truly blocking.

5. Verify and SHOW the evidence. Run and display the raw output of `git diff --stat`, `npm run typecheck`, and `npm run lint`. Both checks must be free of errors (lint warnings allowed). Never claim success without showing this output.

6. Stop for approval. Do NOT commit. Wait for the human.
