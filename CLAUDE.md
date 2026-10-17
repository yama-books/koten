# Claude Code entrypoint for koten

1. **Read [AGENTS.md](AGENTS.md) first.** It is the concise public-safe working contract for this multi-app repository.
2. Before changing files, identify one area (`hyakunin`, `conj`, `vintage-kana`, `checkpoint`, or `shared`) and check current branch, HEAD, open PRs and overlapping file ownership. Older HANDOFF text may be obsolete.
3. Respect `CONSTITUTION.md`, the publish allowlist and app-specific rules. `checkpoint` has `checkpoint-main` integration procedures; do not push its changes straight to production main.
4. Each substantive chat response ends with a compact status line showing area, recorded stage, source-verified JST timestamp or `未取得`, evidence and one next action. Never fabricate ChatGPT/Claude session start/end or context percentages.
5. Full internal work registers, task claims, conversation IDs and private records must not be committed to this public repository. Preserve one active writer per `work_id`. If ownership cannot be confirmed, work read-only until reviewed.
