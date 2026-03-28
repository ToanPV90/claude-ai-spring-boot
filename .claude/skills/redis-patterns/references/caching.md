# Caching Reference

## RedisCacheConfiguration — Full Configuration

```java
@Configuration
@EnableCaching
public class CacheConfig {

    private static final Duration DEFAULT_TTL = Duration.ofMinutes(10);

    @Bean
    public RedisCacheConfiguration defaultCacheConfig() {
        return RedisCacheConfiguration.defaultCacheConfig()
            .entryTtl(DEFAULT_TTL)
            .disableCachingNullValues()
            .serializeKeysWith(RedisSerializationContext.SerializationPair
                .fromSerializer(new StringRedisSerializer()))
            .serializeValuesWith(RedisSerializationContext.SerializationPair
                .fromSerializer(new GenericJackson2JsonRedisSerializer()));
    }

    @Bean
    public RedisCacheManagerBuilderCustomizer redisCacheManagerBuilderCustomizer(
        RedisCacheConfiguration defaultCacheConfig
    ) {
        return builder -> builder
            .withCacheConfiguration("products",
                defaultCacheConfig.entryTtl(Duration.ofMinutes(10)))
            .withCacheConfiguration("users",
                defaultCacheConfig.entryTtl(Duration.ofMinutes(5)))
            .withCacheConfiguration("sessions",
                defaultCacheConfig.entryTtl(Duration.ofMinutes(30)));
    }

    @Bean
    public CacheManager cacheManager(
        RedisConnectionFactory redisConnectionFactory,
        RedisCacheConfiguration defaultCacheConfig
    ) {
        return RedisCacheManager.builder(redisConnectionFactory)
            .cacheDefaults(defaultCacheConfig)
            .build();
    }
}
```

## Safe Serialization Defaults

- Do **not** enable permissive Jackson default typing for Redis cache values.
- Prefer `GenericJackson2JsonRedisSerializer()` when cache values stay simple and controlled.
- Prefer typed serializers or dedicated caches per value type when the cache shape is known in advance.
- Treat cache payloads as untrusted input when they can survive deploys, version changes, or shared-environment access.

## @Cacheable Patterns

### Basic Read Cache

```java
@Service
public class ProductService {

    private final ProductRepository productRepository;

    public ProductService(ProductRepository productRepository) {
        this.productRepository = productRepository;
    }

    @Cacheable(value = "products", key = "#id")
    public ProductResponse findById(UUID id) {
        return productRepository.findById(id)
            .map(ProductResponse::from)
            .orElseThrow(() -> new ProductNotFoundException(id));
    }
}
```

### Conditional Cache

```java
// condition: evaluated BEFORE method call (SpEL on arguments)
// unless:    evaluated AFTER method call (SpEL on #result)
@Cacheable(
    value = "products",
    key = "#id",
    condition = "#id != null",
    unless = "#result == null"
)
public ProductResponse findById(UUID id) { ... }
```

### @CachePut vs @Cacheable

| Annotation | Executes Method | Updates Cache | Use Case |
|---|---|---|---|
| `@Cacheable` | Only on cache miss | On cache miss | Read operations |
| `@CachePut` | Always | Always | Write-through on create/update |

```java
// Write-through: always populate cache after write
@CachePut(value = "products", key = "#result.id()", unless = "#result == null")
@Transactional
public ProductResponse create(CreateProductRequest request) {
    Product product = new Product(request.name(), request.price());
    return ProductResponse.from(productRepository.save(product));
}
```

### @CacheEvict

```java
// Evict single entry on update
@CacheEvict(value = "products", key = "#id")
@Transactional
public ProductResponse update(UUID id, UpdateProductRequest request) { ... }

// Evict all entries on bulk operation
@CacheEvict(value = "products", allEntries = true)
@Transactional
public void importProducts(List<CreateProductRequest> requests) { ... }
```

### @Caching — Compound Operations

```java
// Populate one cache, evict from another, in one annotation
@Caching(
    put  = { @CachePut(value = "products", key = "#result.id()") },
    evict = { @CacheEvict(value = "product-lists", allEntries = true) }
)
@Transactional
public ProductResponse create(CreateProductRequest request) { ... }
```

## Custom KeyGenerator

When SpEL keys become repetitive or need cross-cutting logic:

```java
@Configuration
public class CacheKeyConfig {

    @Bean("compositeKeyGenerator")
    public KeyGenerator compositeKeyGenerator() {
        return (target, method, params) -> {
            String className = target.getClass().getSimpleName();
            String methodName = method.getName();
            String args = Arrays.stream(params)
                .map(Object::toString)
                .collect(Collectors.joining(":"));
            return className + ":" + methodName + ":" + args;
            // e.g. "ProductService:findById:123e4567-e89b-12d3-a456-426614174000"
        };
    }
}

// Usage
@Cacheable(value = "products", keyGenerator = "compositeKeyGenerator")
public ProductResponse findById(UUID id) { ... }
```

Prefer SpEL `key = "#id"` for simple cases. Use a custom `KeyGenerator` when you need class/method context in the key or share key logic across multiple methods.

## Cache Stampede (Thundering Herd)

**Problem:** When a popular cache entry expires, many concurrent requests simultaneously miss the cache, all query the database, and race to repopulate the same key.

**Mitigation with distributed lock:**

Prefer the dedicated `RedisDistributedLock` pattern from `references/data-structures.md` so lock ownership is token-based and safe to release.

```java
@Service
public class ProductService {

    private final ProductRepository productRepository;
    private final RedisTemplate<String, Object> redisTemplate;
    private final RedisDistributedLock distributedLock;
    private static final Duration LOCK_TTL = Duration.ofSeconds(5);

    public ProductService(
        ProductRepository productRepository,
        RedisTemplate<String, Object> redisTemplate,
        RedisDistributedLock distributedLock
    ) {
        this.productRepository = productRepository;
        this.redisTemplate = redisTemplate;
        this.distributedLock = distributedLock;
    }

    public ProductResponse findByIdWithStampedeProtection(UUID id) {
        String cacheKey = "products:" + id;
        String lockKey  = "lock:products:" + id;

        // 1. Try cache first
        Object cached = redisTemplate.opsForValue().get(cacheKey);
        if (cached != null) {
            return (ProductResponse) cached;
        }

        // 2. Acquire lock — only one thread rebuilds the cache
        Optional<String> token = distributedLock.tryLock(lockKey, LOCK_TTL);

        if (token.isPresent()) {
            try {
                ProductResponse response = productRepository.findById(id)
                    .map(ProductResponse::from)
                    .orElseThrow(() -> new ProductNotFoundException(id));
                redisTemplate.opsForValue().set(cacheKey, response, Duration.ofMinutes(10));
                return response;
            } finally {
                distributedLock.unlock(lockKey, token.get());
            }
        }

        // 3. Another thread holds the lock — brief wait then re-check cache
        try { Thread.sleep(50); } catch (InterruptedException e) { Thread.currentThread().interrupt(); }
        cached = redisTemplate.opsForValue().get(cacheKey);
        if (cached != null) {
            return (ProductResponse) cached;
        }
        // Fallback: read from DB directly if cache still empty after lock window
        return productRepository.findById(id)
            .map(ProductResponse::from)
            .orElseThrow(() -> new ProductNotFoundException(id));
    }
}
```

For high-traffic scenarios consider **probabilistic early expiration (PER)**: re-compute cache slightly before actual expiry with increasing probability as expiry approaches.

Do not recreate an ad-hoc lock with `setIfAbsent(..., "1", ttl)` plus `delete(...)`; that pattern can release another caller's lock and drifts away from the safer token-based lock shown in `references/data-structures.md`.

## Cache-aside vs Write-through

| Aspect | Cache-aside | Write-through |
|---|---|---|
| Who manages cache | Application | Application (explicit `@CachePut`) |
| Cache population | On first read (lazy) | On every write (eager) |
| Consistency | Eventual (TTL-bounded staleness) | Strong (cache updated atomically with write) |
| Best for | Complex reads, JOINs, aggregations | Simple entities with predictable access |
| Risk | Cache stampede on cold start | Write amplification (cache populated for data never read) |

**Cache-aside** wins when reads involve multi-table JOINs, computed aggregates, or expensive transformations. **Write-through** wins for simple entity CRUD where almost every write is followed by a read.

## @Cacheable and @Transactional Interaction

**Problem:** Spring AOP applies `@Cacheable` **before** `@Transactional`. On a write method, the cache is populated from the return value **before the transaction commits**. If the transaction rolls back, the cache now holds data that was never persisted.

**Wrong:**
```java
// BAD — cache populated before commit
@Cacheable(value = "products", key = "#id")
@Transactional
public ProductResponse update(UUID id, UpdateProductRequest request) { ... }
```

**Correct pattern:**
```java
// Write method: transactional + evict (no cache population here)
@CacheEvict(value = "products", key = "#id")
@Transactional
public ProductResponse update(UUID id, UpdateProductRequest request) {
    // ... update logic
}

// Read method: cacheable, non-transactional (or readOnly)
@Cacheable(value = "products", key = "#id", unless = "#result == null")
@Transactional(readOnly = true)
public ProductResponse findById(UUID id) { ... }
```

The read method is called **after** the write transaction has committed, so the cache is always populated with committed data.

## Gotchas

- Derive per-cache TTL configs from the already-customized `RedisCacheConfiguration` bean; rebuilding from `defaultCacheConfig()` can silently revert serializer choices.
- Token-based distributed locks matter even in cache-stampede protection; `setIfAbsent(..., "1", ttl)` plus `delete(...)` can release another caller's lock.
- `@Cacheable` on write paths can populate cache entries before the transaction commits; prefer transactional writes plus eviction or post-commit reads.
