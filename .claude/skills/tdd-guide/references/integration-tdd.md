# TDD for Integration Tests with TestContainers

## When to Use Integration-Level TDD

Integration tests with `@SpringBootTest` + TestContainers are appropriate when:
- The feature involves database persistence and you need to verify the real query behavior
- Security configuration needs to be verified end-to-end
- A full HTTP → Service → Repository → DB flow needs to be covered
- Liquibase migrations need to be exercised

Integration TDD is slower than unit TDD but provides much higher confidence for persistence and security concerns.

## RED Phase — Write the Failing Integration Test First

```java
@SpringBootTest
@AutoConfigureMockMvc
@Testcontainers
class CreateOrderIntegrationTest {

    @Container
    @ServiceConnection
    static PostgreSQLContainer<?> postgres =
        new PostgreSQLContainer<>("postgres:16-alpine");

    @Autowired
    private MockMvc mockMvc;

    @Test
    void createOrder_persistsAndReturnsCreatedOrder() throws Exception {
        // RED: Write this test before the feature exists

        mockMvc.perform(post("/api/v1/orders")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "customerId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
                      "items": [{"productId": "abc123", "quantity": 2}]
                    }
                    """))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.id").exists())
            .andExpect(jsonPath("$.status").value("PENDING"))
            .andExpect(jsonPath("$.customerId").value("3fa85f64-5717-4562-b3fc-2c963f66afa6"));
    }
}
```

Run `./mvnw test -Dtest=CreateOrderIntegrationTest` → should fail (404 or 500).

## GREEN Phase — Implement Minimum Code to Pass

1. Create entity, repository, service, controller, DTOs
2. Run `./mvnw test -Dtest=CreateOrderIntegrationTest` → should pass

## REFACTOR Phase

After passing:
- Extract common setup to `abstract` base test class
- Replace `String` JSON with test factory methods
- Assess whether the integration test covers enough behavior or needs more cases

## Shared TestContainers Context (for fast CI)

Starting a PostgreSQL container per test class is slow. Share one container across all integration tests:

```java
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
public abstract class AbstractIntegrationTest {

    @Container
    static final PostgreSQLContainer<?> postgres;

    static {
        postgres = new PostgreSQLContainer<>("postgres:16-alpine")
            .withDatabaseName("testdb")
            .withUsername("test")
            .withPassword("test");
        postgres.start();
    }

    @DynamicPropertySource
    static void configureProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", postgres::getJdbcUrl);
        registry.add("spring.datasource.username", postgres::getUsername);
        registry.add("spring.datasource.password", postgres::getPassword);
    }
}
```

Subclass for each feature:
```java
class CreateOrderIntegrationTest extends AbstractIntegrationTest {
    // tests here
}

class GetOrderIntegrationTest extends AbstractIntegrationTest {
    // tests here
}
```

## Transactional Rollback in Integration Tests

Use `@Transactional` on test methods to automatically roll back after each test:

```java
@SpringBootTest
@Transactional   // rolls back after each test — keeps DB clean
class OrderRepositoryIntegrationTest {

    @Autowired
    private OrderRepository orderRepository;

    @Test
    void save_persistsOrder() {
        Order order = new Order(UUID.randomUUID(), "PENDING");
        Order saved = orderRepository.save(order);

        assertThat(saved.getId()).isNotNull();
        assertThat(orderRepository.findById(saved.getId())).isPresent();
    }  // transaction rolled back here
}
```

**Limitation:** `@Transactional` rollback does NOT work with `@SpringBootTest(webEnvironment = RANDOM_PORT)` or when the tested code runs in a separate thread.

## Test Data Setup: Factory Methods over @BeforeEach

```java
// Prefer factory methods over @BeforeEach shared state
class OrderControllerIntegrationTest extends AbstractIntegrationTest {

    @Autowired
    private OrderRepository orderRepository;

    private Order createOrder(String status) {
        Order order = new Order(UUID.randomUUID(), status);
        return orderRepository.save(order);
    }

    @Test
    void getOrder_returnsExistingOrder() throws Exception {
        Order order = createOrder("PENDING");

        mockMvc.perform(get("/api/v1/orders/" + order.getId()))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.status").value("PENDING"));
    }

    @Test
    void cancelOrder_updatesStatusToCancelled() throws Exception {
        Order order = createOrder("PENDING");

        mockMvc.perform(delete("/api/v1/orders/" + order.getId()))
            .andExpect(status().isNoContent());
    }
}
```

## Security Integration Tests

```java
@SpringBootTest
@AutoConfigureMockMvc
@Testcontainers
class SecuredEndpointIntegrationTest extends AbstractIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    @WithMockUser(roles = "USER")
    void createOrder_withValidUser_returns201() throws Exception {
        mockMvc.perform(post("/api/v1/orders")
                .contentType(MediaType.APPLICATION_JSON)
                .content(validOrderJson()))
            .andExpect(status().isCreated());
    }

    @Test
    void createOrder_withoutAuth_returns401() throws Exception {
        mockMvc.perform(post("/api/v1/orders")
                .contentType(MediaType.APPLICATION_JSON)
                .content(validOrderJson()))
            .andExpect(status().isUnauthorized());
    }

    @Test
    @WithMockUser(roles = "GUEST")
    void createOrder_withInsufficientRole_returns403() throws Exception {
        mockMvc.perform(post("/api/v1/orders")
                .contentType(MediaType.APPLICATION_JSON)
                .content(validOrderJson()))
            .andExpect(status().isForbidden());
    }
}
```

## RED-GREEN-REFACTOR Summary for Integration Tests

| Phase | Action | Check |
|-------|--------|-------|
| RED | Write test for new HTTP endpoint behavior | `./mvnw test` → test fails (404/500) |
| GREEN | Implement minimum controller/service/entity/migration | `./mvnw test` → test passes |
| REFACTOR | Extract base class, improve test data setup | `./mvnw test` → still passes |

## Gotchas

- TestContainers containers start once per JVM when using static fields (fast) or once per class when not static (slow). Use static containers in base class.
- `@Transactional` on `@SpringBootTest` does NOT roll back when the test makes real HTTP calls via MockMvc to the application (they run in different transactions).
- `@DynamicPropertySource` overrides `application-test.yml` — check for conflicts.
- Liquibase migrations run on every container start. If migrations are slow, this shows up in test time. Optimize by using the shared container pattern.
- `@ServiceConnection` (Spring Boot 3.1+) is cleaner than `@DynamicPropertySource` for well-known containers (PostgreSQL, Redis, Kafka). Use it when available.
