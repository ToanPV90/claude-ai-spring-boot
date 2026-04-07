# Sizing Heuristics and Break Signals

## Sizing Criteria with Java/Spring Boot Examples

| Size | Files Touched | Layers | Test Count | Java/Spring Boot Examples |
|------|--------------|--------|------------|--------------------------|
| **XS** | 1 | 0–1 | 0–1 | Add a config property; rename a column alias; add a `@Value` field |
| **S** | 1–3 | 1 | 1–2 | New `Repository` + test; new DTO record; single Liquibase changeset + rollback test |
| **M** | 3–6 | 2–3 | 2–4 | Service + Controller + tests; Entity + Repo + Service with TestContainers |
| **L** | 6–10 | 3–5 | 4–8 | Full vertical slice: migration + entity + repo + service + controller + integration tests |
| **XL** | 10+ | 5+ | 8+ | **Must be split.** Multi-entity feature, cross-module migration, or new bounded context |

## Break Signals — When to Split a Task

A task is too large when **any** of these are true:

1. **The "and" test** — the description contains "and" joining two independent deliverables.
   - ❌ "Create the Product entity **and** the Order entity" → split into two tasks.
   - ✅ "Create the Product entity and its repository" → single layer pair, keep together.

2. **The "3 sentences" test** — the description needs more than 3 sentences to explain.
   - ❌ "Implement the order service. It handles creation, update, cancellation, and refunds. Each operation has different validation rules. Cancellation must notify an external service." → 4+ tasks.
   - ✅ "Implement OrderService.createOrder() with input validation and persistence." → one task.

3. **Multiple modules** — the task touches two or more Maven modules with inter-module dependencies.
   - Split into one task per module, ordered by the reactor dependency graph.

4. **Multiple migrations** — the task requires more than one Liquibase changeset.
   - Each changeset is its own task — migrations must never be parallelized.

5. **Mixed concerns** — the task combines infrastructure (Docker, CI) with application code.
   - Infrastructure and application tasks have different verification commands; split them.

## How to Split an XL Task

1. **Identify the dependency layers** — list every artifact the task produces (migration, entity, repo, service, controller, test, config).
2. **Draw the dependency edges** — which artifact depends on which?
3. **Group into S/M tasks** — each group should be independently testable with a `./mvnw` command.
4. **Add checkpoint tasks** — insert verification checkpoints between groups.

### Example: Splitting an XL "User management" Feature

| Original XL | Split Into |
|-------------|-----------|
| "Implement user registration, login, profile update, and password reset" | Task 1 (S): `users` migration |
| | Task 2 (S): User entity + repo |
| | Task 3 (M): Registration service + controller |
| | Task 4 (M): Profile update service + controller |
| | Task 5 (M): Password reset service + controller |
| | Task 6 (S): Integration tests for all endpoints |

Each task is independently verifiable. Tasks 3–5 are parallelizable after Task 2 completes.
