---
name: redis-patterns
description: Implementation guidance for Spring Data Redis caching, RedisTemplate usage, rate limiting, pub/sub, TTL strategy, and Redis-backed coordination in Spring Boot systems. Use when building or modifying Redis-based cache, key-value, locking, pub/sub, or rate-limiting behavior after the surrounding application boundaries are already decided.
license: MIT
metadata:
  author: local
  version: "1.1.0"
  domain: caching
  triggers:
    - redis
    - cache
    - "@Cacheable"
    - "@CacheEvict"
    - "@CachePut"
    - RedisTemplate
    - distributed cache
    - pub/sub
    - rate limiting
    - distributed lock
    - cache TTL
    - cache stampede
    - Spring Cache
    - Lettuce
  role: specialist
  scope: implementation
  output-format: code + guidance
  related-skills: spring-boot-engineer, tdd-guide, spring-boot-patterns, java-code-review
---

# Redis Patterns

Decision guide for implementing Redis-backed caching and coordination without drifting into generic Spring scaffolding, review-only work, or unrelated infrastructure design.

## When to Use
- The task is to add or modify Redis-backed caching, key-value storage, pub/sub, distributed locking, or rate limiting in a Spring Boot application
- You need to choose between `@Cacheable`, `RedisTemplate`, Redis data structures, or TTL-based cache behavior
- Cache invalidation, serializer choice, cache stampede prevention, or Redis-focused testing behavior is unclear
- The user expects working Spring Data Redis code plus the configuration or tests needed to support it

## When Not to Use
- The main task is general Spring Boot feature scaffolding outside Redis behavior — use `spring-boot-engineer`
- The main task is controller/service/repository ownership or application layering — use `spring-boot-patterns`
- The task is primarily review or audit of existing code — use `java-code-review`
- The question is mostly TDD workflow rather than Redis implementation details — use `tdd-guide`

## Reference Guide

| Topic | Reference | Load When |
|------|-----------|-----------|
| `@Cacheable`, `@CacheEvict`, TTLs, multi-cache strategy, cache-aside | `references/caching.md` | Implementing cache-backed service methods or cache invalidation rules |
| RedisTemplate, sorted sets, distributed locks, pub/sub, counters | `references/data-structures.md` | Working directly with Redis operations or non-cache Redis features |
| Testcontainers Redis, `@DataRedisTest`, TTL/cache behavior tests | `references/testing.md` | Writing or fixing Redis-specific tests |

## Symptom Triage

| Symptom | Default Check | Likely Fix |
|--------|---------------|------------|
| Cache never invalidates | Is there no TTL or eviction on writes? | Add explicit TTL and `@CacheEvict` on the write path |
| Values fail to deserialize after deployment | Is the default Java serializer in use? | Switch to `GenericJackson2JsonRedisSerializer` |
| Cache returns stale data after update | Is cache-aside incomplete or writes not evicting? | Evict or refresh cache on the owning write operation |
| Tests are flaky or environment-specific | Are tests using embedded Redis or shared state? | Use Testcontainers Redis and flush state per test |
| Rate limiting or locking behaves inconsistently | Are the right Redis data structures/expiry semantics missing? | Use the dedicated RedisTemplate/data-structure patterns |

## Cache Decision Ladder

1. **Do you need Redis or just in-memory caching?** Stay here only when Redis-backed behavior is required.
2. **Are you caching service reads?** Start with cache-aside using `@Cacheable` and explicit eviction on writes.
3. **Do values need to survive rolling deployments safely?** Use JSON serialization, not JDK serialization.
4. **Do you need counters, locks, pub/sub, or rate limits?** Move from annotations to `RedisTemplate` and Redis data structures.
5. **Are tests failing because of timing or shared state?** Use Testcontainers Redis and deterministic cache/TTL assertions.

## Quick Mapping

| Situation | Default Move | Prefer Instead Of |
|-----------|--------------|-------------------|
| Cache service read result | `@Cacheable(..., unless = "#result == null")` | Hand-rolled cache maps |
| Invalidate on write | `@CacheEvict` or explicit cache update | Leaving stale values until TTL expires |
| Store typed Redis values | `GenericJackson2JsonRedisSerializer` | `JdkSerializationRedisSerializer` |
| Need direct Redis operations | `RedisTemplate` with typed serializers | Forcing everything through cache annotations |
| Redis integration tests | Testcontainers Redis + state reset | Abandoned embedded Redis libraries |

## Constraints

### MUST DO

| Rule | Preferred Pattern |
|------|-------------------|
| Set TTL for every cache | `entryTtl(...)` in `RedisCacheConfiguration` |
| Use stable JSON serialization for values | `GenericJackson2JsonRedisSerializer` |
| Avoid caching null results by default | `unless = "#result == null"` |
| Evict or refresh cache on writes | `@CacheEvict` on the owning update/delete path |
| Test Redis behavior with real Redis | Testcontainers Redis or `@DataRedisTest` with real container backing |

### MUST NOT DO
- Do not use `JdkSerializationRedisSerializer` for application values
- Do not leave Redis cache entries unbounded with no TTL
- Do not use abandoned `embedded-redis` libraries on modern Java
- Do not put `@Cacheable` on write-oriented transactional methods expecting post-commit safety
- Do not treat RedisTemplate string coercion as safe for non-string payloads

## Gotchas

- Redis makes stale data easy to introduce if cache invalidation and ownership are implicit.
- Serializer defaults look harmless until deployments roll and old bytes can no longer be read.
- `@Cacheable` is convenient for reads, but coordination patterns like locks and rate limits need explicit Redis operations.
- TTL tests should shorten TTL in test config, not mutate production defaults.
- Redis tests must isolate state aggressively or one test bleeds into the next.

## Minimal Examples

### Cache-backed read
```java
@Cacheable(value = "products", key = "#id", unless = "#result == null")
public ProductResponse findById(UUID id) {
    return repository.findById(id).map(ProductResponse::from).orElse(null);
}
```

### Evict on write
```java
@Transactional
@CacheEvict(value = "products", key = "#id")
public ProductResponse update(UUID id, UpdateProductRequest request) {
    Product saved = repository.save(applyUpdate(id, request));
    return ProductResponse.from(saved);
}
```

## What to Verify
- TTL, serializer choice, and cache invalidation rules match the intended production behavior
- RedisTemplate/data-structure code uses the right serializer and expiry semantics
- Tests prove cache hit, miss, eviction, and TTL behavior deterministically
- Redis guidance stays here while general Spring scaffolding and review work stay routed outward
- The chosen Redis approach matches the problem: cache, coordination, pub/sub, or rate limiting

## See References
- `references/caching.md` for cache-aside, TTL, and Spring Cache patterns
- `references/data-structures.md` for RedisTemplate, locks, pub/sub, and sorted-set/rate-limit patterns
- `references/testing.md` for Testcontainers Redis, `@DataRedisTest`, and deterministic cache/TTL tests
