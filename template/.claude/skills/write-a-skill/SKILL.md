---
name: write-a-skill
description: Authoring guidance for creating or refactoring Claude skills with precise trigger descriptions, thin main files, progressive disclosure, and maintainable frontmatter. Use when adding a new skill, rewriting an existing skill, tightening skill metadata, or splitting a large skill into references and scripts.
license: MIT
metadata:
  author: local
  version: "1.2.0"
  domain: backend
  triggers:
    - create skill
    - write skill
    - build skill
    - new skill
    - SKILL.md
    - skill metadata
    - skill triggers
    - split skill
  role: guide
  scope: process
  output-format: documentation
  related-skills: clean-code, java-code-review
---

# Writing Skills

Decision guide for authoring repo-native Claude skills that trigger reliably, stay thin, and stay synchronized across mirrored trees.

## When to Use
- The user wants to create a new skill or rewrite an existing skill
- A skill description is too vague to trigger reliably
- A skill has grown into a monolith and should be split into `references/` or `scripts/`
- The repo needs tighter frontmatter, trigger wording, or mirror discipline

## When Not to Use
- The task is to edit normal project docs rather than a reusable skill
- The task is implementation work rather than authoring AI instructions

## Core Lessons
- The `description` field is trigger logic, not marketing copy.
- A skill is a folder, not just `SKILL.md`.
- Keep the main file high-signal and move depth into `references/`.
- Capture repeated model failure modes in `Gotchas`.
- Verify root/template mirrors every time.

## Reference Guide

| Topic | Reference | Load When |
|------|-----------|-----------|
| Frontmatter schema, trigger wording, description rules | `references/frontmatter-and-triggers.md` | Defining metadata, tightening trigger quality, or fixing weak descriptions |
| Folder shape, splitting strategy, progressive disclosure | `references/structure-and-splitting.md` | Deciding what stays in `SKILL.md` versus `references/` or `scripts/` |
| Review checklist, mirror discipline, shipping checks | `references/review-and-verification.md` | Finalizing a skill before committing the change |

## Skill Authoring Ladder

1. **Define the job clearly** — what single kind of work should this skill own?
2. **Write the trigger surface** — description first, then YAML-list triggers.
3. **Keep the main file thin** — decision rules and only the highest-signal examples.
4. **Move depth outward** — use `references/` for long examples and advanced notes.
5. **Verify the mirrors** — root and template must stay synchronized.

## Quick Mapping

| Situation | Default Move | Avoid |
|-----------|--------------|-------|
| Description is vague | Rewrite it as capability sentence + explicit `Use when ...` | Keyword soup or generic summaries |
| Main file keeps growing | Split advanced material into `references/` | Letting `SKILL.md` become a handbook |
| Repeated deterministic step | Add `scripts/` support | Regenerating the same helper logic in prose |
| Unsure what should trigger | Add concrete user intents, symptoms, and context cues | Single broad nouns like `documents` or `backend` |

## Constraints

### MUST DO

| Rule | Preferred Move |
|------|----------------|
| Make the description specific enough to trigger the skill reliably | Capability sentence, then `Use when ...` |
| Keep `metadata.triggers` as a YAML list | Use concrete phrases and context cues |
| Keep the main file focused on decisions and defaults | Move deep examples to references |
| Keep mirrors synchronized | Edit both trees and run `npm run verify:skills` |

### MUST NOT DO
- Do not let `SKILL.md` become a full handbook if references would serve better
- Do not use vague descriptions that fail to distinguish the skill from neighbors
- Do not reference non-existent sibling skills in `related-skills`
- Do not change only one mirror tree and leave the template drifting

## Gotchas
- A well-written skill can still fail if the description does not make it triggerable.
- Overlong main files hide the defaults that Claude needs first.
- A great folder structure still fails if `related-skills` points to things that do not exist.
- Mirror drift is easy to miss unless you verify it every time.

## Minimal Workflow
1. Define the skill’s job and boundaries.
2. Write the frontmatter and trigger-oriented description.
3. Draft a thin `SKILL.md` with decision rules and one or two examples.
4. Move advanced material to `references/` or `scripts/`.
5. Verify mirrors and run `npm run verify:skills`.

## What to Verify
- The description clearly says what the skill does and when to use it
- `metadata.triggers` is a YAML list with concrete cues
- The main file stays thin and routes depth to references
- Gotchas cover repeated failure modes
- Root/template mirrors remain in sync

## See References
- `references/frontmatter-and-triggers.md` for metadata schema and trigger-writing rules
- `references/structure-and-splitting.md` for folder shape and split heuristics
- `references/review-and-verification.md` for final review and mirror-discipline checks
