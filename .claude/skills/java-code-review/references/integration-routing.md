# Integration Routing

Use this skill to notice subsystem risks, then route deeper review to the owning skill.

## Route To `api-contract-review`

When the main concern is:
- HTTP verb correctness
- versioning
- backward compatibility
- response/error format consistency

## Route To `jpa-master`

When the main concern is:
- N+1 queries
- lazy loading
- entity mapping/fetch strategy
- transaction and repository query behavior
- optimistic locking, `@Version` conflicts, or concurrent write retry policy

## Route To `blaze-persistence`

When the main concern is:
- `@EntityView` correctness or projection design
- keyset pagination behavior or stable seek ordering
- Blaze criteria-builder query composition over JPA entities
- choosing Blaze entity views instead of JPQL constructor expressions or manual DTO mapping

## Route To `postgres-master`

When the main concern is:
- schema, index, nullability, or constraint design in a PostgreSQL-backed feature
- foreign-key indexing, JSONB column modeling, or partitioning review concerns
- migration-risk questions around `create index concurrently`, large-table rewrites, or PostgreSQL-specific DDL behavior

## Route To `backend-practices-review`

When the main concern is:
- trust boundaries, validation discipline, or unsafe assumptions about client-controlled input
- duplicate writes, retry safety, or concurrent delivery that needs idempotency/duplicate protection
- slow or failure-prone dependency calls living inline in request/transaction flows
- file upload architecture, object-storage choice, or durable-key-vs-URL persistence
- buffering whole uploads in memory, large-payload boundedness, or staging/cleanup risk
- lifecycle modeling, cleanup, expiration, or operator visibility across long-lived backend flows

## Route To `kafka-master`

When the main concern is:
- listener acknowledgment semantics
- retry/DLT configuration
- producer result handling
- consumer group and error-handler correctness
- listener concurrency, partition-to-thread mapping, or consumer-thread safety

## Route To `redis-master`

When the main concern is:
- cache TTL strategy
- serializer choice
- cache eviction correctness
- Redis outage behavior
- distributed lock safety or unlock token correctness
- rate-limiter correctness, expiry windows, or Lua-script behavior
- pub/sub message handling, deserialization failure handling, or listener behavior
- `@Cacheable` plus `@Transactional` interaction
- choosing between `@RedisHash`, Spring Cache, and `RedisTemplate`

## Route To `logging-master`

When the main concern is:
- MDC or trace context lost across async boundaries
- `CompletableFuture` / executor work missing request or correlation propagation

## Route To `java-architect`

When the main concern is:
- reactive vs blocking execution-model choice
- WebFlux concurrency limits, backpressure, or scheduler ownership
- blocking work placed on event-loop or reactive worker threads

## Route To `keycloak-master`

When the main concern is:
- JWT role mapping
- resource-server configuration
- method-security behavior
- IDOR and subject/path authorization rules
