---
description: Implement the next task incrementally — TDD, test, verify with ./mvnw, commit
---

Load the `incremental-implementation` skill alongside the `tdd-guide` skill.

Pick the next pending task from the plan. For each task:

1. Read the task's acceptance criteria and identify the target module
2. Load relevant context — existing code, patterns, entity relationships
3. **RED** — write a failing test for the expected behavior (`@WebMvcTest`, `@DataJpaTest`, or unit test)
4. **GREEN** — implement the minimum production code to make it pass (no Lombok, constructor injection, records for DTOs)
5. **REFACTOR** — assess whether cleanup improves clarity; skip if not needed
6. Run module tests: `./mvnw test -pl module-name -am`
7. Verify full build if cross-module: `./mvnw clean verify`
8. Commit with a descriptive message describing the behavior, not the files touched
9. Move to the next task

If any step fails, load the `debugging-and-error-recovery` skill and follow the six-step triage checklist.
