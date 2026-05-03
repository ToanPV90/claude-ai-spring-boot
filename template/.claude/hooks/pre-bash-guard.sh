#!/usr/bin/env bash
# .claude/hooks/pre-bash-guard.sh
#
# Fires before every Bash tool call. Blocks destructive and unsafe commands.
# Exit 2 + stderr message = blocked (Claude sees reason and self-corrects).
# Exit 0                   = allow.
#
# Stdin JSON: { "tool_name": "Bash", "tool_input": { "command": "..." } }

set -euo pipefail

INPUT=$(cat)
CMD=$(echo "$INPUT" | jq -r '.tool_input.command // empty' 2>/dev/null || true)

[[ -z "$CMD" ]] && exit 0

# ── Destructive filesystem ops ────────────────────────────────────────────────
if echo "$CMD" | grep -qE '(^|\s)rm\s+(-[a-zA-Z]*r[a-zA-Z]*f|-[a-zA-Z]*f[a-zA-Z]*r)'; then
  echo "BLOCKED: 'rm -rf' is not allowed. Use 'trash' or 'git clean -fd' for tracked files." >&2
  exit 2
fi

# ── Privilege escalation ──────────────────────────────────────────────────────
if echo "$CMD" | grep -qE '(^|\s)(sudo|su)\s+'; then
  echo "BLOCKED: sudo/su not permitted in Claude Code. Run elevated commands manually." >&2
  exit 2
fi

# ── Direct push to mainline ───────────────────────────────────────────────────
if echo "$CMD" | grep -qE 'git\s+push.*(origin\s+(main|master))'; then
  echo "BLOCKED: Direct push to main/master is not allowed. Open a PR instead." >&2
  exit 2
fi

# ── Force push ────────────────────────────────────────────────────────────────
if echo "$CMD" | grep -qE 'git\s+push.*(--force|-f)(\s|$)'; then
  echo "BLOCKED: Force push is not allowed. Discuss with your team before rewriting history." >&2
  exit 2
fi

# ── Git: block hard reset ───────────────────────────────────────────────────
if echo "$CMD" | grep -qE 'git\s+reset\s+--hard'; then
  echo "BLOCKED: 'git reset --hard' is destructive. Use 'git stash' or 'git checkout -- <file>' instead." >&2
  exit 2
fi

# ── Docker: warn on volume deletion ──────────────────────────────────────────
if echo "$CMD" | grep -qE 'docker\s+compose\s+down\s+-v'; then
  echo "WARN: 'docker compose down -v' will delete named volumes and all data. Confirm this is intentional." >&2
fi

# ── Maven: warn deploy without verify ────────────────────────────────────────
if echo "$CMD" | grep -qE 'mvn\s+deploy' && ! echo "$CMD" | grep -qE 'mvn\s+verify|mvn\s+deploy.*-DskipTests'; then
  echo "WARN: Consider running 'mvn verify' before 'mvn deploy' to run tests." >&2
fi

exit 0
