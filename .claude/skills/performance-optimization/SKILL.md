---
name: performance-optimization
description: Measurement-first performance optimization for Java/Spring Boot applications. Use when diagnosing slow endpoints, fixing N+1 queries, tuning connection pools, adding caching, or establishing performance budgets. Always measure before optimizing.
license: MIT
metadata:
  author: local
  version: "1.0.0"
  domain: backend
  triggers:
    - performance
    - slow endpoint
    - N+1 query
    - connection pool
    - caching strategy
    - pagination
    - batch processing
    - response time
    - throughput
    - JFR
    - profiling
    - performance budget
  role: guide
  scope: performance
  output-format: code + guidance
  related-skills: jpa-master, redis-master, observability-master, spring-boot-engineer, postgres-master
---

# Performance Optimization

Measurement-first performance optimization for Spring Boot 3.x applications. Every optimization follows the same loop: **baseline → identify → fix → verify → guard**.

## When to Use
- An endpoint is too slow and needs profiling before changing code
- N+1 queries, missing indexes, or eager fetching are suspected but not yet measured
- Connection pool saturation, thread starvation, or GC pressure is observed
- The task requires adding caching, pagination, batch inserts, or async offloading for performance reasons
- A performance budget (p95 latency, throughput target) needs to be established or enforced

## When Not to Use
- The task is general JPA mapping, fetch strategy, or entity relationships — use `jpa-master`
- The task is adding Redis caching for functional reasons (not performance-driven) — use `redis-master`
- The task is Actuator/Micrometer setup unrelated to performance measurement — use `observability-master`
- The task is general Spring Boot scaffolding — use `spring-boot-engineer`
- The task is PostgreSQL schema design or indexing theory — use `postgres-master`

## Version Assumptions
- Spring Boot 3.x
- Hibernate ORM 6.x (Jakarta Persistence)
- HikariCP (Spring Boot default pool)
- Micrometer 1.12+
- Java 17+ (records, JFR)

## Reference Guide

| Topic | Reference | Load When |
|-------|-----------|-----------|
| N+1 detection, @EntityGraph, JOIN FETCH, DTO projections, batch inserts | `references/jpa-performance.md` | Diagnosing or fixing JPA query performance, enabling batch writes |
| HikariCP sizing, metrics, leak detection, common pitfalls | `references/connection-pool-tuning.md` | Tuning connection pool, diagnosing pool exhaustion or leak warnings |
| Performance optimization anti-patterns and rationalizations | `references/gotchas.md` | Reviewing optimization approach for common mistakes or rejecting bad patterns |

## Measure-First Workflow

Every performance change follows this loop. Never skip the baseline step.

```
1. BASELINE   — Record current p50/p95/p99, throughput, and query count
2. IDENTIFY   — Profile with JFR, Micrometer timers, or Hibernate statistics to find the bottleneck
3. FIX        — Apply the smallest change that addresses the measured bottleneck
4. VERIFY     — Re-measure under the same conditions and compare against the baseline
5. GUARD      — Add a Micrometer timer, performance test, or SLA alert to prevent regression
```

## Symptom Triage

| Symptom | Likely Cause | Default Fix |
|---------|--------------|-------------|
| Endpoint p95 > 500ms with few rows | N+1 queries | Shape the read with `@EntityGraph`, `JOIN FETCH`, or projection |
| Endpoint slows under concurrent load | Connection pool exhaustion | Tune HikariCP `maximumPoolSize` and measure pool wait time |
| Repeated identical queries in logs | Missing caching | Add `@Cacheable` on the read path with explicit TTL |
| Endpoint returns thousands of rows | No pagination | Add `Pageable` parameter and return `Page` or `Slice` |
| Bulk insert takes minutes | Row-by-row persist | Enable `hibernate.jdbc.batch_size` and use `saveAll` |
| Response blocked by side effect | Synchronous non-critical work | Offload to `@Async` or event listener |
| GC pauses or high heap usage | Object allocation hotspot | Profile with JFR; reduce unnecessary entity hydration |

## Quick Mapping

| Situation | Default Move | Prefer Instead Of |
|-----------|--------------|-------------------|
| Measure endpoint latency | Micrometer `Timer` on service method | Manual `System.nanoTime()` logging |
| Detect N+1 queries | Enable `spring.jpa.properties.hibernate.generate_statistics=true` | Guessing from code review alone |
| Profile CPU/allocation hotspots | JDK Flight Recorder (JFR) recording | Third-party APM as first step |
| Cache hot read path | `@Cacheable` with Redis and TTL | In-memory `ConcurrentHashMap` in production |
| Paginate list endpoints | `Pageable` / `Slice` in repository | Loading all rows and filtering in Java |
| Batch writes | `hibernate.jdbc.batch_size` + `saveAll` | Individual `save()` in a loop |
| Non-blocking side effects | `@Async` with custom executor | Blocking the HTTP thread |

## Constraints

### MUST DO

| Rule | Preferred Pattern |
|------|-------------------|
| Measure before optimizing | Record baseline p95/throughput before any code change |
| Verify after optimizing | Re-measure under equivalent conditions and compare |
| Guard against regression | Add a Micrometer timer or performance test for critical paths |
| Set explicit TTL on every cache | `entryTtl(...)` in `RedisCacheConfiguration` |
| Paginate all list endpoints | Accept `Pageable`; never return unbounded result sets |
| Use bounded tags in metrics | Categorical values only — never entity IDs or request paths |
| Size connection pools with measurement | Start at `maximumPoolSize = 10`, load-test, then adjust |

### MUST NOT DO
- Do not optimize without a measured baseline — intuition-driven changes create new problems
- Do not cache write-heavy or rapidly-changing data without explicit invalidation
- Do not add `@Async` to methods whose result the caller needs immediately
- Do not set `hibernate.jdbc.batch_size` without verifying the entity uses `SEQUENCE` or `TABLE` ID generation (IDENTITY disables batching)
- Do not use unbounded metric tags (user IDs, paths) — causes cardinality explosion
- Do not increase connection pool size as a substitute for fixing slow queries
- Do not combine collection `JOIN FETCH` with pagination — use a two-step query

## Gotchas

- `hibernate.generate_statistics` is invaluable for finding N+1 but adds overhead — enable only during profiling, not in production.
- HikariCP defaults `maximumPoolSize` to 10. Increasing it without fixing slow queries just moves the bottleneck to the database.
- `@Cacheable` on a method called from the same bean bypasses the Spring proxy — the cache is never consulted.
- `@Async` requires a returned `void` or `CompletableFuture`. It also requires `@EnableAsync` and a configured executor, otherwise it falls back to `SimpleAsyncTaskExecutor` which creates unbounded threads.
- JFR recordings can be started at runtime without restarting the JVM — prefer this over adding ad-hoc timing code.
- Batch inserts with `IDENTITY` generation strategy force Hibernate to execute individual inserts to retrieve generated IDs.
- `Slice` is cheaper than `Page` when the total count is not needed — `Page` executes an extra `COUNT` query.

## Minimal Examples

### Micrometer timer for endpoint p95
```java
@Service
public class OrderService {

    private final OrderRepository orderRepository;
    private final Timer orderFetchTimer;

    public OrderService(OrderRepository orderRepository, MeterRegistry meterRegistry) {
        this.orderRepository = orderRepository;
        this.orderFetchTimer = Timer.builder("orders.fetch")
                .description("Time to fetch order by ID")
                .publishPercentiles(0.5, 0.95, 0.99)
                .register(meterRegistry);
    }

    @Transactional(readOnly = true)
    public OrderResponse getOrder(Long id) {
        return orderFetchTimer.record(() ->
                orderRepository.findProjectionById(id)
                        .map(OrderResponse::from)
                        .orElseThrow(() -> new NotFoundException("Order not found: " + id))
        );
    }
}
```

### N+1 fix with `@EntityGraph`
```java
public interface OrderRepository extends JpaRepository<Order, Long> {

    @EntityGraph(attributePaths = {"items", "items.product"})
    Optional<Order> findWithItemsById(Long id);
}
```

### N+1 fix with `JOIN FETCH`
```java
public interface OrderRepository extends JpaRepository<Order, Long> {

    @Query("SELECT o FROM Order o JOIN FETCH o.items i JOIN FETCH i.product WHERE o.id = :id")
    Optional<Order> findWithItemsAndProductsById(@Param("id") Long id);
}
```

### HikariCP pool sizing
```yaml
spring:
  datasource:
    hikari:
      maximum-pool-size: 10          # Start here; load-test to find the right value
      minimum-idle: 5
      connection-timeout: 30000      # 30s — fail fast if pool is exhausted
      leak-detection-threshold: 60000 # Log warning if connection held > 60s
      metrics-tracking: true          # Expose pool metrics to Micrometer
```

### Spring `@Cacheable` with Redis
```java
@Service
public class ProductService {

    private final ProductRepository productRepository;

    public ProductService(ProductRepository productRepository) {
        this.productRepository = productRepository;
    }

    @Cacheable(value = "products", key = "#id", unless = "#result == null")
    @Transactional(readOnly = true)
    public ProductResponse findById(UUID id) {
        return productRepository.findById(id)
                .map(ProductResponse::from)
                .orElse(null);
    }

    @CacheEvict(value = "products", key = "#id")
    @Transactional
    public ProductResponse update(UUID id, UpdateProductRequest request) {
        Product product = productRepository.findById(id).orElseThrow();
        product.apply(request);
        return ProductResponse.from(productRepository.save(product));
    }
}
```

### Pageable endpoint with `Slice`
```java
@RestController
@RequestMapping("/api/orders")
public class OrderController {

    private final OrderService orderService;

    public OrderController(OrderService orderService) {
        this.orderService = orderService;
    }

    @GetMapping
    public Slice<OrderSummary> list(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return orderService.listOrders(PageRequest.of(page, size, Sort.by("createdAt").descending()));
    }
}
```

```java
public interface OrderRepository extends JpaRepository<Order, Long> {

    @Query("SELECT new com.example.orders.OrderSummary(o.id, o.status, o.total, o.createdAt) FROM Order o")
    Slice<OrderSummary> findAllSummaries(Pageable pageable);
}
```

### Batch insert with `saveAll` and batch sizing
```yaml
spring:
  jpa:
    properties:
      hibernate:
        jdbc:
          batch_size: 50
        order_inserts: true
        order_updates: true
```

```java
@Service
public class EventIngestionService {

    private final EventRepository eventRepository;

    public EventIngestionService(EventRepository eventRepository) {
        this.eventRepository = eventRepository;
    }

    @Transactional
    public void ingestBatch(List<CreateEventRequest> requests) {
        List<Event> events = requests.stream()
                .map(Event::from)
                .toList();
        eventRepository.saveAll(events);
    }
}
```

### `@Async` for non-blocking side effects
```java
@Configuration
@EnableAsync
public class AsyncConfig {

    @Bean
    public Executor taskExecutor() {
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
        executor.setCorePoolSize(4);
        executor.setMaxPoolSize(8);
        executor.setQueueCapacity(100);
        executor.setThreadNamePrefix("async-");
        executor.setRejectedExecutionHandler(new ThreadPoolExecutor.CallerRunsPolicy());
        executor.initialize();
        return executor;
    }
}
```

```java
@Service
public class NotificationService {

    private final EmailClient emailClient;

    public NotificationService(EmailClient emailClient) {
        this.emailClient = emailClient;
    }

    @Async
    public void sendOrderConfirmation(OrderResponse order) {
        emailClient.send(order.email(), "Order confirmed", order.summary());
    }
}
```

### JFR recording at runtime
```bash
# Start a 60-second recording on a running JVM
jcmd <pid> JFR.start duration=60s filename=/tmp/profile.jfr

# Open with JDK Mission Control
jmc -open /tmp/profile.jfr
```

### Enable Hibernate statistics for profiling
```yaml
# Temporary — enable during profiling only, not in production
spring:
  jpa:
    properties:
      hibernate:
        generate_statistics: true
logging:
  level:
    org.hibernate.stat: DEBUG
    org.hibernate.SQL: DEBUG
```

## What to Verify
- A baseline measurement exists before any optimization is applied
- The optimization addresses the measured bottleneck, not a guess
- Post-fix measurement shows improvement compared to baseline under equivalent conditions
- A Micrometer timer or performance test guards the critical path against regression
- N+1 fixes are confirmed by checking query count before and after
- Connection pool metrics are exposed and monitored after tuning
- Cache hit/miss ratios are observable via `/actuator/metrics` or Redis monitoring
- Pagination is enforced on all list endpoints returning variable-sized result sets
- Batch insert configuration uses `SEQUENCE` or `TABLE` ID generation, not `IDENTITY`

## See Also
- `jpa-master` for detailed N+1, fetch strategy, and entity relationship guidance
- `redis-master` for cache-aside patterns, TTL strategy, and Redis data structures
- `observability-master` for Actuator setup, Micrometer metrics, and distributed tracing
- `spring-boot-engineer` for general Spring Boot feature implementation
- `postgres-master` for index design, query plans, and schema optimization
