---
name: documentation-and-adrs
description: Guidance for recording architectural decisions and writing documentation that captures the why, not just the what. Use when creating ADRs, writing module documentation, improving JavaDoc, or establishing documentation standards for a Java/Spring Boot project.
license: MIT
metadata:
  author: local
  version: "1.0.0"
  domain: process
  triggers:
    - ADR
    - architecture decision record
    - documentation
    - write docs
    - module documentation
    - JavaDoc
    - README
    - document why
    - decision record
  role: guide
  scope: documentation
  output-format: documentation
  related-skills: openapi-master, maven-master, java-architect, api-contract-review
---

# Documentation & ADRs

Decision guide for recording architectural decisions, writing documentation that explains the *why*, and keeping docs useful without drowning the codebase in stale prose.

## When to Use
- The team needs to record an architectural decision so future readers understand the tradeoff, not just the outcome
- A new Maven module, service, or major component lacks a README explaining its purpose and boundaries
- JavaDoc is missing or only restates the method signature instead of explaining contracts, constraints, or failure behavior
- The user wants documentation standards for a Java/Spring Boot project
- Inline comments need review — they describe *what* the code does instead of *why* it does it that way

## When Not to Use
- The task is OpenAPI/springdoc schema authoring or Swagger UI configuration — use `openapi-master`
- The task is Maven module structure, parent POM, or reactor layout — use `maven-master`
- The task is high-level service decomposition or architecture tradeoffs — use `java-architect`
- The task is REST API contract review (HTTP semantics, versioning, error format) — use `api-contract-review`
- The task is code review or readability refactoring — use `java-code-review` or `clean-code`

## Reference Guide

| Topic | Reference | Load When |
|-------|-----------|-----------|
| Full ADR template with examples and lifecycle rules | `references/adr-template.md` | Creating a new ADR, superseding an existing one, or reviewing ADR format |
| JavaDoc rules for interfaces, DTOs, and configuration classes | `references/javadoc-conventions.md` | Writing or reviewing JavaDoc on service interfaces, records, or config |
| Documentation anti-patterns and failure modes | `references/gotchas.md` | Reviewing documentation quality or rejecting shortcuts like "code is self-documenting" |

## ADR Lifecycle

| Status | Meaning |
|--------|---------|
| PROPOSED | Under discussion; not yet binding |
| ACCEPTED | Active and binding for the project |
| SUPERSEDED | Replaced by a later ADR; link to successor |
| DEPRECATED | No longer relevant; kept for history |

ADRs are **immutable once accepted**. To change a decision, write a new ADR that supersedes the old one.

## Quick Mapping

| Situation | Default Move | Prefer Instead Of |
|-----------|--------------|-------------------|
| New architecture choice with tradeoffs | Write an ADR in `docs/decisions/` | Slack thread or tribal knowledge |
| New Maven module added | Add a module-level `README.md` | Expecting readers to reverse-engineer from `pom.xml` |
| Public service interface | JavaDoc on the interface, not the impl | Bare method signatures with no contract |
| Platform limitation or workaround in code | Inline comment explaining the *why* | Comment restating the code (`// set timeout to 30`) |
| REST API documentation | Reference `openapi-master` for springdoc/OpenAPI | Hand-written endpoint docs that drift from code |
| Project-level overview | Root `README.md` with build, run, and module map | No entry point for new developers |

## Constraints

### MUST DO

| Rule | Preferred Pattern |
|------|-------------------|
| Store ADRs in `docs/decisions/` with sequential numbering | `NNNN-short-title.md` (e.g., `0001-use-postgresql.md`) |
| Every ADR must include Context, Decision, Status, and Consequences | See template below |
| JavaDoc on service interfaces must describe the contract, not repeat the signature | State preconditions, postconditions, failure behavior |
| Module READMEs must state purpose, boundaries, and owned dependencies | One paragraph is enough; keep it current |
| Inline comments must explain constraints, gotchas, or platform limitations | Comment the *why*, delete comments that restate the *what* |

### MUST NOT DO
- Do not write ADRs for trivial choices that carry no meaningful tradeoff
- Do not let ADRs become design documents — keep them short and decision-focused
- Do not duplicate OpenAPI/springdoc concerns here; route to `openapi-master`
- Do not use JavaDoc to narrate obvious code (`@return the name` on `getName()`)
- Do not leave stale documentation in place; outdated docs are worse than no docs
- Do not add `@author` tags — git history tracks authorship

## Gotchas

- ADRs that skip the *Consequences* section are just announcements, not decision records.
- JavaDoc on implementation classes drifts from the interface contract; document the interface, let the impl inherit.
- Module READMEs that list every class become unmaintainable; describe purpose and boundaries, not inventory.
- Comments that say `// TODO: fix later` without a ticket reference are permanent residents.
- Excessive documentation is as harmful as none — readers stop trusting and stop reading.
- ADR numbering gaps are fine; never renumber to fill holes.

## Minimal Examples

### ADR template (`docs/decisions/0003-use-event-driven-order-processing.md`)
```markdown
# ADR-0003: Use Event-Driven Order Processing

## Status
ACCEPTED

## Context
Order placement currently calls billing, inventory, and notification synchronously.
A single slow downstream service blocks the entire checkout flow.
The team owns all three downstream services and can migrate to async consumers.

## Decision
Publish `OrderPlaced` domain events via Spring `ApplicationEventPublisher` internally.
Billing, inventory, and notification subscribe as `@TransactionalEventListener` consumers.
If event volume outgrows in-process delivery, extract to Kafka (see kafka-master).

## Consequences
- Checkout latency drops because the HTTP response returns after persistence, not after all side effects
- Downstream failures no longer block order placement
- Debugging requires correlation IDs across event handlers (see logging-master)
- Eventually-consistent billing state requires reconciliation checks
```

### ADR superseding a previous decision
```markdown
# ADR-0007: Migrate Order Events to Kafka

## Status
ACCEPTED — supersedes ADR-0003

## Context
In-process `ApplicationEventPublisher` can no longer handle event volume after
the fulfillment service was extracted to a separate deployable (see ADR-0005).

## Decision
Publish `OrderPlaced` events to a Kafka topic. Consumer groups replace
`@TransactionalEventListener` handlers. Retain transactional outbox pattern
to guarantee at-least-once delivery.

## Consequences
- Cross-service event delivery without shared JVM
- Operational dependency on Kafka cluster
- ADR-0003 is now SUPERSEDED
```

### JavaDoc on a service interface
```java
/**
 * Manages the lifecycle of customer orders from placement through fulfillment.
 *
 * <p>Implementations must publish an {@code OrderPlaced} event after successful
 * persistence. Callers should not assume downstream side effects (billing,
 * inventory) complete before this method returns.
 *
 * @see OrderPlacedEvent
 */
public interface OrderService {

    /**
     * Places a new order for the given customer.
     *
     * @param customerId must reference an active customer; throws
     *                   {@link CustomerNotFoundException} otherwise
     * @param items      must not be empty; throws
     *                   {@link IllegalArgumentException} if empty
     * @return the persisted order with a generated ID and PENDING status
     * @throws InsufficientStockException if any item cannot be reserved
     */
    Order placeOrder(UUID customerId, List<OrderItem> items);
}
```

### Module-level README (`my-project-service/README.md`)
```markdown
# my-project-service

Order management application module. Owns the order aggregate, exposes REST
endpoints, and publishes domain events consumed by billing and notification.

## Boundaries
- **Depends on:** `my-project-common` (shared DTOs, domain events)
- **Does not depend on:** billing or notification modules directly
- **Exposes:** REST API under `/api/orders` (see OpenAPI spec via springdoc)

## Build & Run
```bash
./mvnw -pl my-project-service -am spring-boot:run
```
```

### Inline comment — right vs wrong
```java
// WRONG: restates the code
// Set the connection timeout to 30 seconds
httpClient.setConnectTimeout(Duration.ofSeconds(30));

// RIGHT: explains the constraint
// Payment gateway drops idle connections after 25s; keep below that threshold
httpClient.setConnectTimeout(Duration.ofSeconds(20));
```

### Root README structure
```markdown
# my-project

Brief purpose statement — one or two sentences.

## Prerequisites
- Java 21+
- Docker (for PostgreSQL via docker-compose)

## Build
```bash
./mvnw clean package
```

## Modules
| Module | Purpose |
|--------|---------|
| `my-project-common` | Shared DTOs, domain events, value objects |
| `my-project-service` | Order management REST API and domain logic |

## Architecture Decisions
See `docs/decisions/` for ADRs.
```

## What to Verify
- Every non-trivial architectural choice has a corresponding ADR with Context, Decision, and Consequences
- ADR status reflects reality: superseded records link to their successor
- JavaDoc on service interfaces describes contracts, preconditions, and failure behavior — not just parameter names
- Module READMEs exist for each Maven module and state purpose, boundaries, and build commands
- Inline comments explain *why*, not *what* — comments restating obvious code are removed
- OpenAPI/springdoc is used for REST API documentation rather than hand-written endpoint docs
- Documentation is concise enough that developers actually read it

## See References
- `openapi-master` for OpenAPI/springdoc schema authoring and Swagger UI configuration
- `maven-master` for Maven multi-module structure and module boundary conventions
- `java-architect` for architecture decision framing and service boundary tradeoffs
- `api-contract-review` for REST API contract review and HTTP semantics
- `logging-master` for correlation ID and tracing documentation needs
