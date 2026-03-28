# Concurrency Review

Treat concurrency as a correctness and production-safety review area, not a style or micro-optimization topic.

## Critical Risks To Check First

- shared mutable state accessed by multiple threads without a clear safety mechanism
- check-then-act sequences (`if (!map.containsKey()) { map.put(...) }`) on shared state
- stale visibility from missing `volatile`, atomics, or proper synchronization
- lock acquisition without release in `finally`
- blocking calls or I/O inside synchronized sections or virtual-thread pinned paths
- swallowing `InterruptedException` or clearing the interrupt without restoring/canceling work
- executor creation with no shutdown/ownership model or with unbounded queue growth hidden behind defaults
- `ThreadLocal` values set in pooled threads without `remove()` in a `finally` block

## Shared State and Publication

Review for:
- mutable fields on singleton services/components used across requests
- non-thread-safe collections mutated from async callbacks or scheduled tasks
- lazy initialization that is not safely published
- compound operations on concurrent collections that still race

Prefer:
- immutable state where possible
- request-local data over shared fields
- `ConcurrentHashMap#computeIfAbsent`, atomics, or explicit locks when shared state is unavoidable
- constructor-time initialization instead of ad hoc lazy state
- stable lock ordering when multiple locks/resources must be acquired together

## Executors, Futures, and Async Boundaries

Review for:
- `Executors.newFixedThreadPool(...)`, `newCachedThreadPool()`, or `newSingleThreadExecutor()` used as an invisible sizing policy
- `CompletableFuture` chains that drop exceptions or never join back to observable behavior
- `supplyAsync` / `runAsync` using the common pool by accident for blocking work
- nested async scheduling that obscures ownership and backpressure
- `@Async` methods that assume transactions, MDC, or security context propagate automatically
- fire-and-forget tasks that outlive request/application lifecycle with no supervision
- `ThreadLocal` state or MDC set on worker threads without cleanup

Prefer:
- named, bounded executors with explicit ownership
- `ThreadPoolExecutor` / `ThreadPoolTaskExecutor` with explicit queue and thread limits instead of `Executors` shortcuts
- observable completion paths (`handle`, `whenComplete`, propagated failure)
- explicit context propagation when MDC or security data matters
- `try/finally` with `threadLocal.remove()` whenever thread-local state is set manually
- routing reactive/async model questions to the owning specialist skill when the review leaves plain Java territory

## Locks, Atomics, and Coordination

Review for:
- `synchronized` on broad methods where contention or pinning matters
- `ReentrantLock` usage without timeout or `finally` release
- atomics used for multi-step invariants they cannot protect alone
- home-grown coordination that duplicates `java.util.concurrent` primitives poorly

Prefer:
- the narrowest lock scope possible
- `try/finally` for every explicit lock acquisition
- higher-level primitives (`Semaphore`, `CountDownLatch`, `ConcurrentHashMap`, `BlockingQueue`) when they match the problem
- a consistent lock acquisition order when multiple locks are unavoidable

## Interruption and Cancellation

Review for:
- `catch (InterruptedException e) {}`
- retry loops that ignore thread interruption
- cancellation tokens/futures that do not stop underlying work
- scheduled or background jobs that cannot shut down cleanly

Prefer:
- restore interrupt status with `Thread.currentThread().interrupt()` when rethrowing is not possible
- clear shutdown and cancellation paths
- `ScheduledExecutorService` / Spring scheduling infrastructure instead of `Timer`
- test coverage for timeout/cancellation-sensitive flows when the diff introduces them

## Non-Thread-Safe Standard Library Traps

Review for:
- shared `SimpleDateFormat` instances
- shared `Random` instances in contended code paths
- mutable `Date` / `Calendar` values passed around as if they were immutable

Prefer:
- `DateTimeFormatter` from `java.time`
- `ThreadLocalRandom.current()` or `SplittableRandom` where appropriate
- `Instant`, `LocalDate`, `OffsetDateTime`, or `ZonedDateTime` instead of mutable legacy date/time types

## Spring-Specific Concurrency Review

Review for:
- singleton beans holding mutable request-specific state
- `@Async` methods assuming `@Transactional` behavior or lazy JPA access still works across threads
- blocking calls inside WebFlux / reactive paths
- scheduled jobs sharing mutable caches/maps with request handlers

Route outward when needed:
- WebFlux/reactive execution model depth → `java-architect`
- Kafka listener concurrency, ack, or consumer-thread semantics → `kafka-patterns`
- Redis distributed locking or rate-limiting correctness → `redis-patterns`
- JPA locking / optimistic-lock semantics → `jpa-patterns`

## High-Signal Finding Shapes

- `InventoryService` stores request-specific state in a singleton field, so concurrent requests can overwrite each other and return the wrong reservation result.`
- `The `CompletableFuture` chain logs failures but never propagates them, so callers observe success while background work silently fails.`
- `This loop swallows `InterruptedException`, which prevents shutdown/cancellation from stopping the worker thread cleanly.`
- `The `containsKey` + `put` pair still races on shared state; use an atomic map operation or explicit coordination instead.`
