# Claude Code entrypoint for koten

@AGENTS.md

The imported AGENTS.md is the concise public-safe working contract for this multi-app repository, shared by Claude Code and Codex. The notes below add Claude Code specifics.

1. Before changing files, identify one area (`hyakunin`, `conj`, `vintage-kana`, `checkpoint`, or `shared`) and check current branch, HEAD, open PRs and overlapping file ownership. Older HANDOFF text may be obsolete.
2. Respect `CONSTITUTION.md`, the publish allowlist and app-specific rules. `checkpoint` has `checkpoint-main` integration procedures; do not push its changes straight to production main.
3. Each substantive chat response ends with a compact status line showing area, recorded stage, source-verified JST timestamp or `未取得`, evidence and one next action. Never fabricate ChatGPT/Claude session start/end or context percentages.
4. Full internal work registers, task claims, conversation IDs and private records must not be committed to this public repository. Preserve one active writer per `work_id`. If ownership cannot be confirmed, work read-only until reviewed.
5. The milestone-count reminder in AGENTS.md item 8 is for ChatGPT, which cannot measure its context. In Claude Code, time CHECKPOINT and HANDOFF from the measured context monitoring, and keep item 8's evidence-linked format and its resume checks.
