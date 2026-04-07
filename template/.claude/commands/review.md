---
description: Conduct a structured Java code review — correctness, concurrency, security, performance, maintainability
---

Load the `java-code-review` skill.

Review the current changes (staged, recent commits, or specified scope) across all review axes:

1. **Correctness** — null safety, exception handling, boundary validation, transaction scoping. Does the code match the spec?
2. **Concurrency** — shared mutable state in singleton beans, thread-safe collections, executor lifecycle, `@Async` correctness
3. **Security** — parameterized queries, `@Valid` on DTOs, secrets from env, no entity exposure through API. Load `security-and-hardening` skill for depth.
4. **Performance** — N+1 queries, unbounded result sets, missing pagination, connection pool usage. Load `performance-optimization` skill for depth.
5. **Maintainability** — naming, method size, coupling, DTO boundaries, test coverage

**Review discipline:**
- Review tests first — tests document intent and reveal missing edge cases
- Change sizing: ~100 lines ideal, ~300 acceptable, >500 must be split
- Categorize findings as `Critical`, `High`, `Medium`, or `Low`
- State disposition: `patch`, `decision-needed`, `defer`, or `dismiss`
- Flag dead code and unused dependencies

Output a structured review with specific class/method references and fix recommendations.
