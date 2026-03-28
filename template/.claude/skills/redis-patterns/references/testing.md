# Testing Reference

## Required Test Dependencies

```xml
<dependency>
    <groupId>org.awaitility</groupId>
    <artifactId>awaitility</artifactId>
    <scope>test</scope>
</dependency>

<dependency>
    <groupId>org.testcontainers</groupId>
    <artifactId>testcontainers</artifactId>
    <scope>test</scope>
</dependency>
```

The examples below use `GenericContainer<?>` directly because there is no standard dedicated Redis
Testcontainers module in the main Testcontainers distribution. If your codebase wraps that in a
local `RedisContainer` helper, document the helper explicitly instead of assuming it exists.

## TestContainers Redis

Abstract base class shared across all Redis integration tests:

```java
@SpringBootTest
@Testcontainers
public abstract class AbstractRedisIntegrationTest {

    @Container
    static final GenericContainer<?> REDIS = new GenericContainer<>(
        DockerImageName.parse("redis:7-alpine")
    )
        .withExposedPorts(6379)
        .withReuse(true);

    @DynamicPropertySource
    static void redisProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.data.redis.host", REDIS::getHost);
        registry.add("spring.data.redis.port", () -> REDIS.getMappedPort(6379));
    }
}
```

`withReuse(true)` keeps the container running between test classes, dramatically reducing test suite startup time. Requires `testcontainers.reuse.enable=true` in `~/.testcontainers.properties`.

## @DataRedisTest Slice

Loads only Spring Data Redis infrastructure — no web layer, no JPA, no service beans.

```java
@DataRedisTest
@Import(RedisTemplateConfig.class)   // import your RedisTemplate @Configuration
@Testcontainers
class UserSessionRepositoryTest {

    @Container
    static final GenericContainer<?> REDIS = new GenericContainer<>(
        DockerImageName.parse("redis:7-alpine")
    ).withExposedPorts(6379).withReuse(true);

    @DynamicPropertySource
    static void redisProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.data.redis.host", REDIS::getHost);
        registry.add("spring.data.redis.port", () -> REDIS.getMappedPort(6379));
    }

    @Autowired
    private UserSessionRepository sessionRepository;

    @BeforeEach
    void clearRedis(@Autowired RedisTemplate<String, Object> redisTemplate) {
        redisTemplate.getConnectionFactory()
            .getConnection()
            .serverCommands()
            .flushDb();
    }

    @Test
    void shouldPersistAndRetrieveSession() {
        UserSession session = new UserSession(
            UUID.randomUUID().toString(),
            UUID.randomUUID(),
            "user@example.com",
            List.of("ROLE_USER")
        );

        sessionRepository.save(session);

        Optional<UserSession> found = sessionRepository.findById(session.getSessionId());
        assertThat(found).isPresent();
        assertThat(found.get().getEmail()).isEqualTo("user@example.com");
    }
}
```

`@DataRedisTest` loads: `RedisTemplate`, `StringRedisTemplate`, `@RedisHash` repositories, connection factory.
`@DataRedisTest` does NOT load: `@Service`, `@Controller`, `@Repository` (JPA), full `ApplicationContext`.

## Testing @Cacheable Behavior (Cache Hit/Miss)

```java
@SpringBootTest
@Testcontainers
class ProductServiceCacheTest extends AbstractRedisIntegrationTest {

    @MockitoBean                          // Spring Boot 3.4+ (replaces @MockBean)
    private ProductRepository productRepository;

    @Autowired
    private ProductService productService;

    @Autowired
    private RedisTemplate<String, Object> redisTemplate;

    @BeforeEach
    void clearCache() {
        redisTemplate.getConnectionFactory()
            .getConnection()
            .serverCommands()
            .flushDb();
    }

    @Test
    void findById_shouldReturnCachedResultOnSecondCall() {
        UUID productId = UUID.randomUUID();
        ProductResponse expected = new ProductResponse(productId, "Widget", new BigDecimal("9.99"));

        when(productRepository.findById(productId))
            .thenReturn(Optional.of(new Product(productId, "Widget", new BigDecimal("9.99"))));

        // First call — cache miss, hits repository
        ProductResponse first = productService.findById(productId);
        // Second call — cache hit, does NOT hit repository
        ProductResponse second = productService.findById(productId);

        assertThat(first).isEqualTo(expected);
        assertThat(second).isEqualTo(expected);
        // Repository was called exactly once despite two service calls
        verify(productRepository, times(1)).findById(productId);
    }
}
```

## Testing @CacheEvict

```java
@Test
void update_shouldEvictCacheEntryAndForceFreshLoad() {
    UUID productId = UUID.randomUUID();
    Product original = new Product(productId, "Widget", new BigDecimal("9.99"));
    Product updated  = new Product(productId, "Widget Pro", new BigDecimal("19.99"));

    when(productRepository.findById(productId))
        .thenReturn(Optional.of(original))
        .thenReturn(Optional.of(updated));
    when(productRepository.save(any())).thenReturn(updated);

    // 1. Populate cache
    productService.findById(productId);

    // 2. Evict via update
    productService.update(productId, new UpdateProductRequest("Widget Pro", new BigDecimal("19.99")));

    // 3. Next read must go to repository (cache was evicted)
    ProductResponse result = productService.findById(productId);

    assertThat(result.name()).isEqualTo("Widget Pro");
    // Called twice: once before eviction, once after
    verify(productRepository, times(2)).findById(productId);
}
```

## Testing TTL Expiry

Use short TTL (1–2 seconds) exclusively for TTL tests, configured via `@TestPropertySource` or a dedicated test profile. Do NOT change production TTL.

```java
@SpringBootTest
@TestPropertySource(properties = "app.cache.product-ttl=PT2S") // 2 seconds
@Testcontainers
class ProductCacheTtlTest extends AbstractRedisIntegrationTest {

    @MockitoBean
    private ProductRepository productRepository;

    @Autowired
    private ProductService productService;

    @Autowired
    private RedisTemplate<String, Object> redisTemplate;

    @BeforeEach
    void clearCache() {
        redisTemplate.getConnectionFactory()
            .getConnection()
            .serverCommands()
            .flushDb();
    }

    @Test
    void findById_shouldHitRepositoryAgainAfterTtlExpiry() {
        UUID productId = UUID.randomUUID();
        when(productRepository.findById(productId))
            .thenReturn(Optional.of(new Product(productId, "Widget", new BigDecimal("9.99"))));

        productService.findById(productId);              // populates cache
        verify(productRepository, times(1)).findById(productId);

        await()
            .atMost(Duration.ofSeconds(15))
            .pollInterval(Duration.ofMillis(500))
            .untilAsserted(() -> {
                productService.findById(productId);      // should miss after TTL
                verify(productRepository, times(2)).findById(productId);
            });
    }
}
```

Require `org.awaitility:awaitility` on the test classpath.

## Testing RedisTemplate Operations

```java
@DataRedisTest
@Import(RedisTemplateConfig.class)
@Testcontainers
class TokenStoreTest {

    @Container
    static final GenericContainer<?> REDIS = new GenericContainer<>(
        DockerImageName.parse("redis:7-alpine")
    ).withExposedPorts(6379).withReuse(true);

    @DynamicPropertySource
    static void redisProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.data.redis.host", REDIS::getHost);
        registry.add("spring.data.redis.port", () -> REDIS.getMappedPort(6379));
    }

    @Autowired
    private RedisTemplate<String, Object> redisTemplate;

    private TokenStore tokenStore;

    @BeforeEach
    void setUp() {
        tokenStore = new TokenStore(redisTemplate);
        redisTemplate.getConnectionFactory()
            .getConnection()
            .serverCommands()
            .flushDb();
    }

    @Test
    void shouldStoreAndRetrieveToken() {
        String token = UUID.randomUUID().toString();
        TokenPayload payload = new TokenPayload(UUID.randomUUID(), "user@example.com");

        tokenStore.store(token, payload, Duration.ofMinutes(5));

        Optional<TokenPayload> found = tokenStore.find(token);
        assertThat(found).isPresent();
        assertThat(found.get().email()).isEqualTo("user@example.com");
    }

    @Test
    void shouldReturnEmptyAfterTokenRevocation() {
        String token = UUID.randomUUID().toString();
        tokenStore.store(token, new TokenPayload(UUID.randomUUID(), "x@example.com"), Duration.ofMinutes(5));

        tokenStore.revoke(token);

        assertThat(tokenStore.find(token)).isEmpty();
    }

    @Test
    void setIfAbsent_shouldOnlySucceedOnce() {
        String key = "idempotency:" + UUID.randomUUID();
        Boolean first  = redisTemplate.opsForValue().setIfAbsent(key, "processed", Duration.ofMinutes(10));
        Boolean second = redisTemplate.opsForValue().setIfAbsent(key, "processed", Duration.ofMinutes(10));

        assertThat(first).isTrue();
        assertThat(second).isFalse();
    }
}
```

## Testing Pub/Sub

Do not add mutable test hooks like `setOnReceive(...)` to a production `@Component` just to make pub/sub tests observable. Keep observability in test-only listeners or assert a real side effect.

```java
@SpringBootTest
@Testcontainers
class OrderEventPubSubTest extends AbstractRedisIntegrationTest {

    @Autowired
    private OrderEventPublisher publisher;

    @Autowired
    private TestOrderEventListener testListener;

    @Test
    void shouldDeliverPublishedEventToSubscriber() throws InterruptedException {
        CountDownLatch latch = new CountDownLatch(1);
        OrderEvent expected = new OrderEvent(UUID.randomUUID(), "ORDER_PLACED");

        testListener.expect(expected.orderId(), latch);

        publisher.publish(expected);

        boolean received = latch.await(5, TimeUnit.SECONDS);
        assertThat(received).as("Event should have been received within 5 seconds").isTrue();
    }
}
```

Register the test listener in a test-only configuration instead of modifying the production message handler:

```java
@TestConfiguration
class RedisPubSubTestConfig {

    @Bean
    TestOrderEventListener testOrderEventListener(ObjectMapper objectMapper) {
        return new TestOrderEventListener(objectMapper);
    }

    @Bean
    MessageListenerAdapter testOrderEventListenerAdapter(TestOrderEventListener listener) {
        return new MessageListenerAdapter(listener, "onMessage");
    }

    @Bean
    RedisMessageListenerContainer testRedisMessageListenerContainer(
        RedisConnectionFactory connectionFactory,
        MessageListenerAdapter testOrderEventListenerAdapter,
        ChannelTopic orderEventsTopic
    ) {
        RedisMessageListenerContainer container = new RedisMessageListenerContainer();
        container.setConnectionFactory(connectionFactory);
        container.addMessageListener(testOrderEventListenerAdapter, orderEventsTopic);
        return container;
    }
}

final class TestOrderEventListener {

    private final ObjectMapper objectMapper;
    private volatile UUID expectedOrderId;
    private volatile CountDownLatch latch;

    TestOrderEventListener(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    void expect(UUID orderId, CountDownLatch latch) {
        this.expectedOrderId = orderId;
        this.latch = latch;
    }

    public void onMessage(Message message, byte[] pattern) {
        try {
            OrderEvent event = objectMapper.readValue(message.getBody(), OrderEvent.class);
            CountDownLatch currentLatch = latch;
            UUID currentExpectedOrderId = expectedOrderId;
            if (currentLatch != null && currentExpectedOrderId != null && currentExpectedOrderId.equals(event.orderId())) {
                currentLatch.countDown();
            }
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
    }
}
```

## Reset State Between Tests

Always flush Redis before each test to prevent state leakage:

```java
@BeforeEach
void clearRedis() {
    redisTemplate.getConnectionFactory()
        .getConnection()
        .serverCommands()
        .flushDb();
}
```

Prefer `flushDb()` over `flushAll()` so a reused container does not wipe unrelated Redis databases.

For slice tests that don't have `RedisTemplate` injected, autowire `RedisConnectionFactory` directly:

```java
@BeforeEach
void clearRedis(@Autowired RedisConnectionFactory factory) {
    factory.getConnection().serverCommands().flushDb();
}
```

## Quick Reference

| Scenario | Approach |
|---|---|
| Unit test (no Redis) | Mock `RedisTemplate` via `@MockitoBean` |
| Repository slice | `@DataRedisTest` + `@Import(RedisConfig.class)` + TestContainers |
| Full integration cache test | `@SpringBootTest` + `@MockitoBean` repository + TestContainers |
| TTL expiry | Short TTL via `@TestPropertySource` + Awaitility |
| Pub/Sub | `CountDownLatch` with timeout assertion |
| Concurrent / race conditions | `ExecutorService` + `CyclicBarrier` + `CountDownLatch` |
| Distributed lock | Assert `tryLock` returns empty when lock is held |

## Gotchas

- There is no standard dedicated Redis Testcontainers module in the main distribution, so examples should not assume a magic `RedisContainer` helper exists.
- Use `flushDb()` in test cleanup, not `flushAll()`, unless the test truly owns every Redis database in the environment.
- Do not mutate production listeners just to make pub/sub tests observable; keep test-specific listeners/configuration in test scope.
