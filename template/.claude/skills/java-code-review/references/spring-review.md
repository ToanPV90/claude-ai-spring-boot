# Spring Review Guidance

## Common Spring Smells

Check for:
- field injection instead of constructor injection
- missing or misplaced `@Transactional`
- circular dependencies
- controllers returning entities directly
- `@Component` where `@Service` or `@Repository` communicates intent better
- `@MockBean` usage in Spring Boot 3.4+ where `@MockitoBean` is preferred
- `spring.jpa.hibernate.ddl-auto=create` outside test-only contexts

## Boundary Questions

- Does the controller only handle HTTP concerns?
- Does the service own orchestration and transaction boundaries?
- Is persistence logic staying in repositories?
- Are DTOs protecting the API from persistence internals?

## Spring Concurrency Review

Check for:
- mutable fields inside singleton beans that can be touched by multiple requests or background jobs
- `@Async` methods assuming transactions, security context, MDC, or request-scoped state propagate automatically
- `@Scheduled` work that can overlap and mutate the same state concurrently
- blocking or lazy JPA access pushed across async thread boundaries
- request-specific state cached in bean fields instead of method scope

Prefer:
- stateless singleton beans by default
- explicit executor ownership and context propagation for async work
- explicit concurrency control when scheduled jobs, caches, or background workers share mutable state
- separate beans when transaction boundaries or async ownership become unclear

## Testing Expectations

Suggest tests for:
- null and boundary inputs
- exception paths
- transaction-sensitive behavior
- async / scheduled behavior when the diff introduces shared state or thread handoff
- framework configuration that could silently fail at runtime
