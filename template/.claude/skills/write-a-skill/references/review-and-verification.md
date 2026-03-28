# Review and Verification

## Mirror Discipline

This repo mirrors skills between `.claude/skills/` and `template/.claude/skills/`.

- Change both trees in the same edit
- Prefer a single source edit followed by mirror sync
- Run `npm run verify:skills` before finishing

## Gotchas

Every non-trivial skill should have a `Gotchas` section in `SKILL.md` or a dedicated `references/gotchas.md` file. Capture repeated failures such as:

- hidden framework constraints
- invalid defaults Claude tends to assume
- dangerous side effects
- anti-patterns that look correct but break in this repo

## Review Checklist

- [ ] Description includes triggers (`Use when...`)
- [ ] Frontmatter matches the repo schema
- [ ] `metadata.triggers` uses a YAML list
- [ ] `SKILL.md` stays thin and points to references when needed
- [ ] No time-sensitive info
- [ ] Consistent terminology
- [ ] Concrete examples included
- [ ] References stay one level deep
- [ ] Gotchas are captured for known failure modes
- [ ] Root/template mirrors stay in sync
