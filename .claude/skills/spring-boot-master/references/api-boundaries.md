# API Boundaries: DTOs, Mapping, Validation

## DTO Rule

Prefer request/response DTOs for API boundaries.

Use entities for persistence, not as public API contracts.

Prefer wrapper types (`Long`, `Integer`, `Boolean`) instead of primitives in boundary DTOs when `null` must represent “not supplied” or partial-update semantics.

## Validation

Place validation on request DTOs and trigger it at the controller boundary with `@Valid`.

```java
public record CreateUserRequest(
    @NotBlank String name,
    @Email String email,
    @NotNull @Min(18) Integer age
) {}
```

## Mapping

Mapping can be manual or tool-based. The important rule is that mapping keeps persistence internals out of API contracts.

If using MapStruct, keep mappers focused and obvious.

## API Conventions

- prefer versioned REST paths when the project uses versioning
- use plural nouns for collections
- return `201 Created` for successful creation
- use `204 No Content` for successful delete with no response body

For full HTTP verb decision logic, versioning strategy comparisons, backward compatibility review, or release-readiness checks,
route to `api-contract-review`.
