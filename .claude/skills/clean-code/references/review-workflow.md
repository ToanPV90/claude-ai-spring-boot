# Maintainability Review Workflow

## Review Order

1. **Scope** — Is this a local readability cleanup or really an architecture issue?
2. **Names** — Fix misleading names before extracting new types.
3. **Method shape** — Remove deep nesting, flag arguments, and mixed abstraction levels.
4. **Duplication** — Merge duplicated knowledge only after understanding the domain meaning.
5. **Data modeling** — Replace primitives or loose maps with real concepts where justified.
6. **Dead code** — Delete unused branches, helpers, and speculative extension points.

## Safe Defaults

- prefer local refactors before moving code across modules
- keep tests focused on behavior, not helper methods
- if a cleanup suggests a design pattern, stop and switch to `design-patterns`
- if the work needs phased rollout, stop and switch to `request-refactor-plan`

## Questions to Ask

- What is hardest to understand in 30 seconds?
- Is the confusion caused by naming, structure, or missing domain concepts?
- Which smallest change would remove the most confusion?
- Is this duplication truly the same rule?
