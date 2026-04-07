# Gotchas and Anti-Patterns in Planning

## Planning Against Assumptions vs Reading Code

| Anti-Pattern | What Happens | Fix |
|-------------|-------------|-----|
| Skip Plan Mode and start listing tasks | Tasks reference entities, tables, or modules that don't exist — or miss ones that do | Always run Plan Mode: read code, check `pom.xml` reactor, inspect existing tests |
| Assume the module name | Task says `my-app-service` but the actual module is `my-app-api` | Read the root `pom.xml` `<modules>` block before writing any task |
| Assume no existing code | Plan creates a new entity when one already exists with a different name | Grep for related classes before planning a "create" task |

## Horizontal vs Vertical Slice Traps

| Trap | Symptom | Fix |
|------|---------|-----|
| "All entities first" plan | 5 entity tasks, then 5 repo tasks — nothing testable until task 10 | Slice vertically: one entity + repo + service + controller per feature |
| Vertical slice too thick | One task covers migration through integration test (size XL) | Split the vertical into S/M layers — each independently verifiable |
| Shared foundation skipped | Vertical slice fails because the global exception handler doesn't exist yet | Add a prerequisite task for cross-cutting infrastructure (exception handler, base config) |

## Missing Migration Tasks

| Mistake | Consequence | Rule |
|---------|------------|------|
| Entity task without a preceding migration task | JPA creates the table via `ddl-auto`, schema diverges from Liquibase | Migration task is **always first** when the feature touches the database |
| Multiple migrations in one task | Rollback is all-or-nothing, harder to review | One changeset = one task |
| Parallelized migration tasks | Changeset ordering conflicts at merge time | Migrations are **always sequential** — never parallelize |

## Vague Acceptance Criteria

| ❌ Vague | ✅ Concrete |
|----------|------------|
| "Service works correctly" | "`OrderServiceTest.createOrder_validInput_returnsDto()` passes" |
| "API returns proper errors" | "`POST /api/orders` with empty body returns 400 with `ProblemDetail.title = 'Bad Request'`" |
| "Tests pass" | "`./mvnw -pl my-project-service test -Dtest=OrderControllerTest` exits 0" |
| "Code is clean" | "No compiler warnings; `./mvnw -pl my-project-service compile` exits 0" |

## Other Common Mistakes

- **Over-splitting into XS noise** — 15 tasks for a simple CRUD feature wastes more time planning than coding. Aim for 4–6 tasks per vertical slice.
- **Ignoring test tasks** — tests are not "implied." If a task produces code, its acceptance criteria must name the test class.
- **Forgetting security config** — if the endpoint needs authentication, include a task for `SecurityFilterChain` updates or `@PreAuthorize` annotations.
- **No checkpoints** — without verification gates between groups, errors compound silently. Insert a checkpoint every 2–3 tasks.
- **Planning refactors as features** — a refactor needs rollback safety and staged migration. Route to `request-refactor-plan` instead.
