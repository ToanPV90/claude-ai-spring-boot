---
name: redis-patterns
description: >
  Spring Data Redis patterns for Java Spring Boot — @Cacheable, @CacheEvict,
  @CachePut, RedisTemplate, distributed cache, Redis pub/sub, cache TTL,
  cache stampede prevention, cache-aside pattern, write-through, ZSetOperations
  for rate limiting, distributed lock, TestContainers Redis, @DataRedisTest,
  Spring Cache with RedisCacheManager, GenericJackson2JsonRedisSerializer,
  Lettuce client configuration, @RedisHash, sliding window rate limiting.
license: MIT
metadata:
  author: local
  version: "1.0.0"
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
  output-format: code
  related-skills: spring-boot-engineer, tdd-guide, spring-boot-patterns
---

# Redis Patterns

## Reference Guide

| Topic | Reference | Load When |
|---|---|---|
| Caching | references/caching.md | @Cacheable/@CacheEvict, TTL, multiple caches, cache-aside |
| Data Structures | references/data-structures.md | RedisTemplate, sorted sets, distributed lock, pub/sub |
| Testing | references/testing.md | TestContainers Redis, @DataRedisTest, cache behavior tests |

## Quick Start

**Dependency:**
`spring-boot-starter-data-redis` (pulls Lettuce 6.x — no extra pool config needed)

**Configuration (`application.yml`):**
```yaml
spring:
  data:
    redis:
      host: localhost
      port: 6379
      password: ${REDIS_PASSWORD:}
      ssl:
        enabled: false
  cache:
    type: redis
    redis:
      time-to-live: 10m
```

**Enable Caching:** `@EnableCaching` on a `@Configuration` class.

**Minimal Cache Config:**
```java
@Configuration
@EnableCaching
public class CacheConfig {
    @Bean
    public RedisCacheConfiguration defaultCacheConfig() {
        return RedisCacheConfiguration.defaultCacheConfig()
            .entryTtl(Duration.ofMinutes(10))
            .disableCachingNullValues()
            .serializeKeysWith(RedisSerializationContext.SerializationPair
                .fromSerializer(new StringRedisSerializer()))
            .serializeValuesWith(RedisSerializationContext.SerializationPair
                .fromSerializer(new GenericJackson2JsonRedisSerializer()));
    }
}
```

**Cache a Service Method:**
```java
@Cacheable(value = "products", key = "#id", unless = "#result == null")
public ProductResponse findById(UUID id) { ... }

@CacheEvict(value = "products", key = "#id")
@Transactional
public ProductResponse update(UUID id, UpdateProductRequest request) { ... }
```

## Key Design Decisions

- Use **Lettuce** (default) — non-blocking, thread-safe, no connection pool required
- **Always set TTL** — never allow unbounded cache entries
- Use **`GenericJackson2JsonRedisSerializer`** for values — survives rolling deployments
- Use **`StringRedisSerializer`** for keys — human-readable in Redis CLI
- Use **TestContainers Redis 7+** — do NOT use `embedded-redis` (ozimov library is abandoned, Java 17 incompatible)
- **Cache-aside pattern**: application manages cache, DB is source of truth

## Constraints

### MUST DO

| Rule | How |
|---|---|
| Set TTL on every cache | `entryTtl` in `RedisCacheConfiguration` |
| Use `GenericJackson2JsonRedisSerializer` | Survives rolling deployments |
| Add `unless="#result == null"` | Don't cache null results |
| `@CacheEvict` on writes | Prevent stale reads |
| TestContainers for integration tests | Consistent Redis 7 behavior |

### MUST NOT DO

- **`JdkSerializationRedisSerializer`** (Spring default — binary, Java-version-coupled, breaks deserialization across deployments)
- **Unbounded cache** — no TTL means memory leak under load
- **`embedded-redis` library** (ozimov/embedded-redis — abandoned, incompatible with Java 17+)
- **`@Cacheable` on `@Transactional` method** — cache is populated before commit; use `@CacheEvict` on the write method instead
- **`StringRedisTemplate` for non-String values** — silently calls `.toString()`, loses type information
