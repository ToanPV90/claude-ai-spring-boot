# Idempotency, Retries, and Background Work

## Default Position

Every backend write path should answer:
- what happens if the same action arrives twice
- what happens if the caller retries after a timeout
- what work must continue after the main transaction commits

If the design has no explicit answer, it is not production-safe yet.

## Idempotency and Duplicate Protection

Use explicit duplicate-protection rules when:
- clients may retry after timeouts
- callbacks or webhooks can be delivered more than once
- background workers can reprocess the same message
- a second execution would double-charge, double-send, or duplicate a record

### Idempotency Key Pattern

```java
@RestController
@RequestMapping("/api/v1/payments")
public class PaymentController {

    private final PaymentService paymentService;

    public PaymentController(PaymentService paymentService) {
        this.paymentService = paymentService;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public PaymentResponse createPayment(
            @RequestHeader("Idempotency-Key") String idempotencyKey,
            @Valid @RequestBody CreatePaymentRequest request) {
        return paymentService.processPayment(idempotencyKey, request);
    }
}

@Service
public class PaymentServiceImpl implements PaymentService {

    private final PaymentRepository paymentRepository;
    private final PaymentGateway paymentGateway;

    public PaymentServiceImpl(PaymentRepository paymentRepository, PaymentGateway paymentGateway) {
        this.paymentRepository = paymentRepository;
        this.paymentGateway = paymentGateway;
    }

    @Override
    @Transactional
    public PaymentResponse processPayment(String idempotencyKey, CreatePaymentRequest request) {
        // Check if already processed
        Optional<Payment> existing = paymentRepository.findByIdempotencyKey(idempotencyKey);
        if (existing.isPresent()) {
            return PaymentResponse.from(existing.get());
        }

        // Process and persist atomically
        Payment payment = Payment.create(idempotencyKey, request);
        PaymentResult result = paymentGateway.charge(request.amount());
        payment.markCompleted(result.transactionId());
        return PaymentResponse.from(paymentRepository.save(payment));
    }
}
```

### Database Unique Constraint as Guard

```java
@Entity
@Table(name = "payments", uniqueConstraints = {
    @UniqueConstraint(name = "uk_payments_idempotency_key", columnNames = "idempotency_key")
})
public class Payment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "idempotency_key", nullable = false, unique = true)
    private String idempotencyKey;

    // ... other fields
}
```

### Natural Business Uniqueness

```java
// Instead of idempotency key, use business rules
@Transactional
public OrderResponse createOrder(CreateOrderRequest request) {
    // Prevent duplicate orders within a time window
    boolean exists = orderRepository.existsByCustomerIdAndCreatedAtAfter(
        request.customerId(),
        Instant.now().minus(Duration.ofMinutes(5))
    );
    if (exists) {
        throw new DuplicateOrderException("Order already placed recently");
    }
    // proceed
}
```

## Transaction Boundaries

Review whether transactions:
- wrap the business state that must commit atomically
- avoid holding locks across slow remote calls unless explicitly justified
- fail clearly when dependent state changes underneath them

If deep JPA or PostgreSQL mechanics dominate, route to `jpa-master` or `postgres-master`.

## Background Work — Separate Commit from Side Effects

### Use @TransactionalEventListener

```java
// Service commits local state, publishes domain event
@Service
public class OrderServiceImpl implements OrderService {

    private final OrderRepository orderRepository;
    private final ApplicationEventPublisher eventPublisher;

    public OrderServiceImpl(OrderRepository orderRepository,
                            ApplicationEventPublisher eventPublisher) {
        this.orderRepository = orderRepository;
        this.eventPublisher = eventPublisher;
    }

    @Override
    @Transactional
    public OrderResponse createOrder(CreateOrderRequest request) {
        Order order = Order.create(request);
        order = orderRepository.save(order);

        // Event fires AFTER transaction commits successfully
        eventPublisher.publishEvent(new OrderCreatedEvent(order.getId()));
        return OrderResponse.from(order);
    }
}

// Listener handles side effects outside the original transaction
@Component
public class OrderEventHandler {

    private static final Logger log = LoggerFactory.getLogger(OrderEventHandler.class);

    private final NotificationService notificationService;
    private final InventoryService inventoryService;

    public OrderEventHandler(NotificationService notificationService,
                             InventoryService inventoryService) {
        this.notificationService = notificationService;
        this.inventoryService = inventoryService;
    }

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onOrderCreated(OrderCreatedEvent event) {
        try {
            notificationService.sendOrderConfirmation(event.orderId());
        } catch (Exception e) {
            log.error("Failed to send notification for order={}", event.orderId(), e);
            // do not rethrow — order is already committed
        }

        try {
            inventoryService.reserveStock(event.orderId());
        } catch (Exception e) {
            log.error("Failed to reserve stock for order={}", event.orderId(), e);
        }
    }
}
```

### Outbox Pattern for Critical Side Effects

When side effects MUST eventually succeed (e.g., sending to Kafka):

```java
@Transactional
public OrderResponse createOrder(CreateOrderRequest request) {
    Order order = Order.create(request);
    order = orderRepository.save(order);

    // Write outbox record in same transaction
    outboxRepository.save(new OutboxMessage(
        "order.created",
        order.getId().toString(),
        objectMapper.writeValueAsString(OrderEvent.from(order))
    ));

    return OrderResponse.from(order);
}

// Separate scheduler polls outbox and publishes to Kafka
@Scheduled(fixedDelay = 1000)
@Transactional
public void publishPendingMessages() {
    List<OutboxMessage> pending = outboxRepository.findByStatusOrderByCreatedAtAsc(
        OutboxStatus.PENDING, PageRequest.of(0, 100));

    for (OutboxMessage msg : pending) {
        try {
            kafkaTemplate.send(msg.getTopic(), msg.getKey(), msg.getPayload()).get();
            msg.markPublished();
        } catch (Exception e) {
            msg.incrementRetryCount();
            if (msg.getRetryCount() > 5) {
                msg.markFailed();
            }
        }
    }
}
```

## Anti-Patterns

- Assuming retries are rare enough to ignore
- Doing remote provider calls inside long DB transactions for convenience
- Fire-and-forget async work without durable state or observability
- Treating duplicate writes as a UX problem instead of a backend integrity problem
- Using `@Async` for critical work without persistence — thread pool rejection or app restart loses the work
- Swallowing exceptions in event listeners without logging or retry tracking
