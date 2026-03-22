---
name: tdd-guide
description: Guides Test-Driven Development using the red-green-refactor loop for Java Spring Boot applications. Covers unit tests, slice tests (WebMvcTest, DataJpaTest), and integration tests with TestContainers. Use when building features or fixing bugs test-first, when user mentions "red-green-refactor", wants TDD, integration tests, or test-first development in Java/Spring Boot.
license: MIT
metadata:
  author: local
  version: "1.0.0"
  domain: testing
  triggers: TDD, test-driven, red-green-refactor, failing test, test first, integration test, unit test, MockMvc, TestContainers
  role: workflow
  scope: process
  output-format: code + guidance
  related-skills: spring-boot-engineer, java-architect, java-code-review
---

# TDD Guide — Java Spring Boot

## The Loop (non-negotiable)

```
RED   → Write a failing test that describes the behavior
GREEN → Write the MINIMUM code to make it pass
REFACTOR → Improve the code without changing behavior
         (commit before refactoring)
```

Never write production code without a RED test first.

## Workflow Checklist

- [ ] Identify the behavior to add (one small slice)
- [ ] **RED**: Write a test → run it → confirm it fails for the right reason
- [ ] **GREEN**: Write minimal production code → run test → confirm it passes
- [ ] **REFACTOR**: Ask "is there a cleaner way?" → refactor only if it adds value
- [ ] Commit on green before the next RED
- [ ] Repeat for the next behavior slice

## Choose the Right Test Type

| Layer | Annotation | Use When |
|-------|-----------|----------|
| Controller | `@WebMvcTest` | HTTP routing, request/response mapping, validation |
| Repository | `@DataJpaTest` + TestContainers | Custom queries, data integrity |
| Service | JUnit 5 + Mockito | Business logic, edge cases |
| End-to-end | `@SpringBootTest` + TestContainers | Full feature verification |
| Kafka Consumer | `@SpringBootTest` + `@EmbeddedKafka` | Message routing, retry/DLT behavior, consumer verification |
| Redis Cache | `@SpringBootTest` + TestContainers Redis | Cache hit/miss, TTL expiry, eviction after write |

Prefer the narrowest test that covers the behavior.

## RED — Write the Failing Test

Start with the HTTP layer for new features:

```java
@WebMvcTest(OrderController.class)
class OrderControllerTest {

    @Autowired MockMvc mockMvc;
    @Autowired ObjectMapper objectMapper;
    @MockitoBean OrderService orderService;   // Spring Boot 3.4+

    @Test
    @WithMockUser
    void createOrder_validRequest_returns201() throws Exception {
        var request = new CreateOrderRequest(customerId, items);
        var response = new OrderResponse(orderId, customerId, OrderStatus.PENDING);
        when(orderService.createOrder(any())).thenReturn(response);

        mockMvc.perform(post("/api/v1/orders")
                .with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.status").value("PENDING"));
    }
}
```

Run test. **It must fail with a compilation error or 404 — not a test logic error.**

## GREEN — Minimal Production Code

Add only what is needed to pass. No extra logic, no "future-proofing":

```java
@RestController
@RequestMapping("/api/v1/orders")
class OrderController {
    private final OrderService orderService;

    OrderController(OrderService orderService) {
        this.orderService = orderService;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    OrderResponse createOrder(@Valid @RequestBody CreateOrderRequest request) {
        return orderService.createOrder(request);
    }
}
```

Run test. **It must go green.**

## REFACTOR — Improve Without Breaking

Only refactor when there is clear value. Ask:
- Is there duplication?
- Is naming unclear?
- Is the structure awkward?

If no: skip the refactor step and move to the next RED.

## Integration Test (full slice)

Add an integration test once the unit tests are green:

```java
@SpringBootTest(webEnvironment = WebEnvironment.RANDOM_PORT)
@Testcontainers
class OrderIntegrationTest {

    @Container
    static PostgreSQLContainer<?> postgres =
        new PostgreSQLContainer<>("postgres:16-alpine");

    @DynamicPropertySource
    static void props(DynamicPropertyRegistry r) {
        r.add("spring.datasource.url", postgres::getJdbcUrl);
        r.add("spring.datasource.username", postgres::getUsername);
        r.add("spring.datasource.password", postgres::getPassword);
    }

    @Autowired TestRestTemplate rest;

    @Test
    void createOrder_persistsAndReturns() {
        var request = new CreateOrderRequest(/* ... */);
        var response = rest.postForEntity("/api/v1/orders", request, OrderResponse.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        assertThat(response.getBody().id()).isNotNull();
    }
}
```

## Kafka TDD Flow

**RED:** Write a test that produces a Kafka message and asserts a downstream effect (DB write, service call):
```java
@Test
void orderCreated_event_persistsToDatabase() throws Exception {
    CountDownLatch latch = new CountDownLatch(1);
    doAnswer(inv -> { latch.countDown(); return null; })
        .when(orderService).processOrder(any());

    kafkaTemplate.send("orders", new OrderCreatedEvent(orderId, customerId));

    assertThat(latch.await(5, TimeUnit.SECONDS)).isTrue();
    verify(orderService).processOrder(any());
}
```
This fails because no `@KafkaListener` exists yet.

**GREEN:** Add the minimal `@KafkaListener` that calls the service.

**Rule:** Never use `Thread.sleep()` — always `CountDownLatch` or `Awaitility`.

## Redis Cache TDD Flow

**RED:** Call a service method twice, assert the repository is called only once:
```java
@Test
void findProduct_cachedAfterFirstCall_repositoryCalledOnce() {
    when(productRepository.findById(1L)).thenReturn(Optional.of(product));

    productService.findById(1L);
    productService.findById(1L);  // second call should hit cache

    verify(productRepository, times(1)).findById(1L);
}
```
This fails because no `@Cacheable` exists yet — repository called twice.

**GREEN:** Add `@Cacheable("products")` to the service method + `@EnableCaching` on a config class.

## Anti-patterns (never do these)

- Writing production code before a failing test exists
- Tests that only test the happy path (always add at least one negative test)
- Mocking what you own (mock external dependencies, not your own services in integration tests)
- Shared mutable state in `@BeforeEach` — use factory methods instead
- Skipping the REFACTOR assessment (even if you decide not to refactor, always assess)
- Testing Kafka consumers with `Thread.sleep()` to wait for processing — use `CountDownLatch` or Awaitility instead
- Using `ozimov/embedded-redis` or `it.ozimov:embedded-redis` — library abandoned, incompatible with Java 17; use TestContainers Redis

## Reference

Detailed patterns and examples: [patterns.md](references/patterns.md)
