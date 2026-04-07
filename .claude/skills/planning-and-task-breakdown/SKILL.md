---
name: planning-and-task-breakdown
description: Task decomposition and dependency ordering for Java/Spring Boot features. Use when a feature needs to be broken into small, verifiable tasks before implementation begins, or when work is too large to start coding without a plan.
license: MIT
metadata:
  author: local
  version: "1.0.0"
  domain: process
  triggers:
    - plan tasks
    - break down feature
    - task breakdown
    - decompose work
    - dependency order
    - implementation plan
    - task sizing
    - acceptance criteria
  role: workflow
  scope: process
  output-format: documentation + guidance
  related-skills: spec-driven-development, incremental-implementation, request-refactor-plan, maven-master, java-architect
---

# Planning and Task Breakdown

Workflow guide for decomposing Java/Spring Boot features into small, verifiable tasks with explicit acceptance criteria, correct dependency ordering, and Maven-module-aware verification.

## When to Use
- A feature is too large to start coding without a plan
- The work spans multiple Maven modules, layers, or bounded contexts
- You need to define task dependencies, ordering, and acceptance criteria before implementation begins
- The user wants a vertical-slice breakdown with concrete verification commands
- You need to size tasks and identify parallelization opportunities across a team

## When Not to Use
- The task is a refactor plan with rollback safety and staged migration — use `request-refactor-plan`
- The main question is architecture, service boundaries, or system-level tradeoffs — use `java-architect`
- The task is Maven module structure, parent POM, or build layout — use `maven-master`
- The task is already scoped and ready for implementation — start coding
- The work is a single test or one-line fix — skip the ceremony

## Reference Guide

| Topic | File | Load When |
|-------|------|-----------|
| Task template and acceptance criteria examples | `references/task-templates.md` | You need concrete task formats with verification commands |
| Sizing heuristics and break signals | `references/sizing-and-breaks.md` | You need to decide if a task is too large or how to split it |
| Gotchas and anti-patterns in planning | `references/gotchas.md` | Planning is producing vague or unverifiable tasks |

## Plan Mode (Read-Only First)

Before producing any task list, complete a read-only discovery phase:

1. **Read the relevant code** — understand existing entities, services, controllers, and test coverage in the affected modules.
2. **Check the Maven module layout** — identify which modules are touched and their inter-module dependencies.
3. **Identify the current test posture** — what tests exist, what coverage gaps are visible?
4. **Map external dependencies** — database migrations, API contracts, message schemas, security config.
5. **Only then produce the task breakdown** — never plan against assumptions when the code is available.

## Dependency Graph: Spring Boot Feature Layers

A typical Spring Boot feature follows this dependency order. Tasks must respect this flow — downstream layers cannot be implemented before their dependencies exist.

```
Schema / Migration (Liquibase changeset)
       ↓
Entity / Domain Model
       ↓
Repository (Spring Data interface)
       ↓
Service (business logic + transactions)
       ↓
Controller (REST endpoint + validation)
       ↓
Integration Tests (full-slice or end-to-end)
```

Cross-cutting concerns (security config, exception handlers, DTO mappers) slot in parallel to the layer they serve.

## Vertical Slicing Over Horizontal

Prefer vertical slices that deliver a working, testable feature end-to-end over horizontal layers that leave the system unverifiable until every layer is complete.

| Approach | Example | Verdict |
|----------|---------|---------|
| **Vertical slice** | Migration + Entity + Repo + Service + Controller for "create order" | Preferred — each slice is independently deployable and testable |
| **Horizontal layer** | All entities first, then all repos, then all services | Avoid — nothing is verifiable until the last layer lands |

## Task Sizing

| Size | Scope | Time Estimate | Example |
|------|-------|---------------|---------|
| **XS** | Single file change, config tweak | < 30 min | Add a property to `application.yml` |
| **S** | One class + its test | 30 min – 2 hrs | Add a Repository interface with a custom query + test |
| **M** | One vertical slice across 2-3 layers | 2 – 4 hrs | Service method + Controller endpoint + integration test |
| **L** | Full feature slice across all layers | 4 – 8 hrs | Migration + Entity + Repo + Service + Controller + tests |
| **XL** | Must be broken down further | > 8 hrs | Break into multiple S/M tasks — XL is a planning smell |

**Break signal:** If a task description needs more than 3 sentences to explain, it is too large.

## Task Template

Every task in the breakdown should include:

```markdown
### Task [N]: [Short title]
- **Size:** S | M | L
- **Module:** `my-project-service` (or `my-project-common`, etc.)
- **Depends on:** Task [N-1] (or "none")
- **Description:** One sentence stating what this task produces.
- **Acceptance criteria:**
  - [ ] [Concrete, verifiable condition]
  - [ ] [Another verifiable condition]
- **Verify:**
  ```bash
  ./mvnw -pl my-project-service test -Dtest=OrderServiceTest
  ```
```

## Quick Mapping

| Situation | Default Move | Avoid |
|-----------|--------------|-------|
| Feature spans one module | Vertical slice breakdown within that module | Over-splitting into XS noise |
| Feature spans multiple modules | Map cross-module dependencies first, then slice per module | Ignoring module build order |
| Database schema change required | Migration task is always first in the dependency chain | Coding entities before the migration exists |
| Unclear requirements | Plan Mode discovery + clarification before any task list | Planning against assumptions |
| Team wants parallel work | Identify independent modules/slices for concurrent assignment | Assigning dependent tasks to different people without sequencing |

## Constraints

### MUST DO

| Rule | Preferred Move |
|------|----------------|
| Run Plan Mode before producing tasks | Read code, check modules, verify assumptions |
| Respect the dependency graph | No controller task before its service exists |
| Include acceptance criteria on every task | Concrete, verifiable conditions — not vague goals |
| Include a `./mvnw` verification command per task | Module-targeted: `./mvnw -pl module test` or `./mvnw -pl module verify` |
| Size every task | XS / S / M / L — flag XL as a break signal |
| Prefer vertical slices | End-to-end slices over horizontal layers |

### MUST NOT DO
- Do not produce a task list without reading the relevant code first (Plan Mode)
- Do not create tasks larger than L — break them down
- Do not sequence tasks that can be parallelized
- Do not omit the migration/schema task when database changes are involved
- Do not write acceptance criteria that cannot be verified by running a command or inspecting output
- Do not assume module structure — check the actual `pom.xml` reactor layout

## Parallelization Guidance

Tasks are parallelizable when they have **no shared state and no dependency edge** between them.

**Safe to parallelize:**
- Independent module work (e.g., `my-project-common` DTO additions while `my-project-service` config changes)
- Unrelated vertical slices in the same module (e.g., "create order" and "list products" if they share no new entity)
- Test authoring for already-implemented layers

**Must be sequential:**
- Migration → Entity → Repository (each depends on the previous)
- Service → Controller (controller calls the service)
- Any task whose acceptance criteria reference output from another task

### Parallel vs Sequential Diagram

```
Sequential chain:             Parallelizable:

[Migration] ──→ [Entity]     [Module A: DTO]  ║  [Module B: Config]
      ↓              ↓              ↓          ║         ↓
[Repository]    [Service]     [Module A: Test] ║  [Module B: Test]
                    ↓
              [Controller]
                    ↓
           [Integration Test]
```

## Checkpoints

Insert a checkpoint after every 2-3 tasks or at natural boundaries:

| Checkpoint | Verify |
|------------|--------|
| After migration + entity | `./mvnw -pl my-project-service test` — schema loads, entity maps correctly |
| After service layer | `./mvnw -pl my-project-service test -Dtest=*ServiceTest` — business logic passes |
| After controller | `./mvnw -pl my-project-service verify` — full module verification including integration tests |
| After all modules | `./mvnw clean verify` — full reactor build passes |

## Gotchas

- A task breakdown is not an architecture decision — if boundaries are unclear, route to `java-architect` first.
- Vertical slices sometimes need a thin horizontal foundation (e.g., a shared exception handler). Include that as an explicit prerequisite task.
- Teams often parallelize tasks that share a migration — this causes merge conflicts. Sequence all migration tasks.
- Acceptance criteria that say "works correctly" are not verifiable. Name the test class, the HTTP status, or the assertion.
- Module-targeted `./mvnw -pl` commands are faster and more precise than full reactor builds during development.

## Minimal Examples

### Vertical Slice: "Add order creation endpoint"

```markdown
### Task 1: Liquibase migration for `orders` table
- **Size:** S
- **Module:** `my-project-service`
- **Depends on:** none
- **Description:** Add a Liquibase changeset creating the `orders` table with `id`, `customer_id`, `total`, `status`, `created_at`.
- **Acceptance criteria:**
  - [ ] Changeset applies cleanly on a fresh database
  - [ ] Rollback changeset drops the table
- **Verify:**
  ```bash
  ./mvnw -pl my-project-service test -Dtest=LiquibaseChangelogTest
  ```

### Task 2: Order entity and repository
- **Size:** S
- **Module:** `my-project-service`
- **Depends on:** Task 1
- **Description:** Create `Order` JPA entity mapping to the `orders` table and `OrderRepository` extending `JpaRepository`.
- **Acceptance criteria:**
  - [ ] Entity maps all columns with correct types
  - [ ] Repository persists and retrieves an Order in a test with TestContainers
- **Verify:**
  ```bash
  ./mvnw -pl my-project-service test -Dtest=OrderRepositoryTest
  ```

### Task 3: OrderService with creation logic
- **Size:** M
- **Module:** `my-project-service`
- **Depends on:** Task 2
- **Description:** Implement `OrderService` with a `createOrder(CreateOrderRequest)` method that validates input, persists the entity, and returns an `OrderResponse` DTO.
- **Acceptance criteria:**
  - [ ] Service creates an order and returns a DTO with the generated ID
  - [ ] Service rejects requests with null or negative total (negative test)
  - [ ] Method runs within a `@Transactional` boundary
- **Verify:**
  ```bash
  ./mvnw -pl my-project-service test -Dtest=OrderServiceTest
  ```

### Task 4: OrderController REST endpoint
- **Size:** M
- **Module:** `my-project-service`
- **Depends on:** Task 3
- **Description:** Expose `POST /api/orders` via `OrderController`, delegating to `OrderService`. Apply `@Valid` on the request body and return `201 Created`.
- **Acceptance criteria:**
  - [ ] `POST /api/orders` with valid body returns 201 with the order ID
  - [ ] `POST /api/orders` with invalid body returns 400 with ProblemDetail
  - [ ] Integration test uses `@WebMvcTest` or `@SpringBootTest` with MockMvc
- **Verify:**
  ```bash
  ./mvnw -pl my-project-service test -Dtest=OrderControllerTest
  ```

### Checkpoint: full module verification
```bash
./mvnw -pl my-project-service verify
```
```

### Maven Multi-Module Task Ordering

When a feature spans modules, map the module dependency graph first:

```markdown
## Module dependency: my-project-common → my-project-service

### Task 1: Add CreateOrderRequest DTO to common module
- **Size:** XS
- **Module:** `my-project-common`
- **Depends on:** none
- **Verify:** `./mvnw -pl my-project-common test`

### Task 2: Add OrderResponse DTO to common module
- **Size:** XS
- **Module:** `my-project-common`
- **Depends on:** none (parallelizable with Task 1)
- **Verify:** `./mvnw -pl my-project-common test`

### Task 3: Liquibase migration in service module
- **Size:** S
- **Module:** `my-project-service`
- **Depends on:** none (independent of common module DTOs)
- **Verify:** `./mvnw -pl my-project-service test -Dtest=LiquibaseChangelogTest`

### Task 4: Entity + Repository + Service + Controller
- **Size:** L
- **Module:** `my-project-service`
- **Depends on:** Task 1, Task 2, Task 3
- **Verify:** `./mvnw -pl my-project-service verify`

### Checkpoint: full reactor build
```bash
./mvnw clean verify
```
```

## What to Verify
- Plan Mode was completed before the task list was produced
- Every task has a size, module, dependency, acceptance criteria, and verification command
- The dependency ordering respects the Spring Boot layer graph and Maven module graph
- No task is sized XL — large tasks have been broken down
- Vertical slices are preferred over horizontal layers
- Parallelizable tasks are explicitly marked
- Checkpoints are placed at natural boundaries
- Acceptance criteria are concrete and verifiable by command or assertion

## See References
- `request-refactor-plan` for staged refactor and rollback planning
- `java-architect` for architecture decisions before task decomposition
- `maven-master` for Maven multi-module structure and build commands
- `spring-boot-master` for controller/service/repository layering within a module
- `tdd-guide` for test-first workflow within each task
