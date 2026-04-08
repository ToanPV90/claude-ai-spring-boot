---
name: spring-boot-engineer
description: Implementation guidance for building production-ready Spring Boot features with controllers, services, validation, transactions, security wiring, and tests. Use when the task explicitly names Spring Boot, Spring Framework, or Spring-specific application code after the architecture and layering decisions are already settled.
license: MIT
metadata:
  author: local
  version: "1.2.2"
  domain: backend
  triggers:
    - Spring Boot implementation
    - Spring MVC controller
    - Spring service bean
    - Spring Data repository
    - Spring Security
    - Spring Data JPA
    - Spring WebFlux
    - configuration properties
    - ProblemDetail
    - Actuator
  role: specialist
  scope: implementation
  output-format: code + guidance
  related-skills: maven-master, spring-boot-master, java-architect, jpa-master, blaze-persistence, jooq-master, postgres-master, tdd-guide, logging-master, keycloak-master
---

# Spring Boot Engineer

Implementation guide for turning a settled Spring Boot design into production-ready code, tests, and configuration without reopening architecture decisions that another skill should own.

## When to Use
- The task explicitly names Spring Boot or Spring Framework application code across controllers, services, repositories, configuration, or security wiring
- A feature needs concrete Spring Boot implementation defaults, not just architectural guidance
- You need production-ready patterns for validation, transactions, exception handling, Actuator, or WebFlux setup
- The user expects working code plus the supporting tests and configuration needed to run it

## When Not to Use
- The user asked for Java implementation or architecture without explicitly naming Spring Boot, Spring MVC, Spring Security, Spring Data, WebFlux, Actuator, or another Spring construct — stay framework-neutral and use `java-architect`, `design-patterns`, `clean-code`, or `tdd-guide` as appropriate
- The main task is architecture review, service decomposition, or system tradeoffs — use `java-architect`
- The main task is parent POM, module layout, BOM/dependency management, or Maven build structure — use `maven-master`
- The main task is deciding controller/service/repository ownership or DTO boundaries — use `spring-boot-master`
- The main task is JPA fetch strategy, N+1, projections, or persistence tuning — use `jpa-master`
- The main task is Blaze entity views, keyset pagination, or Blaze criteria queries over JPA entities — use `blaze-persistence`
- The main task is PostgreSQL schema, indexing, JSONB, or partition design — use `postgres-master`
- The main task is Redis caching, distributed locking, rate limiting, or RedisTemplate depth — use `redis-master`
- The main task is OAuth2/Keycloak role mapping and token-conversion detail — use `keycloak-master`
- The main task is mostly review or audit of existing code — use `java-code-review`

## Reference Guide

| Topic | Reference | Load When |
|------|-----------|-----------|
| Controllers, validation, exception handling, RestClient, WebClient | `references/web.md` | Building HTTP endpoints, request/response flow, ProblemDetail errors, or application-facing integrations inside an application module |
| Repositories, transactions, projections, JPA defaults | `references/data.md` | Implementing Spring Data access after the data model is already chosen |
| Security 6, OAuth2/JWT, method security | `references/security.md` | Wiring authentication, authorization, and filter-chain behavior |
| Spring Cloud, Config, Discovery, Gateway, resilience | `references/cloud.md` | Adding cloud/runtime wiring after the service shape is already decided |
| Slice tests, integration tests, Testcontainers, WebTestClient | `references/testing.md` | Writing or updating tests around Spring Boot implementation work |
| Spring Boot 4 migration, Jackson 3, JSpecify, RestTestClient, built-in resilience | `references/spring-boot-4.md` | Working with Spring Boot 4.x, migrating from 3.x, or adopting `@ImportHttpServices`, `@Retryable`, `@ConcurrencyLimit`, or virtual threads |

## Symptom Triage

| Symptom | Default Check | Likely Fix |
|--------|---------------|------------|
| Feature code is scattered | Are controllers, services, and repositories mixed together? | Re-apply the standard layer split and wire dependencies with constructors |
| API endpoints compile but behave inconsistently | Are validation, error handling, or DTO mapping ad hoc? | Centralize validation and `@RestControllerAdvice` defaults |
| Transaction behavior is unclear | Are writes spread across multiple methods or layers? | Move the boundary into the owning service method |
| Security wiring fails at startup or runtime | Is the filter chain or JWT/resource-server config incomplete? | Route through the security reference and align bean wiring |
| Tests are missing or too coarse | Are only end-to-end tests being added? | Pick the right slice/integration level and add focused coverage |

## Implementation Ladder

1. **Confirm the boundary is already decided and that Spring is actually explicit.** If the real problem is generic Java architecture, Maven module layout, or framework-neutral layering, route first.
2. **Generate the narrowest production code needed.** Controller, service, repository, DTO, config, or handler — not everything by reflex.
3. **Apply Spring defaults intentionally.** Constructor injection, validation, typed config, transaction boundaries, problem details.
4. **Add the right test level.** Unit, slice, or integration based on what changed.
5. **Verify the application wiring.** Compile, test, and check the relevant runtime endpoint or configuration behavior.

## Quick Mapping

| Situation | Default Choice | Prefer Instead Of |
|-----------|----------------|-------------------|
| Implement CRUD-style HTTP feature | Controller + service + DTO + repository | Dumping everything into one class |
| Bind app config | `@ConfigurationProperties` | Scattered `@Value` strings |
| Return API-safe failures | `ProblemDetail` or stable error DTO via advice | Exposing stack traces or entity internals |
| Add reads/writes with transactions | Service owns `@Transactional` boundary | Transactions in controllers |
| Add health/runtime support | Actuator + focused config | Hand-rolled health endpoints |
| Add a new dependency | Check `./mvnw dependency:tree` first | Blindly adding libraries already provided transitively |
| Call an external HTTP API (imperative) | `RestClient` | `WebClient` in non-reactive code |

## Constraints

### MUST DO

| Rule | Preferred Pattern |
|------|-------------------|
| Use constructor injection in production code | `public UserService(UserRepository repo)` |
| Keep service and custom DAO boundaries explicit | `UserService` + `UserServiceImpl`, `OrderDao` + `OrderDaoImpl` |
| Validate external input | `@Valid` DTOs at HTTP boundaries |
| Keep transaction boundaries in services | `@Transactional` on the owning write/read method |
| Use typed configuration | `@ConfigurationProperties` bound to a record/class |
| Ship implementation with tests | Match code changes with unit, slice, or integration coverage |

### MUST NOT DO
- Do not re-decide architecture in the middle of implementation work when another skill should own that choice
- Do not return entities directly from API endpoints as the default
- Do not use field injection in production components
- Do not mix blocking calls into reactive code paths
- Do not duplicate deep JPA tuning, logging policy, or Keycloak mapping guidance that sibling skills already own

## Gotchas

- “Generate a Spring Boot feature” easily turns into architecture churn if service boundaries were never settled first.
- Generic terms like “controller”, “service”, or “repository” are not enough by themselves; this skill should engage only when the request is clearly Spring-specific.
- Large copy-paste quickstarts age badly; keep the main file focused on implementation decisions and route details to references.
- Security and persistence examples look interchangeable across apps, but token mapping and fetch strategy usually belong to specialist skills.
- Test examples should prove behavior, not just context startup.
- Production-ready Spring Boot work includes config and verification, not just controller/service code.

## Minimal Examples

### Typed configuration
```java
@ConfigurationProperties(prefix = "app.jwt")
public record JwtProperties(String secret, Duration expiration) {
}
```

### Service-owned transaction boundary with interface + Impl
```java
public interface ProductService {
    ProductResponse create(ProductRequest request);
}

@Service
public class ProductServiceImpl implements ProductService {

    private final ProductRepository repository;

    public ProductServiceImpl(ProductRepository repository) {
        this.repository = repository;
    }

    @Override
    @Transactional
    public ProductResponse create(ProductRequest request) {
        Product saved = repository.save(Product.from(request));
        return ProductResponse.from(saved);
    }
}
```

## What to Verify
- The generated code stays inside an already-settled architecture, Maven module boundary, and layer boundary
- Validation, transaction ownership, config binding, and exception handling are explicit
- Tests match the change scope instead of defaulting to only one test style
- Security, JPA tuning, and logging detail are routed to the owning skills when they get deep
- The final implementation is runnable and production-facing, not just framework-shaped
- The request actually called for Spring-specific implementation rather than generic Java code

## See References
- `maven-master` for Maven multi-module structure, BOMs, and module-aware build rules
- `references/web.md` for controllers, validation, advice classes, and WebClient
- `references/data.md` for repositories, projections, transactions, and data defaults
- `references/security.md` for Security 6 and OAuth2/JWT wiring
- `references/cloud.md` for Actuator, Spring Cloud, and resilience setup
- `references/testing.md` for unit, slice, integration, and reactive test patterns
- `references/spring-boot-4.md` for Spring Boot 4 migration, Jackson 3, JSpecify, RestTestClient, and built-in resilience
