# TDD Patterns — Java Spring Boot

## Test Naming Convention

```java
// Pattern: methodUnderTest_scenario_expectedOutcome
void createOrder_whenItemsEmpty_returns400()
void createOrder_whenCustomerNotFound_throwsNotFoundException()
void createOrder_validRequest_persistsOrderAndReturns201()
```

## Factory Methods for Test Data (no shared @BeforeEach state)

```java
// ✅ Factory methods — independent, readable
private CreateOrderRequest aValidOrderRequest() {
    return new CreateOrderRequest(
        UUID.randomUUID(),
        List.of(new OrderItem(productId, 2, BigDecimal.TEN))
    );
}

private CreateOrderRequest anOrderRequestWithNoItems() {
    return new CreateOrderRequest(UUID.randomUUID(), List.of());
}
```

## Full RED-GREEN-REFACTOR Example

### Step 1: RED — write the failing test

```java
@Test
@WithMockUser
void createOrder_whenItemsEmpty_returns400() throws Exception {
    var request = anOrderRequestWithNoItems();

    mockMvc.perform(post("/api/v1/orders")
            .with(csrf())
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(request)))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.items").exists());
}
```

Run: fails with 404 (endpoint doesn't exist). **That's the right failure.**

### Step 2: GREEN — minimal production code

```java
public record CreateOrderRequest(
    @NotNull UUID customerId,
    @NotNull @Size(min = 1, message = "must not be empty") List<OrderItem> items
) {}

@PostMapping
@ResponseStatus(HttpStatus.CREATED)
OrderResponse createOrder(@Valid @RequestBody CreateOrderRequest request) {
    return orderService.createOrder(request);
}
```

Run: test goes green. Move on.

### Step 3: REFACTOR — assess only

No duplication, naming is clear. Skip refactor, commit, move to next RED.

---

## Negative Tests Checklist

For every feature, cover at minimum:
- Missing required field → 400
- Invalid format (bad UUID, negative quantity) → 400
- Not found (unknown ID) → 404
- Unauthorized (no auth) → 401
- Forbidden (wrong role) → 403

```java
@Test
void createOrder_whenNotAuthenticated_returns401() throws Exception {
    mockMvc.perform(post("/api/v1/orders")
            .contentType(MediaType.APPLICATION_JSON)
            .content("{}"))
        .andExpect(status().isUnauthorized());
}

@Test
@WithMockUser
void createOrder_whenCustomerIdNull_returns400() throws Exception {
    var request = new CreateOrderRequest(null, items);

    mockMvc.perform(post("/api/v1/orders")
            .with(csrf())
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(request)))
        .andExpect(status().isBadRequest());
}
```

---

## Repository Layer (DataJpaTest + TestContainers)

```java
@DataJpaTest
@Testcontainers
@AutoConfigureTestDatabase(replace = Replace.NONE)
class OrderRepositoryTest {

    @Container
    static PostgreSQLContainer<?> postgres =
        new PostgreSQLContainer<>("postgres:16-alpine");

    @DynamicPropertySource
    static void props(DynamicPropertyRegistry r) {
        r.add("spring.datasource.url", postgres::getJdbcUrl);
        r.add("spring.datasource.username", postgres::getUsername);
        r.add("spring.datasource.password", postgres::getPassword);
    }

    @Autowired TestEntityManager em;
    @Autowired OrderRepository repo;

    @Test
    void findByCustomerId_returnsOnlyMatchingOrders() {
        var customerId = UUID.randomUUID();
        var otherCustomerId = UUID.randomUUID();
        em.persist(anOrder(customerId));
        em.persist(anOrder(otherCustomerId));
        em.flush();

        var result = repo.findByCustomerId(customerId);

        assertThat(result).hasSize(1);
        assertThat(result.get(0).getCustomerId()).isEqualTo(customerId);
    }
}
```

---

## Shared TestContainers (avoid restart overhead)

```java
// AbstractIntegrationTest.java
public abstract class AbstractIntegrationTest {

    static final PostgreSQLContainer<?> POSTGRES =
        new PostgreSQLContainer<>("postgres:16-alpine").withReuse(true);

    static {
        POSTGRES.start();
    }

    @DynamicPropertySource
    static void props(DynamicPropertyRegistry r) {
        r.add("spring.datasource.url", POSTGRES::getJdbcUrl);
        r.add("spring.datasource.username", POSTGRES::getUsername);
        r.add("spring.datasource.password", POSTGRES::getPassword);
    }
}

// Usage
@SpringBootTest(webEnvironment = WebEnvironment.RANDOM_PORT)
class OrderIntegrationTest extends AbstractIntegrationTest {
    // ...
}
```

---

## Service Layer (Pure Unit Test)

```java
@ExtendWith(MockitoExtension.class)
class OrderServiceTest {

    @Mock OrderRepository orderRepository;
    @Mock OrderMapper orderMapper;
    @InjectMocks OrderServiceImpl orderService;

    @Test
    void createOrder_whenValid_savesAndReturnsResponse() {
        var request = aValidOrderRequest();
        var entity = anOrderEntity();
        var response = anOrderResponse();
        when(orderMapper.toEntity(request)).thenReturn(entity);
        when(orderRepository.save(entity)).thenReturn(entity);
        when(orderMapper.toResponse(entity)).thenReturn(response);

        var result = orderService.createOrder(request);

        assertThat(result).isEqualTo(response);
        verify(orderRepository).save(entity);
    }

    @Test
    void createOrder_whenRepositoryFails_propagatesException() {
        var request = aValidOrderRequest();
        when(orderMapper.toEntity(any())).thenReturn(anOrderEntity());
        when(orderRepository.save(any())).thenThrow(new DataIntegrityViolationException("dup"));

        assertThatThrownBy(() -> orderService.createOrder(request))
            .isInstanceOf(DataIntegrityViolationException.class);
    }
}
```

---

## TDD Decision Tree

```
New feature request
│
├── Start with @WebMvcTest for the endpoint
│   RED: test the HTTP contract
│   GREEN: add controller + stub service
│
├── Then @ExtendWith(MockitoExtension) for service logic
│   RED: test business rules
│   GREEN: implement service
│
├── Then @DataJpaTest for custom queries
│   RED: test the query result
│   GREEN: implement repository method
│
└── Finally @SpringBootTest for full integration
    RED: end-to-end happy path + key failure path
    GREEN: wire everything together
```

---

## Test Isolation Rules

1. Each test must be independent — no shared mutable state
2. Database tests: use `@Transactional` to roll back, or clean up in `@AfterEach`
3. Never test two behaviors in one test method
4. One `assertThat` cluster per test (can have multiple assertions on the same object)
