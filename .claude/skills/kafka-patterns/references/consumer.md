# Kafka Consumer Reference

## @KafkaListener with Manual Acknowledgment

Manual acknowledgment gives the application full control over when an offset is committed.
Never acknowledge before processing is complete — a crash between consume and process would
silently drop the message.

```java
@Service
public class OrderConsumer {

    private static final Logger log = LoggerFactory.getLogger(OrderConsumer.class);

    private final OrderService orderService;

    public OrderConsumer(OrderService orderService) {
        this.orderService = orderService;
    }

    @KafkaListener(
        topics               = "orders",
        groupId              = "order-processor",
        containerFactory     = "manualAckKafkaListenerContainerFactory"
    )
    public void consume(ConsumerRecord<String, OrderCreatedEvent> record, Acknowledgment ack) {
        String orderId = record.key();
        log.info("Received order event [orderId={}, partition={}, offset={}]",
            orderId, record.partition(), record.offset());
        try {
            orderService.process(record.value());
            ack.acknowledge();              // commit only after successful processing
            log.info("Processed order event [orderId={}]", orderId);
        } catch (NonRetryableException ex) {
            log.error("Non-retryable error for orderId={}: {}", orderId, ex.getMessage(), ex);
            ack.acknowledge();              // acknowledge to avoid infinite requeue; DLT handles it
        } catch (Exception ex) {
            log.warn("Retryable error for orderId={}, nacking: {}", orderId, ex.getMessage());
            ack.nack(Duration.ofSeconds(1)); // re-deliver after 1 s
        }
    }
}
```

## DefaultErrorHandler with Exponential Backoff

`DefaultErrorHandler` replaces the removed `SeekToCurrentErrorHandler`. Wire it into
the container factory so every `@KafkaListener` using that factory shares the policy.

```java
@Configuration
public class KafkaConsumerConfig {

    private static final Logger log = LoggerFactory.getLogger(KafkaConsumerConfig.class);

    private final String bootstrapServers;
    private final String groupId;

    public KafkaConsumerConfig(
            @Value("${spring.kafka.bootstrap-servers}") String bootstrapServers,
            @Value("${spring.kafka.consumer.group-id}") String groupId) {
        this.bootstrapServers = bootstrapServers;
        this.groupId = groupId;
    }

    @Bean
    public ConsumerFactory<String, Object> consumerFactory() {
        Map<String, Object> config = new HashMap<>();
        config.put(ConsumerConfig.BOOTSTRAP_SERVERS_CONFIG, bootstrapServers);
        config.put(ConsumerConfig.GROUP_ID_CONFIG, groupId);
        config.put(ConsumerConfig.AUTO_OFFSET_RESET_CONFIG, "earliest");
        config.put(ConsumerConfig.ENABLE_AUTO_COMMIT_CONFIG, false);
        config.put(ConsumerConfig.MAX_POLL_RECORDS_CONFIG, 10);
        config.put(ConsumerConfig.SESSION_TIMEOUT_MS_CONFIG, 30_000);
        config.put(ConsumerConfig.HEARTBEAT_INTERVAL_MS_CONFIG, 10_000);
        config.put(ConsumerConfig.KEY_DESERIALIZER_CLASS_CONFIG, StringDeserializer.class);
        config.put(ConsumerConfig.VALUE_DESERIALIZER_CLASS_CONFIG, JsonDeserializer.class);
        config.put(JsonDeserializer.TRUSTED_PACKAGES, "com.example.events");
        config.put(JsonDeserializer.TYPE_MAPPINGS,
            "orderCreated:com.example.events.OrderCreatedEvent");
        return new DefaultKafkaConsumerFactory<>(config);
    }

    @Bean
    public ConcurrentKafkaListenerContainerFactory<String, Object>
            manualAckKafkaListenerContainerFactory() {

        ConcurrentKafkaListenerContainerFactory<String, Object> factory =
            new ConcurrentKafkaListenerContainerFactory<>();
        factory.setConsumerFactory(consumerFactory());
        factory.getContainerProperties().setAckMode(ContainerProperties.AckMode.MANUAL_IMMEDIATE);
        factory.setConcurrency(3);
        factory.setCommonErrorHandler(defaultErrorHandler());
        return factory;
    }

    @Bean
    public DefaultErrorHandler defaultErrorHandler(
            KafkaTemplate<String, Object> kafkaTemplate) {

        // Back off: 1 s → 2 s → 4 s (3 retries), then send to DLT
        ExponentialBackOffWithMaxRetries backOff = new ExponentialBackOffWithMaxRetries(3);
        backOff.setInitialInterval(1_000);
        backOff.setMultiplier(2.0);
        backOff.setMaxInterval(10_000);

        DeadLetterPublishingRecoverer recoverer =
            new DeadLetterPublishingRecoverer(kafkaTemplate,
                (record, ex) -> new TopicPartition(record.topic() + ".DLT", 0));

        // Attach diagnostic headers so ops can inspect the DLT message
        recoverer.setHeadersFunction((consumerRecord, ex) -> {
            Headers headers = new RecordHeaders();
            headers.add("original-topic",
                consumerRecord.topic().getBytes(StandardCharsets.UTF_8));
            headers.add("original-partition",
                String.valueOf(consumerRecord.partition()).getBytes(StandardCharsets.UTF_8));
            headers.add("original-offset",
                String.valueOf(consumerRecord.offset()).getBytes(StandardCharsets.UTF_8));
            headers.add("exception-message",
                ex.getMessage().getBytes(StandardCharsets.UTF_8));
            headers.add("exception-class",
                ex.getClass().getName().getBytes(StandardCharsets.UTF_8));
            return headers;
        });

        DefaultErrorHandler handler = new DefaultErrorHandler(recoverer, backOff);

        // These exceptions skip retries and go straight to DLT
        handler.addNotRetryableExceptions(
            JsonParseException.class,
            IllegalArgumentException.class);

        handler.setRetryListeners((record, ex, deliveryAttempt) ->
            log.warn("Retry attempt {} for topic={} key={}",
                deliveryAttempt, record.topic(), record.key()));

        return handler;
    }
}
```

## @RetryableTopic (Declarative Retry)

`@RetryableTopic` creates physical retry topics (`orders-retry-0`, `orders-retry-1`…)
and parks failed messages there with a delay. This survives restarts — messages are not
held in-memory like `DefaultErrorHandler` retries.

```java
@Service
public class OrderConsumer {

    private final OrderService orderService;

    public OrderConsumer(OrderService orderService) {
        this.orderService = orderService;
    }

    @RetryableTopic(
        attempts         = "4",                          // 1 original + 3 retries
        backoff          = @Backoff(delay = 1_000, multiplier = 2.0, maxDelay = 10_000),
        autoCreateTopics = "false",                      // create topics via IaC, not at runtime
        dltStrategy      = DltStrategy.FAIL_ON_ERROR,    // re-throw if DLT publish also fails
        include          = { RetryableException.class }  // only retry these
    )
    @KafkaListener(topics = "orders", groupId = "order-processor")
    public void consume(OrderCreatedEvent event) {
        orderService.process(event);
    }

    @DltHandler
    public void handleDlt(OrderCreatedEvent event) {
        log.error("Order event landed in DLT, requires manual intervention [orderId={}]",
            event.orderId());
        // alert, store for replay, etc.
    }
}
```

**@RetryableTopic vs DefaultErrorHandler:**
| Aspect                  | @RetryableTopic              | DefaultErrorHandler            |
|-------------------------|------------------------------|--------------------------------|
| Retry persistence       | Yes (retry topic in Kafka)   | No (in-memory only)            |
| Survives restart        | Yes                          | No                             |
| Topic sprawl            | Creates N retry topics       | None                           |
| Ordering guarantee      | Broken (messages skip ahead) | Preserved within partition     |
| Use when                | Long delays OK, restarts likely | Short retries, ordering matters |

## Batch Listener

```java
@KafkaListener(
    topics           = "orders",
    groupId          = "order-batch-processor",
    containerFactory = "batchKafkaListenerContainerFactory"
)
public void consumeBatch(
        List<ConsumerRecord<String, OrderCreatedEvent>> records,
        Acknowledgment ack) {

    List<String> failed = new ArrayList<>();

    for (ConsumerRecord<String, OrderCreatedEvent> record : records) {
        try {
            orderService.process(record.value());
        } catch (Exception ex) {
            // Log and collect; do not let one bad record fail the whole batch
            log.error("Failed to process record [key={}, offset={}]: {}",
                record.key(), record.offset(), ex.getMessage(), ex);
            failed.add(record.key());
        }
    }

    ack.acknowledge();   // commit the entire batch; failures go to a separate error store

    if (!failed.isEmpty()) {
        log.warn("Batch processed with {} failures: {}", failed.size(), failed);
    }
}

@Bean
public ConcurrentKafkaListenerContainerFactory<String, Object>
        batchKafkaListenerContainerFactory() {
    ConcurrentKafkaListenerContainerFactory<String, Object> factory =
        new ConcurrentKafkaListenerContainerFactory<>();
    factory.setConsumerFactory(consumerFactory());
    factory.setBatchListener(true);
    factory.getContainerProperties().setAckMode(ContainerProperties.AckMode.MANUAL_IMMEDIATE);
    return factory;
}
```

## Consumer Concurrency

```java
// concurrency should not exceed the number of partitions on the topic;
// excess threads sit idle.
@KafkaListener(
    topics       = "orders",
    groupId      = "order-processor",
    concurrency  = "3"           // spawns 3 consumer threads, one per partition
)
public void consume(ConsumerRecord<String, OrderCreatedEvent> record, Acknowledgment ack) {
    // ...
}
```

**Dynamic pause/resume for backpressure:**
```java
@Service
public class ConsumerBackpressureManager {

    private final KafkaListenerEndpointRegistry registry;

    public ConsumerBackpressureManager(KafkaListenerEndpointRegistry registry) {
        this.registry = registry;
    }

    public void pause() {
        MessageListenerContainer container = registry.getListenerContainer("order-listener");
        if (container != null && container.isRunning()) {
            container.pause();
            log.info("Kafka consumer paused");
        }
    }

    public void resume() {
        MessageListenerContainer container = registry.getListenerContainer("order-listener");
        if (container != null && container.isPaused()) {
            container.resume();
            log.info("Kafka consumer resumed");
        }
    }
}
```

## Filter Strategy

Useful when a topic carries multiple event types but a specific consumer only cares about one.
Return `true` to **skip** the record (filter it out).

```java
@Bean
public RecordFilterStrategy<String, DomainEvent> orderCreatedFilter() {
    return record -> !(record.value() instanceof OrderCreatedEvent);
}

@Bean
public ConcurrentKafkaListenerContainerFactory<String, DomainEvent>
        filteredKafkaListenerContainerFactory() {
    ConcurrentKafkaListenerContainerFactory<String, DomainEvent> factory =
        new ConcurrentKafkaListenerContainerFactory<>();
    factory.setConsumerFactory(consumerFactory());
    factory.setRecordFilterStrategy(orderCreatedFilter());
    factory.getContainerProperties().setAckMode(ContainerProperties.AckMode.MANUAL_IMMEDIATE);
    return factory;
}
```

## Quick Reference

| Configuration            | Recommended Value | Reason                                           |
|--------------------------|-------------------|--------------------------------------------------|
| auto-offset-reset        | earliest          | Do not miss messages published before startup    |
| enable-auto-commit       | false             | Application controls when offset is committed    |
| max-poll-records         | 10–50             | Limit batch size; avoid long processing delays   |
| session-timeout-ms       | 30 000            | Must be > 3× heartbeat interval                  |
| heartbeat-interval-ms    | 10 000            | ~⅓ of session timeout                            |
| max-poll-interval-ms     | 300 000           | Set higher if processing a single record is slow |
