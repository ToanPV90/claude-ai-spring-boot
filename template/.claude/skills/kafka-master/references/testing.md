# Kafka Testing Reference

## Required Test Dependencies

```xml
<dependency>
    <groupId>org.awaitility</groupId>
    <artifactId>awaitility</artifactId>
    <scope>test</scope>
</dependency>

<dependency>
    <groupId>org.springframework.kafka</groupId>
    <artifactId>spring-kafka-test</artifactId>
    <scope>test</scope>
</dependency>

<dependency>
    <groupId>org.testcontainers</groupId>
    <artifactId>kafka</artifactId>
    <scope>test</scope>
</dependency>
```

Add Spring Kafka test support and Testcontainers Kafka support alongside Awaitility when using the examples below.

## @EmbeddedKafka for Slice Tests

`@EmbeddedKafka` starts an in-process Kafka broker. It is fast and suitable for unit/slice
tests that verify producer→consumer wiring without external infrastructure.

Keep these tests focused on wiring and short retry loops. If the scenario depends on broker
restart behavior, durable retry topics, or realistic partition assignment, prefer Testcontainers.

```java
@SpringBootTest
@EmbeddedKafka(
    partitions = 1,
    topics     = { "orders", "orders.DLT" },
    brokerProperties = {
        "log.dir=target/embedded-kafka",
        "auto.create.topics.enable=false"
    }
)
class OrderConsumerTest {

    @Autowired
    private KafkaTemplate<String, OrderCreatedEvent> kafkaTemplate;

    @MockitoBean                      // Spring Boot 3.4+ — replaces @MockBean
    private OrderService orderService;

    private final CountDownLatch latch = new CountDownLatch(1);

    @BeforeEach
    void configureLatch() {
        // Spy on the mock to count down when process() is called
        doAnswer(inv -> { latch.countDown(); return null; })
            .when(orderService).process(any());
    }

    @Test
    void givenValidEvent_whenPublished_thenConsumerProcessesIt() throws Exception {
        OrderCreatedEvent event = OrderCreatedEvent.of("order-1", "customer-1",
            new BigDecimal("99.99"));

        kafkaTemplate.send("orders", event.orderId(), event);

        boolean received = latch.await(10, TimeUnit.SECONDS);

        assertThat(received).as("Consumer did not process the event within timeout").isTrue();
        verify(orderService, times(1)).process(event);
    }

    @Test
    void givenProcessingFails_whenMaxRetriesExceeded_thenEventLandsInDlt() throws Exception {
        doThrow(new RuntimeException("simulated failure"))
            .when(orderService).process(any());

        OrderCreatedEvent event = OrderCreatedEvent.of("order-bad", "customer-1",
            new BigDecimal("10.00"));

        kafkaTemplate.send("orders", event.orderId(), event);

        // Give retries time to exhaust; use Awaitility for precise timing
        await().atMost(Duration.ofSeconds(30))
            .untilAsserted(() -> {
                ConsumerRecords<String, String> dltRecords = KafkaTestUtils.getRecords(
                    dltConsumer, Duration.ofSeconds(5));
                assertThat(dltRecords.count()).isGreaterThanOrEqualTo(1);
            });
    }

    // A raw KafkaConsumer wired to the embedded broker for inspecting DLT
    @Autowired
    @Qualifier("dltTestConsumer")
    private Consumer<String, String> dltConsumer;
}
```

**Shared DLT consumer bean for EmbeddedKafka tests:**
```java
@TestConfiguration
class KafkaTestConfig {

    @Bean("dltTestConsumer")
    Consumer<String, String> dltTestConsumer(
            @Value("${spring.kafka.bootstrap-servers}") String bootstrapServers) {

        Map<String, Object> config = Map.of(
            ConsumerConfig.BOOTSTRAP_SERVERS_CONFIG, bootstrapServers,
            ConsumerConfig.GROUP_ID_CONFIG, "dlt-test-" + UUID.randomUUID(),
            ConsumerConfig.AUTO_OFFSET_RESET_CONFIG, "earliest",
            ConsumerConfig.KEY_DESERIALIZER_CLASS_CONFIG, StringDeserializer.class,
            ConsumerConfig.VALUE_DESERIALIZER_CLASS_CONFIG, StringDeserializer.class
        );
        Consumer<String, String> consumer = new KafkaConsumer<>(config);
        consumer.subscribe(List.of("orders.DLT"));
        return consumer;
    }
}
```

## TestContainers Kafka for Integration Tests

Use a shared, reusable container so each test class does not pay the startup cost.

```java
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
public abstract class AbstractKafkaIntegrationTest {

    static final KafkaContainer kafka =
        new KafkaContainer(DockerImageName.parse("confluentinc/cp-kafka:7.6.0"))
            .withReuse(true);           // reuse across test runs in CI with Testcontainers Cloud

    static {
        kafka.start();
    }

    @DynamicPropertySource
    static void kafkaProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.kafka.bootstrap-servers", kafka::getBootstrapServers);
    }
}
```

**Combined Kafka + Postgres integration base:**
```java
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
public abstract class AbstractIntegrationTest {

    static final KafkaContainer kafka =
        new KafkaContainer(DockerImageName.parse("confluentinc/cp-kafka:7.6.0"))
            .withReuse(true);

    static final PostgreSQLContainer<?> postgres =
        new PostgreSQLContainer<>(DockerImageName.parse("postgres:16-alpine"))
            .withReuse(true);

    static {
        Startables.deepStart(kafka, postgres).join();
    }

    @DynamicPropertySource
    static void containerProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.kafka.bootstrap-servers", kafka::getBootstrapServers);
        registry.add("spring.datasource.url", postgres::getJdbcUrl);
        registry.add("spring.datasource.username", postgres::getUsername);
        registry.add("spring.datasource.password", postgres::getPassword);
    }
}
```

## Testing the Full Pipeline (Produce → Consume → DB)

This triangle test verifies the full async flow end-to-end.

```java
class OrderPipelineIntegrationTest extends AbstractIntegrationTest {

    @Autowired
    private TestRestTemplate restTemplate;

    @Autowired
    private OrderRepository orderRepository;

    @Test
    void givenCreateOrderRequest_whenApiCalled_thenOrderPersistedAfterKafkaRoundtrip()
            throws Exception {

        CreateOrderRequest request = new CreateOrderRequest(
            UUID.randomUUID().toString(),
            List.of(new CreateOrderRequest.LineItem("product-1", 2, new BigDecimal("49.99"))));

        // 1. Trigger via HTTP (this publishes a Kafka event internally)
        ResponseEntity<OrderResponse> response =
            restTemplate.postForEntity("/api/v1/orders", request, OrderResponse.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.ACCEPTED);
        String orderId = response.getBody().orderId();

        // 2. Wait for the consumer to process the event and persist the order
        await().atMost(Duration.ofSeconds(15))
            .pollInterval(Duration.ofMillis(500))
            .untilAsserted(() -> {
                Optional<Order> saved = orderRepository.findById(UUID.fromString(orderId));
                assertThat(saved).isPresent();
                assertThat(saved.get().getStatus()).isEqualTo(OrderStatus.CONFIRMED);
            });

        // 3. Verify via HTTP read model
        ResponseEntity<OrderResponse> getResponse =
            restTemplate.getForEntity("/api/v1/orders/" + orderId, OrderResponse.class);

        assertThat(getResponse.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(getResponse.getBody().status()).isEqualTo("CONFIRMED");
    }
}
```

## Testing DLT Behavior

When asserting DLT routing, make the consumer strategy explicit in the test fixture. A malformed
JSON case exercises fatal deserialization handling; a business exception with `DefaultErrorHandler`
or `@RetryableTopic` exercises a different path and should be covered separately.

```java
class DltBehaviorTest extends AbstractKafkaIntegrationTest {

    @Autowired
    private KafkaTemplate<String, String> rawKafkaTemplate;  // String value to send malformed JSON

    @Test
    void givenMalformedPayload_whenConsumed_thenRoutesToDlt() {
        String badJson = "{\"not\":\"an order event\"}";

        // Subscribe a raw consumer to the DLT before publishing
        Map<String, Object> consumerConfig = Map.of(
            ConsumerConfig.BOOTSTRAP_SERVERS_CONFIG, kafka.getBootstrapServers(),
            ConsumerConfig.GROUP_ID_CONFIG, "dlt-verify-" + UUID.randomUUID(),
            ConsumerConfig.AUTO_OFFSET_RESET_CONFIG, "earliest",
            ConsumerConfig.KEY_DESERIALIZER_CLASS_CONFIG, StringDeserializer.class,
            ConsumerConfig.VALUE_DESERIALIZER_CLASS_CONFIG, StringDeserializer.class
        );

        try (Consumer<String, String> dltConsumer = new KafkaConsumer<>(consumerConfig)) {
            dltConsumer.subscribe(List.of("orders.DLT"));

            rawKafkaTemplate.send("orders", UUID.randomUUID().toString(), badJson);

            await().atMost(Duration.ofSeconds(30))
                .untilAsserted(() -> {
                    ConsumerRecords<String, String> records =
                        dltConsumer.poll(Duration.ofSeconds(1));
                    assertThat(records.count()).isGreaterThanOrEqualTo(1);

                    ConsumerRecord<String, String> dltRecord = records.iterator().next();
                    String exceptionClass = new String(
                        dltRecord.headers().lastHeader("exception-class").value(),
                        StandardCharsets.UTF_8);
                    assertThat(exceptionClass).contains("JsonParseException");
                });
        }
    }
}
```

## Idempotency Test

```java
class IdempotencyTest extends AbstractIntegrationTest {

    @Autowired
    private KafkaTemplate<String, OrderCreatedEvent> kafkaTemplate;

    @MockitoBean
    private OrderRepository orderRepository;

    @Test
    void givenDuplicateEvent_whenConsumedTwice_thenPersistedOnce() throws Exception {
        String eventId = UUID.randomUUID().toString();
        OrderCreatedEvent event = new OrderCreatedEvent(
            eventId, Instant.now(), "order-1", "customer-1", new BigDecimal("50.00"));

        CountDownLatch latch = new CountDownLatch(1);
        when(orderRepository.existsByEventId(eventId))
            .thenReturn(false)   // first call: not seen yet
            .thenReturn(true);   // second call: already processed

        doAnswer(inv -> { latch.countDown(); return null; })
            .when(orderRepository).save(any());

        // Publish the same event twice
        kafkaTemplate.send("orders", event.orderId(), event);
        kafkaTemplate.send("orders", event.orderId(), event);

        boolean processed = latch.await(10, TimeUnit.SECONDS);

        assertThat(processed).isTrue();
        // Repository.save() called exactly once despite two messages
        verify(orderRepository, times(1)).save(any());
    }
}
```

This pattern verifies consumer-side idempotency, not Kafka exactly-once semantics. Use it when the
real guarantee depends on deduplication in your application state or database.

## Quick Reference

| Scenario              | Test Approach                                                  |
|-----------------------|----------------------------------------------------------------|
| Unit / slice          | `@EmbeddedKafka` + `@MockitoBean` + `CountDownLatch`          |
| Integration           | `TestContainers KafkaContainer` + `@DynamicPropertySource`    |
| Full pipeline         | TestContainers Kafka + Postgres + `MockMvc` + Awaitility      |
| DLT verification      | Raw `KafkaConsumer` on `.DLT` topic + `KafkaTestUtils`        |
| Idempotency           | Send duplicate events, verify `save()` called once            |
| Timing                | Awaitility `await().atMost().untilAsserted()` — never `Thread.sleep()` |
