# Model tiers for BMAD (executor / advisor split)

The idea from the ClaudeDevs "executor + advisor" pattern: run the cheap model
every turn, escalate to the premium model only at high-leverage decision points.

## How it's wired

- **Session default = Sonnet 5** — set in `.claude/settings.json` (`"model": "sonnet"`).
  Everything unpinned runs on Sonnet: dev-story, story/epic creation, sharding,
  sprint planning/status, doc indexing.
- **Pinned steps** — a `model:` line in each skill's `SKILL.md` frontmatter
  overrides the session model for that skill only, then reverts.

| Skill (`.claude/skills/<name>/SKILL.md`) | `model:` |
|---|---|
| `bmad-code-review`        | `fable` |
| `bmad-create-architecture`| `fable` |
| `bmad-prd`                | `opus`  |
| `bmad-investigate`        | `opus`  |
| `bmad-correct-course`     | `opus`  |

## Manual override

`dev-story` is deliberately **not** pinned. Before a genuinely hard story, type
`/model opus` (or `/model fable`) — because dev-story inherits the session model,
the bump takes effect. Drop back with `/model sonnet` afterward. A pinned skill
ignores `/model`, which is why the always-premium steps are pinned and dev-story
is not.

## ⚠️ Re-apply after a BMAD update

BMAD overwrites files under `.claude/skills/` on every update (the `customize.toml`
headers say so). The `model:` frontmatter lines will be wiped. `.claude/settings.json`
is safe (Claude Code owns it). After a BMAD update, re-add the `model:` line to each
skill in the table above — or ask Claude to "re-apply the model tiers from
.claude/model-tiers.md".
