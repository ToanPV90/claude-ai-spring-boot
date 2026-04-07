# Performance Optimization Gotchas & Anti-Patterns

## Measurement Anti-Patterns

- **Optimizing without a baseline.** If you can't show before/after numbers, you can't prove the change helped — and it may have made things worse.
- **Measuring in dev with tiny data sets.** N+1 is invisible with 3 rows. Test with production-scale data or realistic volume.
- **Using `System.nanoTime()` logging instead of Micrometer timers.** Ad-hoc timing is discarded after debugging; Micrometer timers persist as observable metrics.
- **Profiling with `hibernate.generate_statistics` in production.** It adds overhead; enable temporarily during profiling only.

## JPA Anti-Patterns

- **`JOIN FETCH` + `Pageable`** — Hibernate fetches ALL rows then paginates in memory. Use a two-step ID-first query.
- **`@Cacheable` on a method called from the same bean** — bypasses the Spring proxy; the cache is never consulted.
- **`GenerationType.IDENTITY` with batch inserts** — disables Hibernate batching entirely because each insert must return the generated ID.
- **Eager fetching (`FetchType.EAGER`) on collections** — loads the full graph for every query, even when the collection is never accessed.

## Connection Pool Anti-Patterns

- **Increasing `maximumPoolSize` to fix slow queries** — moves the bottleneck to the database; fix the queries first.
- **No `leak-detection-threshold`** — connection leaks silently exhaust the pool with no diagnostic information.
- **Ignoring `max-lifetime`** — database or firewall closes stale connections, causing intermittent errors.

## Caching Anti-Patterns

- **Caching write-heavy data without invalidation** — stale reads cause correctness bugs that are harder to debug than slowness.
- **No TTL on cache entries** — memory grows unbounded; stale data lives forever.
- **Unbounded metric tags** (user IDs, request paths) — causes cardinality explosion in Micrometer/Prometheus.

## Common Rationalizations to Reject

| Rationalization | Why It's Wrong |
|----------------|---------------|
| "It's fast enough on my machine" | Dev machines hide N+1, pool exhaustion, and GC under low concurrency |
| "We'll add caching everywhere" | Caching without measurement creates stale-data bugs for unproven gains |
| "Just increase the pool size" | More connections without fixing queries multiplies DB load |
| "Async will make it faster" | `@Async` only helps if the caller doesn't need the result; otherwise it adds complexity for zero gain |
| "We don't need pagination yet" | Unbounded queries work until they don't — one large dataset takes down the service |
