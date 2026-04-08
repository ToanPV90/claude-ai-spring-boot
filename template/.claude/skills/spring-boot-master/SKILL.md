---
name: spring-boot-master
description: Spring Boot layering and application-structure guidance for controllers, services, repositories, DTOs, validation, and exception boundaries. Use when shaping how a Spring Boot feature should be organized without turning the task into full code generation or system architecture work.
license: MIT
metadata:
  author: local
  version: "1.1.2"
  domain: backend
  triggers:
    - Spring Boot patterns
    - controller pattern
    - service layer
    - repository pattern
    - DTO pattern
    - exception handling
    - REST API conventions
    - Spring Boot architecture
    - package structure
    - application layering
    - validation pattern
    - configuration properties
  role: specialist
  scope: architecture
  output-format: code + guidance
  related-skills: maven-master, spring-boot-engineer, java-architect, clean-code, design-patterns, jpa-master, logging-master, api-contract-review, backend-practices-review
---

# Spring Boot Master Skill

Decision guide for organizing Spring Boot code into clear layers and boundaries without drifting into full scaffolding or low-level subsystem advice.

## When to Use
- The user needs to decide how controllers, services, repositories, DTOs, or exception handlers should be shaped
- A Spring Boot feature is becoming messy because responsibilities are leaking across layers or module boundaries
- You need conventions for validation, transaction placement, API responses, or configuration binding
- The task is about application structure and defaults more than framework-specific implementation detail

## When Not to Use
- The task is mostly generating or implementing full Spring Boot code — use `spring-boot-engineer`
- The task is about parent POM/module layout, reactor boundaries, or Maven module ownership — use `maven-master`
- The task is high-level architecture, service boundaries, or system decomposition — use `java-architect`
- The task is JPA behavior, fetch strategy, or repository/query troubleshooting — use `jpa-master`
- The task is structured logging or exception logging detail — use `logging-master`
- The task is broader backend production-safety review for trust boundaries, retries, dependency calls, storage/files, or lifecycle/cleanup behavior — use `backend-practices-review`

## Reference Guide

| Topic | Reference | Load When |
|------|-----------|-----------|
| Package layout, layer ownership, controller/service/repository boundaries | `references/layers.md` | Deciding where code belongs inside a module and which layer should own a responsibility |
| DTOs, mapping, validation, and API shapes | `references/api-boundaries.md` | Designing request/response models and validation flow |
| DTO-entity mapping, MapStruct, record factory methods | `references/mapping.md` | Setting up MapStruct, designing mapping layers, or choosing between mapping approaches |
| Exceptions, error responses, logging boundaries | `references/error-handling.md` | Shaping `@RestControllerAdvice`, domain exceptions, and API-safe failures |
| Configuration properties, profiles, annotations, testing slices | `references/configuration-and-testing.md` | Binding config, environment separation, and choosing slice vs integration tests |
| Failure modes and scope boundaries | `references/gotchas.md` | Avoiding entity leakage, service-interface cargo culting, and layer confusion |

## Symptom Triage

| Symptom | Default Check | Likely Fix |
|--------|---------------|------------|
| Controller is doing business work | Is it calling repositories or mutating entities directly? | Move orchestration and rules into a service |
| Entity shape leaks into API | Are controllers returning entities directly? | Introduce request/response DTOs and mapping |
| Service layer feels inconsistent | Are service or DAO contracts missing, or are implementations named ad hoc? | Standardize on explicit interfaces plus `Impl` implementations |
| Config is scattered and stringly typed | Are raw `@Value` fields everywhere? | Use `@ConfigurationProperties` |
| Errors are inconsistent | Are exceptions handled ad hoc in controllers? | Centralize with `@RestControllerAdvice` |

## Layering Decision Ladder

1. **Is this HTTP-only concern?** Keep it in the controller.
2. **Is this business orchestration or transaction boundary?** Put it in the service.
3. **Is this persistence access?** Keep it in the repository and route JPA details to `jpa-master`.
4. **Is this API contract shape?** Use DTOs and validation, not entities.
5. **Is this module boundary or parent-POM decision?** Route to `maven-master`.
6. **Is this framework setup or production-ready implementation depth?** Route to `spring-boot-engineer`.

## Quick Mapping

| Situation | Default Choice | Prefer Instead Of |
|-----------|----------------|-------------------|
| Handle request/response and validation | `@RestController` + DTOs | Controllers calling repositories directly |
| Own business rules and transactions | `@Service` | Fat controllers |
| Database access and query methods | Repository interface | Persistence code inside services/controllers |
| External API shape | Request/response DTOs | Returning entities directly |
| Centralized API errors | `@RestControllerAdvice` | Repeating try/catch per endpoint |
| Environment-specific config | `@ConfigurationProperties` + profiles | Hardcoded values and scattered `@Value` strings |

## Constraints

### MUST DO

| Rule | Preferred Pattern |
|------|-------------------|
| Keep layers explicit | Controller → Service → Repository inside each module |
| Keep service and DAO contracts explicit | `XxxService` / `XxxServiceImpl` and `XxxDao` / `XxxDaoImpl` when custom persistence behavior is introduced |
| Use constructor injection in production code | `public UserService(UserRepository repo)` |
| Validate input at API boundaries | `@Valid` on request DTOs |
| Return DTOs, not entities | Request/response models mapped from domain state |
| Centralize API-safe error handling | `@RestControllerAdvice` with stable response shapes |

### MUST NOT DO
- Do not put business logic or repository calls directly in controllers
- Do not expose entities through API endpoints as the default
- Do not mix logging/tracing details or JPA tuning details into this skill when specialized skills already own them
- Do not hardcode environment-specific configuration values in source-controlled config

## Gotchas

- Interface/implementation pairs are the repo convention for service and DAO layers, so keep the interface small and meaningful instead of letting it become a copy of every method on the implementation.
- Returning entities directly looks fast until lazy fields, internal IDs, or persistence annotations leak into the API.
- Validation belongs at the boundary; pushing all validation deep into services makes API errors inconsistent.
- Exception handling examples often drift into logging detail; keep logging policy in `logging-master`.
- Repository advice here should stay structural; query/fetch tuning belongs in `jpa-master`.

## Minimal Examples

### Controller delegates through a service interface
```java
@RestController
@RequestMapping("/api/v1/users")
public class UserController {

    private final UserService userService;

    public UserController(UserService userService) {
        this.userService = userService;
    }

    @PostMapping
    public ResponseEntity<UserResponse> create(@Valid @RequestBody CreateUserRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(userService.create(request));
    }
}

public interface UserService {
    UserResponse create(CreateUserRequest request);
}

@Service
public class UserServiceImpl implements UserService {

    private final UserRepository userRepository;

    public UserServiceImpl(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @Override
    public UserResponse create(CreateUserRequest request) {
        User user = User.from(request);
        User saved = userRepository.save(user);
        return UserResponse.from(saved);
    }
}
```

### Configuration properties over scattered `@Value`
```java
@ConfigurationProperties(prefix = "app.jwt")
public record JwtProperties(String secret, Duration expiration) {
}
```

## What to Verify
- Each responsibility sits in the narrowest layer that can own it cleanly
- DTOs protect the API contract from persistence internals
- Transaction boundaries live in services, not controllers
- Error handling is centralized and API-safe
- Specialized concerns still route outward to `spring-boot-engineer`, `jpa-master`, or `logging-master`

## See References
- `maven-master` for Maven multi-module structure and parent/aggregator boundaries
- `references/layers.md` for controller/service/repository boundaries and package layout inside a module
- `references/api-boundaries.md` for DTOs, validation, and mapping rules
- `references/error-handling.md` for domain exceptions, advice classes, and API-safe failures
- `references/configuration-and-testing.md` for config binding, profiles, annotations, and testing defaults
- `references/mapping.md` for DTO-entity mapping, MapStruct, and record factory methods
- `references/gotchas.md` for layering failure modes and scope boundaries
