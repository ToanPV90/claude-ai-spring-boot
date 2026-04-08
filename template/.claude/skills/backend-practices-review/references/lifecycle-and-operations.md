# Lifecycle and Operations

## Default Position

Backend review should ask whether the system can survive retries, failures, cleanup, deploys, and operator handoff over time.

If the design only looks correct on the happy path of one request, it is not operationally complete yet.

## Model State Explicitly

Stateful backend flows usually need more than one boolean flag.

### Use Enums for State Machines

```java
public enum OrderStatus {
    CREATED,
    PAYMENT_PENDING,
    PAYMENT_CONFIRMED,
    PROCESSING,
    SHIPPED,
    DELIVERED,
    CANCELLED,
    REFUNDED,
    FAILED;

    public boolean canTransitionTo(OrderStatus target) {
        return switch (this) {
            case CREATED -> target == PAYMENT_PENDING || target == CANCELLED;
            case PAYMENT_PENDING -> target == PAYMENT_CONFIRMED || target == FAILED;
            case PAYMENT_CONFIRMED -> target == PROCESSING || target == CANCELLED;
            case PROCESSING -> target == SHIPPED || target == CANCELLED;
            case SHIPPED -> target == DELIVERED || target == REFUNDED;
            case DELIVERED -> target == REFUNDED;
            case CANCELLED, REFUNDED, FAILED -> false;
        };
    }
}
```

### Enforce Transitions in the Entity

```java
@Entity
@Table(name = "orders")
public class Order {

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private OrderStatus status;

    private Instant statusChangedAt;

    public void transitionTo(OrderStatus newStatus) {
        if (!this.status.canTransitionTo(newStatus)) {
            throw new IllegalStateException(
                "Cannot transition from %s to %s".formatted(this.status, newStatus));
        }
        this.status = newStatus;
        this.statusChangedAt = Instant.now();
    }

    // getters
    public OrderStatus getStatus() { return status; }
    public Instant getStatusChangedAt() { return statusChangedAt; }
}
```

## Cleanup and Retention

Any design that can create partial state must define how it disappears or transitions.

### Scheduled Cleanup Job

```java
@Component
public class StaleOrderCleanup {

    private static final Logger log = LoggerFactory.getLogger(StaleOrderCleanup.class);

    private final OrderRepository orderRepository;

    public StaleOrderCleanup(OrderRepository orderRepository) {
        this.orderRepository = orderRepository;
    }

    @Scheduled(cron = "0 0 2 * * *") // daily at 2 AM
    @Transactional
    public void cleanupStaleOrders() {
        Instant cutoff = Instant.now().minus(Duration.ofDays(7));

        int expired = orderRepository.expireStaleOrders(
            List.of(OrderStatus.CREATED, OrderStatus.PAYMENT_PENDING),
            cutoff
        );

        log.info("Expired {} stale orders older than {}", expired, cutoff);
    }
}

// Repository
public interface OrderRepository extends JpaRepository<Order, Long> {

    @Modifying
    @Query("""
        UPDATE Order o SET o.status = 'EXPIRED', o.statusChangedAt = CURRENT_TIMESTAMP
        WHERE o.status IN :statuses AND o.createdAt < :cutoff
        """)
    int expireStaleOrders(@Param("statuses") List<OrderStatus> statuses,
                          @Param("cutoff") Instant cutoff);
}
```

### Soft Delete Over Hard Delete

```java
@Entity
@Table(name = "users")
@Where(clause = "deleted_at IS NULL")
public class User {

    @Column(name = "deleted_at")
    private Instant deletedAt;

    public void softDelete() {
        this.deletedAt = Instant.now();
    }

    public boolean isDeleted() {
        return deletedAt != null;
    }
}
```

## Graceful Shutdown

### Handle In-Flight Requests During Deploy

```java
@Component
public class GracefulShutdownHandler implements DisposableBean {

    private static final Logger log = LoggerFactory.getLogger(GracefulShutdownHandler.class);

    private final TaskExecutor taskExecutor;

    public GracefulShutdownHandler(TaskExecutor taskExecutor) {
        this.taskExecutor = taskExecutor;
    }

    @Override
    public void destroy() {
        log.info("Initiating graceful shutdown...");
        if (taskExecutor instanceof ThreadPoolTaskExecutor pool) {
            pool.setWaitForTasksToCompleteOnShutdown(true);
            pool.setAwaitTerminationSeconds(30);
            pool.shutdown();
        }
        log.info("Graceful shutdown complete");
    }
}
```

```yaml
# application.yml
server:
  shutdown: graceful
spring:
  lifecycle:
    timeout-per-shutdown-phase: 30s
```

## Observability

### Log State Transitions with MDC

```java
@Service
public class OrderServiceImpl implements OrderService {

    private static final Logger log = LoggerFactory.getLogger(OrderServiceImpl.class);

    @Override
    @Transactional
    public void updateStatus(Long orderId, OrderStatus newStatus) {
        Order order = orderRepository.findById(orderId)
            .orElseThrow(() -> new ResourceNotFoundException("Order", orderId));

        OrderStatus previousStatus = order.getStatus();
        order.transitionTo(newStatus);

        try (var ignored = MDC.putCloseable("orderId", orderId.toString())) {
            log.info("Order state transition: {} → {}", previousStatus, newStatus);
        }
    }
}
```

### Health Indicator for Critical Dependencies

```java
@Component
public class PaymentGatewayHealthIndicator implements HealthIndicator {

    private final RestClient restClient;

    public PaymentGatewayHealthIndicator(RestClient restClient) {
        this.restClient = restClient;
    }

    @Override
    public Health health() {
        try {
            restClient.get().uri("/health").retrieve().toBodilessEntity();
            return Health.up().withDetail("service", "payment-gateway").build();
        } catch (Exception e) {
            return Health.down()
                .withDetail("service", "payment-gateway")
                .withDetail("error", e.getMessage())
                .build();
        }
    }
}
```

## Configuration and Rollout Hygiene

### Typed Configuration for Operational Knobs

```java
@ConfigurationProperties(prefix = "app.cleanup")
public record CleanupProperties(
    boolean enabled,
    Duration staleThreshold,
    int batchSize,
    String cronExpression
) {}
```

```yaml
app:
  cleanup:
    enabled: true
    stale-threshold: 7d
    batch-size: 500
    cron-expression: "0 0 2 * * *"
```

## Review Triggers for Other Skills

Route outward when the main problem becomes:
- API contract shape or endpoint semantics → `api-contract-review`
- Spring MVC/WebFlux controller or SDK wiring → `spring-boot-engineer`
- module and layer ownership → `spring-boot-master`
- deep schema/index/blob modeling → `postgres-master`
- wider service-boundary or infrastructure decisions → `java-architect`
