# Caching Reference

## RedisCacheConfiguration — Full Configuration

```java
@Configuration
@EnableCaching
public class CacheConfig {

    private static final Duration DEFAULT_TTL = Duration.ofMinutes(10);

    @Bean
    public RedisCacheConfiguration defaultCacheConfig() {
        ObjectMapper objectMapper = new ObjectMapper()
            .findAndRegisterModules()
            .activateDefaultTyping(
                LaissezFaireSubTypeValidator.instance,
                ObjectMapper.DefaultTyping.NON_FINAL
            );

        return RedisCacheConfiguration.defaultCacheConfig()
            .entryTtl(DEFAULT_TTL)
            .disableCachingNullValues()
            .serializeKeysWith(RedisSerializationContext.SerializationPair
                .fromSerializer(new StringRedisSerializer()))
            .serializeValuesWith(RedisSerializationContext.SerializationPair
                .fromSerializer(new GenericJackson2JsonRedisSerializer(objectMapper)));
    }

    @Bean
    public RedisCacheManagerBuilderCustomizer redisCacheManagerBuilderCustomizer() {
        return builder -> builder
            .withCacheConfiguration("products",
                RedisCacheConfiguration.defaultCacheConfig()
                    .entryTtl(Duration.ofMinutes(10)))
            .withCacheConfiguration("users",
                RedisCacheConfiguration.defaultCacheConfig()
                    .entryTtl(Duration.ofMinutes(5)))
            .withCacheConfiguration("sessions",
                RedisCacheConfiguration.defaultCacheConfig()
                    .entryTtl(Duration.ofMinutes(30)));
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

```java
@Service
public class ProductService {

    private final ProductRepository productRepository;
    private final RedisTemplate<String, Object> redisTemplate;
    private static final Duration LOCK_TTL = Duration.ofSeconds(5);

    public ProductService(
        ProductRepository productRepository,
        RedisTemplate<String, Object> redisTemplate
    ) {
        this.productRepository = productRepository;
        this.redisTemplate = redisTemplate;
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
        Boolean locked = redisTemplate.opsForValue()
            .setIfAbsent(lockKey, "1", LOCK_TTL);

        if (Boolean.TRUE.equals(locked)) {
            try {
                ProductResponse response = productRepository.findById(id)
                    .map(ProductResponse::from)
                    .orElseThrow(() -> new ProductNotFoundException(id));
                redisTemplate.opsForValue().set(cacheKey, response, Duration.ofMinutes(10));
                return response;
            } finally {
                redisTemplate.delete(lockKey);
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
