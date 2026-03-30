# Micrometer Custom Metrics

## Core Metric Types

| Type | Use | Example |
|------|-----|---------|
| `Counter` | Count events that only increase | Orders created, errors, logins |
| `Gauge` | Current value that goes up/down | Active connections, queue depth |
| `Timer` | Latency distribution + count | HTTP call duration, DB query time |
| `DistributionSummary` | Value distribution (not time) | Payload size, item count per order |

## Counter

```java
@Service
public class OrderService {

    private final OrderRepository orderRepository;
    private final Counter ordersCreatedCounter;
    private final Counter orderFailedCounter;

    public OrderService(OrderRepository orderRepository, MeterRegistry registry) {
        this.orderRepository = orderRepository;
        this.ordersCreatedCounter = registry.counter("orders.created",
            "status", "success");
        this.orderFailedCounter = registry.counter("orders.created",
            "status", "failure");
    }

    @Transactional
    public OrderResponse createOrder(CreateOrderRequest request) {
        try {
            Order order = orderRepository.save(new Order(request));
            ordersCreatedCounter.increment();
            return OrderResponse.from(order);
        } catch (Exception ex) {
            orderFailedCounter.increment();
            throw ex;
        }
    }
}
```

## Timer

```java
@Service
public class PaymentService {

    private final Timer paymentTimer;
    private final PaymentGateway gateway;

    public PaymentService(PaymentGateway gateway, MeterRegistry registry) {
        this.gateway = gateway;
        this.paymentTimer = registry.timer("payment.charge.duration",
            "gateway", "stripe");
    }

    public PaymentResult charge(PaymentRequest request) {
        return paymentTimer.record(() -> gateway.charge(request));
    }
}
```

Or with `Timer.Sample` (useful when start and stop are in different scopes):

```java
Timer.Sample sample = Timer.start(registry);
try {
    return externalCall();
} finally {
    sample.stop(registry.timer("external.call.duration",
        "service", "inventory",
        "outcome", "success"));
}
```

## Gauge

```java
@Component
public class QueueMetrics {

    private final BlockingQueue<Task> taskQueue;

    public QueueMetrics(BlockingQueue<Task> taskQueue, MeterRegistry registry) {
        this.taskQueue = taskQueue;
        // Gauge requires a strong reference to the measured object
        registry.gauge("task.queue.size", taskQueue, BlockingQueue::size);
    }
}
```

**Critical:** The second argument to `gauge()` must be strongly referenced. If it's collected by GC, the gauge will return `NaN`.

## @Timed Annotation

```java
@Service
public class ReportService {

    @Timed(value = "report.generate.duration", description = "Time to generate report")
    public ReportData generateReport(ReportRequest request) {
        // ...
    }
}
```

`@Timed` requires:
1. The class is a Spring-managed bean
2. `TimedAspect` bean is configured:

```java
@Configuration
public class MetricsConfig {

    @Bean
    public TimedAspect timedAspect(MeterRegistry registry) {
        return new TimedAspect(registry);
    }
}
```

**Limitation:** Only works on public methods of Spring beans (AOP proxy). Self-invocation won't be measured.

## Tag Best Practices

### Good tags (bounded cardinality)
```java
registry.counter("http.errors",
    "status", "404",           // bounded: HTTP status codes
    "path", "/api/v1/orders",  // bounded: known endpoint patterns
    "method", "GET");          // bounded: HTTP methods
```

### Bad tags (unbounded cardinality — causes OOM)
```java
// NEVER do this
registry.counter("http.errors",
    "userId", userId.toString(),    // unbounded: millions of users
    "orderId", orderId.toString()); // unbounded: millions of orders
```

## DistributionSummary

```java
DistributionSummary payloadSummary = DistributionSummary.builder("request.payload.bytes")
    .description("HTTP request payload size in bytes")
    .baseUnit("bytes")
    .register(registry);

payloadSummary.record(request.getContentLength());
```

## Viewing Metrics

- `/actuator/metrics` — list all metric names
- `/actuator/metrics/orders.created` — value + tags for a specific metric
- `/actuator/prometheus` — Prometheus exposition format (all metrics)

## Prometheus Scrape Config

```yaml
# prometheus.yml
scrape_configs:
  - job_name: 'spring-boot-app'
    metrics_path: '/actuator/prometheus'
    static_configs:
      - targets: ['localhost:8080']
```

## Gotchas

- `Gauge` holding a reference to a garbage-collected object silently returns `NaN`. Always hold a strong reference.
- `Counter.increment()` is thread-safe; no synchronization needed.
- High-cardinality tags cause Prometheus cardinality explosion, high memory usage, and slow queries. Keep tag values categorical.
- `Timer.record(Runnable)` captures exceptions too — the timer records even on failure.
- Spring Boot auto-configures JVM, HTTP server, and datasource metrics. Check `/actuator/prometheus` before adding duplicate metrics.
