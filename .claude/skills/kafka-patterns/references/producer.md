# Kafka Producer Reference

## KafkaTemplate with CompletableFuture (Spring Kafka 3.x)

```java
@Service
public class OrderEventPublisher {

    private static final Logger log = LoggerFactory.getLogger(OrderEventPublisher.class);
    private static final String TOPIC = "orders";

    private final KafkaTemplate<String, OrderCreatedEvent> kafkaTemplate;

    public OrderEventPublisher(KafkaTemplate<String, OrderCreatedEvent> kafkaTemplate) {
        this.kafkaTemplate = kafkaTemplate;
    }

    public void publish(OrderCreatedEvent event) {
        ProducerRecord<String, OrderCreatedEvent> record = buildRecord(event);

        kafkaTemplate.send(record)
            .whenComplete((result, ex) -> {
                if (ex != null) {
                    log.error("Failed to publish event [orderId={}]: {}",
                        event.orderId(), ex.getMessage(), ex);
                    return;
                }
                RecordMetadata metadata = result.getRecordMetadata();
                log.info("Event published [orderId={}, topic={}, partition={}, offset={}]",
                    event.orderId(), metadata.topic(), metadata.partition(), metadata.offset());
            });
    }

    private ProducerRecord<String, OrderCreatedEvent> buildRecord(OrderCreatedEvent event) {
        ProducerRecord<String, OrderCreatedEvent> record =
            new ProducerRecord<>(TOPIC, event.orderId(), event);

        String correlationId = Optional.ofNullable(MDC.get("correlationId"))
            .orElse(UUID.randomUUID().toString());

        record.headers()
            .add(KafkaHeaders.CORRELATION_ID, correlationId.getBytes(StandardCharsets.UTF_8))
            .add("eventType", event.getClass().getSimpleName().getBytes(StandardCharsets.UTF_8))
            .add("occurredAt", Instant.now().toString().getBytes(StandardCharsets.UTF_8));

        return record;
    }
}
```

## Idempotent Producer Configuration

```java
@Configuration
public class KafkaProducerConfig {

    private final String bootstrapServers;

    public KafkaProducerConfig(@Value("${spring.kafka.bootstrap-servers}") String bootstrapServers) {
        this.bootstrapServers = bootstrapServers;
    }

    @Bean
    public ProducerFactory<String, Object> producerFactory() {
        Map<String, Object> config = new HashMap<>();
        config.put(ProducerConfig.BOOTSTRAP_SERVERS_CONFIG, bootstrapServers);
        config.put(ProducerConfig.KEY_SERIALIZER_CLASS_CONFIG, StringSerializer.class);
        config.put(ProducerConfig.VALUE_SERIALIZER_CLASS_CONFIG, JsonSerializer.class);

        // Idempotent producer — guarantees exactly-once delivery within a session
        config.put(ProducerConfig.ACKS_CONFIG, "all");
        config.put(ProducerConfig.ENABLE_IDEMPOTENCE_CONFIG, true);
        config.put(ProducerConfig.MAX_IN_FLIGHT_REQUESTS_PER_CONNECTION, 5);
        config.put(ProducerConfig.RETRIES_CONFIG, Integer.MAX_VALUE);
        config.put(ProducerConfig.DELIVERY_TIMEOUT_MS_CONFIG, 120_000);

        // Map Java types to short type names so the consumer can deserialize without
        // knowing the fully-qualified class name of the producer module.
        config.put(JsonSerializer.TYPE_MAPPINGS,
            "orderCreated:com.example.events.OrderCreatedEvent," +
            "productUpdated:com.example.events.ProductUpdatedEvent");

        return new DefaultKafkaProducerFactory<>(config);
    }

    @Bean
    public KafkaTemplate<String, Object> kafkaTemplate() {
        return new KafkaTemplate<>(producerFactory());
    }
}
```

## Kafka Headers for Correlation

Headers are the Kafka equivalent of HTTP headers — use them for cross-cutting concerns that
should not pollute your domain event payload.

```java
private ProducerRecord<String, DomainEvent> withObservabilityHeaders(
        ProducerRecord<String, DomainEvent> record) {

    Headers headers = record.headers();

    // Propagate trace context from MDC (set by a tracing filter/interceptor)
    Optional.ofNullable(MDC.get("correlationId"))
        .ifPresent(id -> headers.add(
            KafkaHeaders.CORRELATION_ID, id.getBytes(StandardCharsets.UTF_8)));

    Optional.ofNullable(MDC.get("traceId"))
        .ifPresent(id -> headers.add("X-Trace-Id", id.getBytes(StandardCharsets.UTF_8)));

    headers.add("eventType",
        record.value().getClass().getSimpleName().getBytes(StandardCharsets.UTF_8));
    headers.add("occurredAt",
        Instant.now().toString().getBytes(StandardCharsets.UTF_8));
    headers.add("producerService",
        "order-service".getBytes(StandardCharsets.UTF_8));

    return record;
}
```

## Transactional Producer (Outbox Note)

When `@Transactional` wraps both a JPA save and a `KafkaTemplate.send()`, the two
operations are **not truly atomic**. The DB commit and Kafka publish are independent;
a crash between them leaves them inconsistent. Use the **outbox pattern** for
guaranteed at-least-once delivery.

```java
@Service
@Transactional          // JPA transaction only — Kafka is NOT part of this transaction
public class OrderService {

    private final OrderRepository orderRepository;
    private final OutboxRepository outboxRepository;   // Outbox pattern

    public OrderService(OrderRepository orderRepository, OutboxRepository outboxRepository) {
        this.orderRepository = orderRepository;
        this.outboxRepository = outboxRepository;
    }

    public Order createOrder(CreateOrderCommand command) {
        Order order = Order.create(command);
        orderRepository.save(order);

        // Write to outbox table in the SAME transaction as the domain write.
        // A separate relay process reads the outbox and publishes to Kafka.
        // This guarantees the event is not lost even if the process crashes.
        OutboxEntry entry = OutboxEntry.of("orders", order.getId().toString(),
            new OrderCreatedEvent(order.getId(), order.getCustomerId(), order.getTotal()));
        outboxRepository.save(entry);

        return order;
    }
}
```

## Event DTOs with Records and Sealed Interface

Using a sealed interface enables exhaustive pattern matching on the consumer side and
lets Jackson handle polymorphic serialization without stringly-typed `type` fields.

```java
@JsonTypeInfo(use = JsonTypeInfo.Id.NAME, property = "type")
@JsonSubTypes({
    @JsonSubTypes.Type(value = OrderCreatedEvent.class,   name = "orderCreated"),
    @JsonSubTypes.Type(value = ProductUpdatedEvent.class, name = "productUpdated")
})
public sealed interface DomainEvent permits OrderCreatedEvent, ProductUpdatedEvent {
    String eventId();
    Instant occurredAt();
}

public record OrderCreatedEvent(
    String eventId,
    Instant occurredAt,
    String orderId,
    String customerId,
    BigDecimal total
) implements DomainEvent {

    public static OrderCreatedEvent of(String orderId, String customerId, BigDecimal total) {
        return new OrderCreatedEvent(
            UUID.randomUUID().toString(), Instant.now(), orderId, customerId, total);
    }
}

public record ProductUpdatedEvent(
    String eventId,
    Instant occurredAt,
    String productId,
    String fieldChanged,
    String previousValue,
    String newValue
) implements DomainEvent {

    public static ProductUpdatedEvent of(
            String productId, String field, String prev, String next) {
        return new ProductUpdatedEvent(
            UUID.randomUUID().toString(), Instant.now(), productId, field, prev, next);
    }
}
```

**Exhaustive consumer dispatch:**
```java
private void dispatch(DomainEvent event) {
    switch (event) {
        case OrderCreatedEvent e   -> orderHandler.handle(e);
        case ProductUpdatedEvent e -> productHandler.handle(e);
    }
    // Compiler enforces all permits are handled — no default needed.
}
```

## Quick Reference

| Pattern              | When to Use                                                      |
|----------------------|------------------------------------------------------------------|
| Fire-and-forget      | Audit logs, metrics — loss is acceptable                         |
| CompletableFuture chain | All production use cases — confirm delivery or surface error  |
| Transactional Kafka  | Kafka-to-Kafka pipelines only (consumer → transform → produce)  |
| Headers              | Correlation IDs, trace context, event metadata                  |
| Outbox               | Guaranteed delivery when DB and Kafka must stay consistent       |
