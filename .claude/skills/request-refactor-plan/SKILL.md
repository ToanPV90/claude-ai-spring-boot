---
name: request-refactor-plan
description: Planning guidance for breaking large or risky refactors into a safe sequence of tiny, reviewable steps with clear scope, testing decisions, and rollout boundaries. Use when the user wants a refactor plan, staged migration, RFC, or incremental rollout strategy before changing code.
license: MIT
metadata:
  author: local
  version: "1.1.0"
  domain: backend
  triggers:
    - refactoring plan
    - refactor RFC
    - incremental refactor
    - break down refactor
    - safe refactor
    - rollout plan
    - staged migration
    - tiny commits
    - refactor issue
  role: workflow
  scope: process
  output-format: documentation + guidance
  related-skills: clean-code, design-patterns, java-architect, java-code-review
---

# Request Refactor Plan Skill

Workflow guide for turning a risky refactor into a scoped, testable, tiny-commit plan before implementation begins.

## When to Use
- The user wants a refactor plan before code changes start
- The work is broad enough that sequence, rollback safety, and scope control matter
- A refactor needs to be broken into tiny commits or tracked as an RFC / rollout plan
- You need to define what will change, what will not change, and how testing protects the migration

## When Not to Use
- The task is already a local readability cleanup or direct refactor in code — use `clean-code`
- The main question is whether a pattern is justified — use `design-patterns`
- The core decision is architecture, service boundaries, or system decomposition — use `java-architect`
- The work is a review of existing implementation quality rather than a forward plan — use `java-code-review`

## Symptom Triage

| Situation | Default Move |
|-----------|--------------|
| Refactor is broad but still within one subsystem | Define scope, guardrails, and a tiny-commit sequence |
| Refactor touches architecture or module boundaries | Include an architecture decision section and route system-shape choices through `java-architect` |
| Refactor risk is mostly behavioral regression | Make testing and rollback boundaries explicit before commit sequencing |
| User only needs a quick local cleanup strategy | Use the fast path and avoid heavyweight RFC / issue ceremony |

## Planning Ladder

1. **State the problem clearly** — what hurts today, from the developer's point of view?
2. **Verify the current state in the repo** — confirm assertions before planning around them.
3. **Define boundaries** — what changes, what stays fixed, what is explicitly out of scope?
4. **Check alternatives** — keep the simplest viable path, not the most ambitious rewrite.
5. **Map test coverage and protection** — what existing tests cover the area and what new coverage is needed?
6. **Sequence tiny commits** — each step should leave the codebase working.
7. **Create a GitHub issue only if tracking is actually needed** — the plan artifact is optional, not automatic.

## Quick Mapping

| Situation | Preferred Output | Avoid |
|-----------|------------------|-------|
| Large risky refactor | Full plan with scope, decisions, tests, out-of-scope, and commit sequence | Jumping straight to implementation |
| Small contained refactor | Fast-path mini plan with scope and tiny commits | Full interview ceremony |
| Team needs async review | RFC or GitHub issue version of the plan | Ephemeral chat-only plan |
| Unclear test safety | Explicit testing decision section | Treating tests as an afterthought |

## Constraints

### MUST DO

| Rule | Preferred Move |
|------|----------------|
| Verify repo reality before finalizing the plan | Read the code and check current tests first |
| Keep scope explicit | Name what is changing and what is not |
| Break the work into tiny working steps | Favor commits that preserve a working state |
| Capture testing strategy as part of the plan | Note current coverage, gaps, and confidence signals |
| Keep GitHub issue creation optional | Use it only when the workflow needs a durable artifact |

### MUST NOT DO
- Do not assume the user's first proposed solution is the only viable one
- Do not write a plan so vague that the next implementer must rediscover every decision
- Do not include brittle file-by-file code snippets in the long-term plan artifact
- Do not let a refactor plan quietly expand into architecture redesign unless that scope is explicit
- Do not force a heavyweight interview for a small, local refactor

## Gotchas

- Refactor plans often fail because they describe the target state but not the safe path to get there.
- Tiny commits are about preserving a working system, not arbitrarily slicing one conceptual change into noise.
- A plan without explicit out-of-scope boundaries invites silent scope creep.
- Testing decisions must be concrete enough to reduce risk, but they should still focus on external behavior.
- GitHub issue creation is a delivery format, not the core purpose of the skill.

## Minimal Workflow

### Fast path for a contained refactor
1. Inspect the relevant code and current tests.
2. Write the problem statement and scope boundaries.
3. List 3-7 tiny commits that preserve a working state.
4. Add testing notes and stop unless durable tracking is required.

### Full plan for a risky refactor
1. Problem statement
2. Solution direction
3. Tiny-commit sequence
4. Decision document
5. Testing decisions
6. Out of scope
7. Optional GitHub issue / RFC artifact

## GitHub Issue Template

Use this only when the plan needs to be tracked in GitHub.

```md
## Problem Statement

The problem that the developer is facing, from the developer's perspective.

## Solution

The solution direction, from the developer's perspective.

## Commits

A long, detailed implementation plan in tiny commits. Each commit should leave the codebase in a working state.

## Decision Document

- Modules to build or modify
- Interfaces that will change
- Technical clarifications
- Architectural decisions
- Schema changes
- API contracts
- Specific interactions

Do NOT include brittle file paths or code snippets that will age quickly.

## Testing Decisions

- What makes a good test for this refactor
- Which modules will be tested
- Prior art for similar tests in the codebase

## Out of Scope

What this refactor explicitly will not change.

## Further Notes (optional)

Additional context if needed.
```

## What to Verify
- The plan is grounded in the actual codebase and current test posture
- Scope and out-of-scope boundaries are explicit
- Commit sequencing preserves a working state throughout
- Testing decisions reduce refactor risk without overfitting to internals
- The artifact format matches the workflow: chat plan, RFC, or GitHub issue
