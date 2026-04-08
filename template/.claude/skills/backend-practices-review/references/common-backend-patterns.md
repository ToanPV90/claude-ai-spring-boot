# Common Backend Patterns

Practical patterns for recurring backend concerns that cross-cut other references.

## Error Handling Strategy

### Layered Exception Hierarchy

```java
// Base domain exception
public abstract class DomainException extends RuntimeException {
    private final String errorCode;

    protected DomainException(String errorCode, String message) {
        super(message);
        this.errorCode = errorCode;
    }

    public String getErrorCode() { return errorCode; }
}

// Specific exceptions carry structured data
public class ResourceNotFoundException extends DomainException {
    private final String resourceType;
    private final Object resourceId;

    public ResourceNotFoundException(String resourceType, Object resourceId) {
        super("NOT_FOUND", "%s with id '%s' not found".formatted(resourceType, resourceId));
        this.resourceType = resourceType;
        this.resourceId = resourceId;
    }

    public String getResourceType() { return resourceType; }
    public Object getResourceId() { return resourceId; }
}

public class BusinessRuleException extends DomainException {
    public BusinessRuleException(String ruleCode, String message) {
        super(ruleCode, message);
    }
}

public class DuplicateResourceException extends DomainException {
    public DuplicateResourceException(String resourceType, String field, String value) {
        super("DUPLICATE", "%s with %s '%s' already exists".formatted(resourceType, field, value));
    }
}
```

### Centralized ProblemDetail Handler

```java
@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    @ExceptionHandler(ResourceNotFoundException.class)
    public ProblemDetail handleNotFound(ResourceNotFoundException ex) {
        ProblemDetail problem = ProblemDetail.forStatusAndDetail(HttpStatus.NOT_FOUND, ex.getMessage());
        problem.setTitle("Resource Not Found");
        problem.setProperty("errorCode", ex.getErrorCode());
        return problem;
    }

    @ExceptionHandler(BusinessRuleException.class)
    public ProblemDetail handleBusinessRule(BusinessRuleException ex) {
        ProblemDetail problem = ProblemDetail.forStatusAndDetail(HttpStatus.CONFLICT, ex.getMessage());
        problem.setTitle("Business Rule Violation");
        problem.setProperty("errorCode", ex.getErrorCode());
        return problem;
    }

    @ExceptionHandler(DuplicateResourceException.class)
    public ProblemDetail handleDuplicate(DuplicateResourceException ex) {
        return ProblemDetail.forStatusAndDetail(HttpStatus.CONFLICT, ex.getMessage());
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ProblemDetail handleValidation(MethodArgumentNotValidException ex) {
        ProblemDetail problem = ProblemDetail.forStatusAndDetail(HttpStatus.BAD_REQUEST, "Validation failed");
        problem.setTitle("Validation Error");
        var errors = ex.getBindingResult().getFieldErrors().stream()
            .map(e -> Map.of("field", e.getField(), "message", e.getDefaultMessage()))
            .toList();
        problem.setProperty("errors", errors);
        return problem;
    }

    @ExceptionHandler(AccessDeniedException.class)
    public ProblemDetail handleAccessDenied(AccessDeniedException ex) {
        return ProblemDetail.forStatusAndDetail(HttpStatus.FORBIDDEN, "Access denied");
    }

    @ExceptionHandler(Exception.class)
    public ProblemDetail handleUnexpected(Exception ex) {
        log.error("Unexpected error", ex);
        return ProblemDetail.forStatusAndDetail(
            HttpStatus.INTERNAL_SERVER_ERROR, "An unexpected error occurred");
    }
}
```

## Pagination and Bulk Read Safety

### Always Bound Page Size

```java
@RestController
@RequestMapping("/api/v1/products")
public class ProductController {

    private final ProductService productService;

    public ProductController(ProductService productService) {
        this.productService = productService;
    }

    @GetMapping
    public Page<ProductResponse> list(
            @RequestParam(defaultValue = "0") @Min(0) int page,
            @RequestParam(defaultValue = "20") @Min(1) @Max(100) int size,
            @RequestParam(defaultValue = "createdAt") String sortBy,
            @RequestParam(defaultValue = "DESC") Sort.Direction direction) {

        Pageable pageable = PageRequest.of(page, size, Sort.by(direction, sortBy));
        return productService.findAll(pageable);
    }
}
```

### Cursor-Based Pagination for Large Datasets

```java
// When offset pagination becomes slow on large tables
public interface OrderRepository extends JpaRepository<Order, Long> {

    @Query("""
        SELECT o FROM Order o
        WHERE o.createdAt < :cursor
        ORDER BY o.createdAt DESC
        """)
    List<Order> findNextPage(@Param("cursor") Instant cursor, Pageable pageable);
}

@Service
public class OrderServiceImpl implements OrderService {

    @Override
    @Transactional(readOnly = true)
    public CursorPage<OrderResponse> findOrders(Instant cursor, int size) {
        Instant effectiveCursor = cursor != null ? cursor : Instant.now();
        List<Order> orders = orderRepository.findNextPage(
            effectiveCursor, PageRequest.of(0, size + 1));

        boolean hasNext = orders.size() > size;
        List<Order> page = hasNext ? orders.subList(0, size) : orders;

        Instant nextCursor = page.isEmpty() ? null : page.getLast().getCreatedAt();
        return new CursorPage<>(
            page.stream().map(OrderResponse::from).toList(),
            nextCursor,
            hasNext
        );
    }
}

public record CursorPage<T>(List<T> items, Instant nextCursor, boolean hasNext) {}
```

## Caching Strategy

### Cache Reads, Invalidate on Writes

```java
@Service
public class ProductServiceImpl implements ProductService {

    private final ProductRepository productRepository;

    public ProductServiceImpl(ProductRepository productRepository) {
        this.productRepository = productRepository;
    }

    @Override
    @Cacheable(value = "products", key = "#id")
    @Transactional(readOnly = true)
    public ProductResponse findById(Long id) {
        return productRepository.findById(id)
            .map(ProductResponse::from)
            .orElseThrow(() -> new ResourceNotFoundException("Product", id));
    }

    @Override
    @CacheEvict(value = "products", key = "#id")
    @Transactional
    public ProductResponse update(Long id, UpdateProductRequest request) {
        Product product = productRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Product", id));
        product.updateFrom(request);
        return ProductResponse.from(product);
    }

    @Override
    @CacheEvict(value = "products", key = "#id")
    @Transactional
    public void delete(Long id) {
        productRepository.deleteById(id);
    }
}
```

### Cache Configuration

```java
@Configuration
@EnableCaching
public class CacheConfig {

    @Bean
    public CacheManager cacheManager() {
        CaffeineCacheManager manager = new CaffeineCacheManager();
        manager.setCaffeine(Caffeine.newBuilder()
            .maximumSize(1000)
            .expireAfterWrite(Duration.ofMinutes(10))
            .recordStats());
        return manager;
    }
}
```

### What NOT to Cache

| Scenario | Cache? | Why |
|----------|--------|-----|
| Frequently read, rarely updated | ✅ | High hit rate, low invalidation |
| User-specific data (profiles) | ⚠️ | Only with user-scoped key and short TTL |
| Rapidly changing data (stock) | ❌ | Stale data causes business errors |
| Write-heavy entities | ❌ | Constant invalidation negates benefit |
| Security-sensitive data | ❌ | Stale auth/permissions are dangerous |

## Rate Limiting

### Simple In-Memory Rate Limiter

```java
@Component
public class RateLimitInterceptor implements HandlerInterceptor {

    private final Map<String, Bucket> buckets = new ConcurrentHashMap<>();

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response,
                             Object handler) throws Exception {
        String clientId = resolveClientId(request);
        Bucket bucket = buckets.computeIfAbsent(clientId, this::createBucket);

        if (bucket.tryConsume(1)) {
            return true;
        }

        response.setStatus(HttpStatus.TOO_MANY_REQUESTS.value());
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.getWriter().write("""
            {"title":"Too Many Requests","status":429,"detail":"Rate limit exceeded"}
            """);
        return false;
    }

    private Bucket createBucket(String key) {
        return Bucket.builder()
            .addLimit(Bandwidth.classic(100, Refill.intervally(100, Duration.ofMinutes(1))))
            .build();
    }

    private String resolveClientId(HttpServletRequest request) {
        String apiKey = request.getHeader("X-API-Key");
        return apiKey != null ? apiKey : request.getRemoteAddr();
    }
}
```

## Connection Pool Tuning

### HikariCP Defaults That Matter

```yaml
spring:
  datasource:
    hikari:
      maximum-pool-size: 10          # match your app's concurrency, not "as many as possible"
      minimum-idle: 5
      idle-timeout: 300000           # 5 minutes
      max-lifetime: 1800000          # 30 minutes — must be less than DB's wait_timeout
      connection-timeout: 30000      # 30 seconds to get a connection from pool
      leak-detection-threshold: 60000 # warn if connection held > 60 seconds
```

### Pool Sizing Rule of Thumb

```
optimal_pool_size = (core_count * 2) + effective_spindle_count
```

For most Spring Boot apps with 4 cores and SSD: **10 connections** is a good starting point. More connections does not mean more throughput — it means more contention.

## Async Processing Safety

### @Async Must Have a Thread Pool

```java
// BAD: @Async without configured executor — uses SimpleAsyncTaskExecutor (no pool, unlimited threads)
@Async
public void processReport(Long reportId) { ... }

// GOOD: explicit thread pool
@Configuration
@EnableAsync
public class AsyncConfig {

    @Bean("reportExecutor")
    public TaskExecutor reportExecutor() {
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
        executor.setCorePoolSize(5);
        executor.setMaxPoolSize(10);
        executor.setQueueCapacity(100);
        executor.setThreadNamePrefix("report-");
        executor.setRejectedExecutionHandler(new ThreadPoolExecutor.CallerRunsPolicy());
        executor.setWaitForTasksToCompleteOnShutdown(true);
        executor.setAwaitTerminationSeconds(30);
        return executor;
    }
}

@Async("reportExecutor")
public void processReport(Long reportId) { ... }
```

### @Async Limitations

| Limitation | Impact |
|-----------|--------|
| Self-invocation bypasses proxy | Same as `@Transactional` — must call from another bean |
| No persistence | App restart or OOM loses queued work |
| No retry built-in | Failures are silent unless you add error handling |
| `SecurityContext` not propagated | Must configure `DelegatingSecurityContextAsyncTaskExecutor` |

For critical async work, prefer a persistent job queue (database outbox, Kafka) over `@Async`.

## API Versioning

### URI Path Versioning (Preferred for Simplicity)

```java
@RestController
@RequestMapping("/api/v1/orders")
public class OrderControllerV1 { ... }

@RestController
@RequestMapping("/api/v2/orders")
public class OrderControllerV2 { ... }
```

### Backward Compatibility Rules

- Adding a new optional field to a response is safe
- Adding a new required field to a request is a breaking change
- Removing or renaming a field is a breaking change
- Changing a field type is a breaking change
- Changing error response structure is a breaking change

## Quick Checklist

| Practice | Status | Notes |
|----------|--------|-------|
| Exceptions mapped to stable HTTP responses | | ProblemDetail or consistent error shape |
| Page size bounded | | Max 100, default 20 |
| External calls have timeouts | | Connect + read timeout explicitly set |
| Cache invalidated on writes | | `@CacheEvict` on mutations |
| Async work uses bounded thread pool | | Never default `SimpleAsyncTaskExecutor` |
| Connection pool sized deliberately | | Not maxed out "just in case" |
| Rate limiting on public endpoints | | Prevent abuse and thundering herds |
| API versioned | | Breaking changes go to new version |
