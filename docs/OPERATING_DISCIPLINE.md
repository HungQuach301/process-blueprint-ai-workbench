# Operating Discipline — work-session checklist

The dev-agent layer only works if the loop is followed consistently. This document is the
**advisory tier** (a checklist to self-audit each session). Anything that must be true 100%
of the time belongs in a **hook**; recurring procedures belong in a **command** (`/slice`,
`/retro`). See the enforcement map at the bottom.

> Bài 0E rule: if a rule here keeps getting broken, promote it from this doc to a hook or a
> command. A doc is a reminder, not a guarantee.

## 0. GitHub is the hub (cross-device: laptop + mobile)

The repo lives in WSL; Cowork/Dispatch (Windows/cloud) can only reach **GitHub**. So GitHub is the
single source of truth (see `docs/decisions/ADR-github-hub-workflow.md`). Rules:

- [ ] **One surface per task, no straddling.** Mobile code → Cloud Claude Code (→PR); mobile plan
      → Dispatch; laptop deep-work → local Claude Code + Cowork.
- [ ] **No content copy-paste across devices — only a fixed pointer.** Cowork writes the brief into
      `docs/NEXT_BRIEF.md`; one `git push` publishes it; mobile reads it via the pointer.
- [ ] **Pull-before-local, push-after.** Open local work with `/start` or `/slice` (they auto
      `git pull --ff-only origin master`); `/close` pushes. Cloud → PR → merge → next `/start` pulls.
- [ ] **Bank-data boundary:** Cloud only for non-sensitive tasks (eval/docs/calibration); sensitive
      product code stays local (Remote Control / laptop).

**Fixed pointers** — save once in phone Notes, never type task content again:
- Cloud Claude Code: `Read docs/NEXT_BRIEF.md and do it. Commit and open a PR.`
- Dispatch (plan): `Read docs/SESSION_HANDOFF.md + docs/curriculum/CURRICULUM_STATUS.md from GitHub, then <ask>.`

## 1. Start of a task

- [ ] **Right repo.** Canonical working copy is **WSL `~/projects/process-blueprint-ai-workbench`**,
      NOT the Windows copy `/mnt/d/...`. Confirm the prompt shows `~/projects/...`.
- [ ] VS Code shows **`WSL: Ubuntu-24.04`** (bottom-left), not Windows mode.
- [ ] `git status --short` + `git branch --show-current` — know what is dirty and which branch.
- [ ] State the **goal** in one line before touching anything.

## 2. During work

- [ ] **Smallest scoped change.** Smallest = smallest *blast radius*, not fewest lines
      (see ADR-scope-shared-code-by-consumer).
- [ ] **AI output never auto-applies** — the human approves every diff.
- [ ] **Verify after EVERY edit**, including cleanups (typecheck + lint + the relevant test).
      A small change still needs verification.
- [ ] **Cheap before expensive.** Run deterministic checks (typecheck, unit tests) before
      expensive, non-deterministic ones (eval / real-AI API runs).

## 3. Reviewing a diff (before approving)

- [ ] Scope: only the files that should change (`git status`); no stray `src/`, no unrelated files.
- [ ] Diff size is proportional — a small change with a huge diff signals a line-ending/tooling
      problem; stop and fix the cause.
- [ ] It does what the brief asked (read the core lines).
- [ ] Evidence is green: typecheck / lint / relevant test/eval.
- [ ] Reviewer flags triaged — *you* decide what is truly blocking.
- [ ] No secrets/keys; new files are staged.

## 4. Closing a slice (the step where discipline slipped before)

- [ ] **`git add -A`**, then review `git status` + `git diff --cached` — this is how you never
      miss a **new (untracked) file** (the trap that lost `baseline.ts`, `test-normalizer.ts`).
- [ ] Commit with a clear message.
- [ ] **Merge to `master`** — no dangling slice branch left unmerged (the trap that left
      `slice/normalizer-tests` stranded).
- [ ] `git push`.
- [ ] Verify post-merge: `npm run test:normalizer` + `npm run typecheck` green.

## 5. Judgment work (labeling / calibration / review)

- [ ] Apply the **same rigor to every item** — no reflex defaults.
- [ ] **Always record the reason.** A blank "partial" is a blind spot (artifact-review labels
      had no notes → 0% judge–human agreement, un-actionable).

## Enforcement map (tier per item)

| Discipline | Tier | Mechanism |
|---|---|---|
| Verify after every edit | hook | `.githooks/pre-push`: typecheck + lint (+ `test:normalizer`, planned) |
| Start ritual (branch/plan/list files) | command | `/slice` opens with this |
| Close-out (add-all → commit → merge → verify) | command | `/slice` close step or a `/close` command (planned) |
| No untracked-file miss | hook (planned) | pre-push warn if `??` files under `src/` or `evals/` |
| Cheap-before-expensive, right repo, rigor | advisory | this document |
