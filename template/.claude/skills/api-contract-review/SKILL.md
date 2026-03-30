---
name: api-contract-review
description: Review guidance for REST API contracts with emphasis on HTTP semantics, versioning, backward compatibility, error formats, and release readiness. Use when auditing endpoint design, controller-facing API changes, or whether a REST contract remains safe and consistent for clients while keeping review scope/completeness explicit.
license: MIT
metadata:
  author: local
  version: "1.1.3"
  domain: backend
  triggers:
    - review API
    - REST review
    - endpoint design
    - API contract
    - backward compatibility
    - HTTP semantics
    - response consistency
    - status codes
    - versioning review
    - OpenAPI review
  role: reviewer
  scope: review
  output-format: analysis
  related-skills: java-code-review, backend-practices-review, spring-boot-master, spring-boot-engineer, keycloak-master
---

# API Contract Review Skill

Decision guide for reviewing HTTP-facing API behavior before merge or release without drifting into full implementation work or generic Java review.

## When to Use
- The user wants REST endpoints, controller changes, or API behavior reviewed before release
- You need to check HTTP semantics, status codes, versioning, compatibility, or response consistency
- A PR changes request/response DTOs, endpoint URLs, error handling, pagination, or OpenAPI documentation
- The risk is client breakage or confusing API behavior rather than low-level implementation defects

## When Not to Use
- The task is implementation-heavy work rather than API review — use the appropriate implementation skill; for Spring Boot, that is `spring-boot-engineer`
- The task is mostly layer ownership, DTO placement, or controller/service responsibility — use `spring-boot-master`
- The main concern is broader backend production-safety defaults such as trust boundaries, retry safety, dependency-call containment, storage/files, or lifecycle behavior — use `backend-practices-review`
- The task is generic Java bug-risk review with little HTTP surface — use `java-code-review`
- The main concern is Keycloak/OAuth2 token mapping or role extraction rather than HTTP contract behavior — use `keycloak-master`

## Reference Guide

| Topic | Reference | Load When |
|------|-----------|-----------|
| Shared review intake, completeness, severity, and disposition contract | `references/review-intake-and-output.md` | Starting any API review so client-risk findings are scoped and reported consistently |
| HTTP verbs, URL design, idempotency, and status code semantics | `references/http-semantics.md` | Reviewing endpoint shape, verbs, URL patterns, and response codes |
| Versioning, backward compatibility, deprecation, and release safety | `references/versioning-and-compatibility.md` | Checking whether a change breaks existing clients |
| DTO boundaries, pagination, and response consistency | `references/request-response-design.md` | Reviewing payload structure and API-facing model choices |
| Error format, auth-related responses, and OpenAPI alignment | `references/errors-and-documentation.md` | Reviewing error envelopes, 401/403 behavior, and generated spec accuracy |
| Review checklist and failure modes | `references/review-checklist.md` | Running a final API review pass or avoiding repeated contract mistakes |

## Shared Review Contract

Start every review by stating the target, the diff or files examined, supporting context used, and whether the result is **complete** or **partial** because important inputs were missing.

For each finding, keep the report shape explicit:
- **severity** — `Critical`, `High`, `Medium`, or `Low`
- **disposition** — `patch`, `decision-needed`, `defer`, or `dismiss`
- **impact** — client breakage, confusing semantics, compatibility risk, or release risk
- **next move** — patch now, route to a specialty skill, or ask for a product/API decision

## Symptom Triage

| Symptom | Default Check | Likely Fix |
|--------|---------------|------------|
| Endpoint “works” but feels un-RESTful | Is the verb or URL shape mismatched to the action? | Re-check verb semantics and noun-based URL design |
| API change may break clients | Were fields removed, made required, renamed, or repurposed in place? | Apply compatibility/deprecation rules before merge |
| Error handling confuses clients | Are status codes or error bodies inconsistent across endpoints? | Normalize error structure and 4xx/5xx usage |
| Response leaks persistence internals | Are entities or internal IDs exposed directly? | Move to explicit request/response DTOs |
| Security behavior is unclear to clients | Are 401/403 semantics or auth error bodies inconsistent? | Review auth-related contract behavior and route provider-specific wiring outward |

## Contract Review Ladder

1. **Is the HTTP contract understandable from the outside?** Check URL, verb, and status code meaning first.
2. **Will existing clients break?** Review versioning, field changes, and deprecation path.
3. **Are request and response models API-safe?** Avoid entity leakage and inconsistent shapes.
4. **Are errors machine-usable and client-safe?** Normalize error format, status codes, and security responses.
5. **Does this need a specialist instead?** Route deep implementation, layering, or provider-specific auth concerns outward.

## Quick Mapping

| Situation | Default Review Move | Prefer Instead Of |
|-----------|---------------------|-------------------|
| Retrieval endpoint | `GET` with query params for filtering | `POST` used only to hide a search |
| Create endpoint | `POST` returning `201 Created` + `Location` when appropriate | `200 OK` with ambiguous creation semantics |
| Update endpoint | `PUT` for replace, `PATCH` for partial change | `POST /resource/{id}` for updates |
| Collection endpoint | Pagination and stable response shape | Returning unbounded lists by default |
| Auth failure behavior | `401` for missing/invalid auth, `403` for insufficient permission | Swapping the two |

## Constraints

### MUST DO

| Rule | Preferred Pattern |
|------|-------------------|
| Use verbs that match behavior | `GET` retrieve, `POST` create/action, `PUT` replace, `PATCH` partial update, `DELETE` remove |
| Keep public APIs versioned or explicitly internal | `/api/v1/...` or documented internal-only path |
| Return DTOs, not entities | Stable request/response models owned by the API layer |
| Use proper status codes for both success and failure | `201` for create, `404` for missing resource, `409` for conflict, etc. |
| Keep error bodies consistent and client-safe | Machine-readable code + human-readable message + stable structure |

### MUST NOT DO
- Do not return `200 OK` for error states just to simplify handlers
- Do not ship breaking field/path changes in place without versioning or migration path
- Do not expose JPA entities or internal persistence structure as the public contract
- Do not blur authentication and authorization failures by swapping `401` and `403`
- Do not treat generated OpenAPI docs as correct without checking them against real behavior

## Gotchas

- A technically working endpoint can still be a bad contract if the verb or status code lies to clients.
- “Just add a required field” is usually a breaking change, even when server code stays simple.
- API review often drifts into service implementation comments; keep this skill focused on the contract surface.
- Security contract review is about response behavior and access semantics, not provider-specific JWT plumbing.
- Pagination, counts, and collection wrappers should be deliberate; accidental inconsistency is hard to undo later.

## Minimal Examples

### Use the right status code for creation
```java
@PostMapping
public ResponseEntity<UserResponse> create(@Valid @RequestBody CreateUserRequest request) {
    UserResponse created = userService.create(request);
    URI location = URI.create("/api/v1/users/" + created.id());
    return ResponseEntity.created(location).body(created);
}
```

### Avoid `200 OK` for error bodies
```java
@GetMapping("/{id}")
public ResponseEntity<UserResponse> get(@PathVariable Long id) {
    return userService.findById(id)
        .map(ResponseEntity::ok)
        .orElse(ResponseEntity.notFound().build());
}
```

## What to Verify
- The review states target, context used, missing context, and whether completeness is full or partial
- HTTP verbs, URLs, and status codes match the real behavior exposed to clients
- Findings use an explicit disposition (`patch`, `decision-needed`, `defer`, or `dismiss`) instead of an implicit recommendation
- Request/response models are API-safe and consistent across related endpoints
- Versioning and compatibility risks are explicit before merge or release
- Error and auth-related responses are consistent, non-leaky, and client-usable
- Deep implementation, layering, or provider-specific concerns are routed to the owning skills

## See References
- `references/review-intake-and-output.md` for the shared review scope/completeness/disposition contract
- `references/http-semantics.md` for verbs, URL design, status codes, and content negotiation
- `references/versioning-and-compatibility.md` for version strategy, breaking changes, and deprecation rules
- `references/request-response-design.md` for DTOs, pagination, and response consistency
- `references/errors-and-documentation.md` for error envelopes, OAuth2/security contract checks, and OpenAPI review
- `references/review-checklist.md` for the end-to-end API review checklist and common traps
