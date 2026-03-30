#!/usr/bin/env bash
# sync-template.sh
# Syncs .claude/skills/ and .claude/agents/ to template/.claude/
# Run before publishing or after adding/modifying skills or agents.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"

SRC_SKILLS="$ROOT_DIR/.claude/skills"
SRC_AGENTS="$ROOT_DIR/.claude/agents"
DEST_SKILLS="$ROOT_DIR/template/.claude/skills"
DEST_AGENTS="$ROOT_DIR/template/.claude/agents"

echo "Syncing skills: $SRC_SKILLS → $DEST_SKILLS"
rsync -a --delete "$SRC_SKILLS/" "$DEST_SKILLS/"

echo "Syncing agents: $SRC_AGENTS → $DEST_AGENTS"
rsync -a --delete "$SRC_AGENTS/" "$DEST_AGENTS/"

echo "Done. template/.claude/ is now in sync with .claude/"
