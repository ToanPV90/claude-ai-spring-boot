---
name: spec-driven-development
description: Structured specification workflow for Java projects. Use when starting a new feature, module, or service and the requirements need to be captured, verified, and broken down before any code is written.
license: MIT
metadata:
  author: local
  version: "1.0.0"
  domain: process
  triggers:
    - spec first
    - write spec
    - specification
    - feature spec
    - requirements
    - define before code
    - clarify requirements
    - assumption check
  role: workflow
  scope: process
  output-format: documentation + guidance
  related-skills: java-architect, spring-boot-engineer, tdd-guide, request-refactor-plan, maven-master
---

# Spec-Driven Development — Java / Spring Boot

Write a structured specification and surface assumptions before any code is written. The spec is a living document that gates every downstream decision.

## When to Use

- A new feature, module, or service needs requirements captured before implementation starts
- The user says "spec first", "write a spec", or "clarify requirements"
- Assumptions about project structure, testing, or boundaries are unverified
- A Maven module or Spring Boot feature needs scope, commands, and success criteria agreed on before code

## When Not to Use

- The task is breaking an existing refactor into safe commits — use `request-refactor-plan`
- The task is architecture or service-boundary decisions — use `java-architect`
- The task is implementing Spring Boot code after the spec is already agreed — use `spring-boot-engineer`
- The task is choosing test levels or running red-green-refactor — use `tdd-guide`
- The task is Maven module layout or POM structure — use `maven-master`

## Reference Guide

| Topic | File | Load When |
|-------|------|-----------|
| Spec template with all six areas pre-filled | `references/spec-template.md` | You need a blank spec skeleton to fill in |
| Assumption-surfacing checklist | `references/assumptions.md` | You need to verify implicit decisions before locking the spec |
| Phase gate criteria | `references/phase-gates.md` | You need to confirm readiness before advancing to the next phase |

## Four Gated Phases

```text
SPECIFY → PLAN → TASKS → IMPLEMENT
```

Each phase has an exit gate. Do not advance until the gate is met.

| Phase | Purpose | Exit Gate |
|-------|---------|-----------|
| **SPECIFY** | Capture the six spec areas; surface assumptions | Spec reviewed and assumptions resolved |
| **PLAN** | Map spec to Maven modules, layers, and integration points | Module boundaries and layer responsibilities agreed |
| **TASKS** | Break the plan into ordered, testable work items | Each task has a clear scope and at least one acceptance test |
| **IMPLEMENT** | Code against tasks using TDD; route to `tdd-guide` | All tasks green; `./mvnw clean verify` passes |

## Six Core Spec Areas

| Area | What It Captures | Example |
|------|-----------------|---------|
| **Objective** | One-sentence goal and success criteria | "Users can search orders by date range and status" |
| **Commands** | Build, test, and run commands | `./mvnw clean verify`, `./mvnw test -pl order-service` |
| **Project Structure** | Maven modules, packages, layers | `order-service/src/main/java/.../controller/` |
| **Code Style** | Records for DTOs, constructor injection, no Lombok | Per project AGENTS.md conventions |
| **Testing Strategy** | Test types per layer with concrete annotations | `@WebMvcTest` for controllers, `@DataJpaTest` for repos |
| **Boundaries** | What is in scope, out of scope, and deferred | "Auth is out of scope; assume a valid JWT principal" |

## Quick Mapping

| Situation | Spec Focus | Route After Spec |
|-----------|-----------|-----------------|
| New Maven module | Objective, Project Structure, Commands | `maven-master` → `spring-boot-engineer` |
| New REST endpoint in existing module | Objective, Testing Strategy, Boundaries | `spring-boot-engineer` → `tdd-guide` |
| Cross-cutting concern (auth, logging) | Boundaries, Assumptions, Code Style | `java-architect` → specialist skill |
| Greenfield service | All six areas fully | `java-architect` → `maven-master` → `spring-boot-engineer` |

## Constraints

### MUST DO

| Rule | Why |
|------|-----|
| Write the spec before any production code | Prevents assumption drift and rework |
| Surface every assumption as a question | Unverified assumptions are the top cause of spec failure |
| Include at least one success criterion per objective | A spec without criteria is just a wish |
| Map testing strategy to concrete Spring Boot annotations | Keeps test decisions actionable, not vague |
| Reframe success criteria as observable behaviors | "Order list returns 200 with matching results" not "search works" |

### MUST NOT DO

- Do not write code during the SPECIFY or PLAN phases
- Do not skip the Boundaries area; implicit scope is the most common spec failure
- Do not treat the spec as frozen; update it when assumptions change (living document)
- Do not duplicate architecture decisions already owned by `java-architect`
- Do not embed implementation details (class names, method signatures) in the spec objective

## Gotchas

- A spec that lists features without success criteria will not gate anything.
- Assumptions that feel obvious ("we use PostgreSQL") still need explicit confirmation; they are the ones that silently break.
- The spec is a living document: update it when PLAN or TASKS reveal new constraints, but log the change.
- Testing Strategy must name annotations (`@WebMvcTest`, `@DataJpaTest`, `@SpringBootTest`), not just "unit and integration tests."

## Minimal Examples

### Feature spec — order search
```markdown
## Objective
Users can search orders by date range and status, returning paginated results.

## Commands
- Build: `./mvnw clean verify -pl order-service`
- Run:   `./mvnw spring-boot:run -pl order-service`

## Project Structure
- Module: `order-service`
- Layers: OrderSearchController → OrderSearchService (interface + Impl) → OrderRepository

## Code Style
- Records for OrderSearchRequest, OrderSearchResponse
- Constructor injection; no Lombok

## Testing Strategy
- Controller: @WebMvcTest(OrderSearchController.class)
- Repository: @DataJpaTest with Testcontainers PostgreSQL
- Integration: @SpringBootTest with Testcontainers

## Boundaries
- In scope: search, pagination, date range + status filter
- Out of scope: authentication (assume valid JWT), order creation
- Deferred: export to CSV
```

### Assumption log
```markdown
| # | Assumption | Status | Resolution |
|---|-----------|--------|------------|
| 1 | PostgreSQL is the target database | ✅ Confirmed | Use Testcontainers postgres |
| 2 | Pagination uses Spring Data Pageable | ✅ Confirmed | Default page size 20 |
| 3 | Status is an enum, not free text | ❓ Open | Ask product owner |
```

## What to Verify

- All six spec areas are filled before PLAN begins
- Every assumption is logged with a status (confirmed, open, rejected)
- Success criteria are observable behaviors, not implementation wishes
- Testing strategy names concrete annotations and tools
- The spec is updated when downstream phases surface new constraints
- `./mvnw clean verify` is the final gate, not just "tests pass locally"

## See References

- `references/spec-template.md` — blank spec skeleton
- `references/assumptions.md` — assumption-surfacing checklist
- `references/phase-gates.md` — phase gate criteria
