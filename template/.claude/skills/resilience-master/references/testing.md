# Testing Resilience Behaviors

## Unit Testing Fallback Logic

```java
@ExtendWith(MockitoExtension.class)
class PaymentServiceClientTest {

    @Mock
    private RestClient restClient;

    @InjectMocks
    private PaymentServiceClient client;

    @Test
    void fallback_returnsDefaultResponse_whenServiceUnavailable() {
        // Test fallback method directly (bypasses circuit breaker)
        PaymentRequest request = new PaymentRequest(UUID.randomUUID(), BigDecimal.TEN);
        IOException cause = new IOException("Connection refused");

        PaymentResponse result = client.paymentFallback(request, cause);

        assertThat(result.status()).isEqualTo(PaymentStatus.PENDING);
        assertThat(result.orderId()).isEqualTo(request.orderId());
    }
}
```

Test fallback methods directly as regular methods — no need to simulate circuit state in unit tests.

## Integration Test — Circuit Breaker Behavior with WireMock

```java
@SpringBootTest
@AutoConfigureMockMvc
class CircuitBreakerIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private CircuitBreakerRegistry circuitBreakerRegistry;

    private WireMockServer wireMock;

    @BeforeEach
    void setUp() {
        wireMock = new WireMockServer(WireMockConfiguration.wireMockConfig().dynamicPort());
        wireMock.start();
        // configure RestClient to use wireMock.baseUrl()
    }

    @AfterEach
    void tearDown() {
        wireMock.stop();
        // Reset circuit state between tests
        circuitBreakerRegistry.circuitBreaker("paymentService").reset();
    }

    @Test
    void circuitOpens_afterFailureThreshold() throws Exception {
        // Simulate 10 failures (slidingWindowSize = 10, failureRateThreshold = 50%)
        wireMock.stubFor(post(urlEqualTo("/payments"))
            .willReturn(aResponse().withStatus(503)));

        for (int i = 0; i < 10; i++) {
            mockMvc.perform(post("/api/v1/orders/checkout")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content("""{"orderId": "test-order", "amount": 100}"""))
                .andExpect(status().isAccepted()); // fallback returns 202
        }

        CircuitBreaker.State state = circuitBreakerRegistry
            .circuitBreaker("paymentService").getState();
        assertThat(state).isEqualTo(CircuitBreaker.State.OPEN);
    }

    @Test
    void fallback_returnsPendingStatus_whenCircuitOpen() throws Exception {
        // Force circuit open
        circuitBreakerRegistry.circuitBreaker("paymentService")
            .transitionToOpenState();

        mockMvc.perform(post("/api/v1/orders/checkout")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""{"orderId": "test-order", "amount": 100}"""))
            .andExpect(status().isAccepted())
            .andExpect(jsonPath("$.status").value("PENDING"));
    }

    @Test
    void circuitCloses_afterSuccessfulHalfOpenCalls() throws Exception {
        // Start OPEN
        circuitBreakerRegistry.circuitBreaker("paymentService")
            .transitionToOpenState();

        // Transition to HALF_OPEN
        circuitBreakerRegistry.circuitBreaker("paymentService")
            .transitionToHalfOpenState();

        // Stub successful responses for HALF_OPEN test calls
        wireMock.stubFor(post(urlEqualTo("/payments"))
            .willReturn(okJson("""{"status": "CHARGED", "orderId": "test-order"}""")));

        for (int i = 0; i < 3; i++) {  // permittedNumberOfCallsInHalfOpenState = 3
            mockMvc.perform(post("/api/v1/orders/checkout")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content("""{"orderId": "test-order", "amount": 100}"""))
                .andExpect(status().isOk());
        }

        assertThat(circuitBreakerRegistry.circuitBreaker("paymentService").getState())
            .isEqualTo(CircuitBreaker.State.CLOSED);
    }
}
```

## Testing Retry Behavior

```java
@Test
void retry_retries3Times_thenInvokesFallback() throws Exception {
    // Stub to fail twice, succeed on third attempt
    wireMock.stubFor(get(urlEqualTo("/inventory/PROD-001"))
        .inScenario("retry-test")
        .whenScenarioStateIs(Scenario.STARTED)
        .willReturn(serverError())
        .willSetStateTo("FIRST_FAILURE"));

    wireMock.stubFor(get(urlEqualTo("/inventory/PROD-001"))
        .inScenario("retry-test")
        .whenScenarioStateIs("FIRST_FAILURE")
        .willReturn(serverError())
        .willSetStateTo("SECOND_FAILURE"));

    wireMock.stubFor(get(urlEqualTo("/inventory/PROD-001"))
        .inScenario("retry-test")
        .whenScenarioStateIs("SECOND_FAILURE")
        .willReturn(okJson("""{"productId": "PROD-001", "status": "IN_STOCK"}""")));

    // Act
    mockMvc.perform(get("/api/v1/products/PROD-001/stock"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.status").value("IN_STOCK"));

    // Verify retry happened 3 times
    wireMock.verify(3, getRequestedFor(urlEqualTo("/inventory/PROD-001")));
}
```

## Testing RateLimiter

```java
@Test
void rateLimiter_rejects_whenLimitExceeded() throws Exception {
    // Set rate limit to 2 calls/second for test instance
    // Then fire 3 calls rapidly

    wireMock.stubFor(get(urlEqualTo("/external/api"))
        .willReturn(okJson("""{"result": "ok"}""")));

    // First two succeed
    for (int i = 0; i < 2; i++) {
        mockMvc.perform(get("/api/v1/external-call"))
            .andExpect(status().isOk());
    }

    // Third is rate limited (fallback fires)
    mockMvc.perform(get("/api/v1/external-call"))
        .andExpect(status().isTooManyRequests());
}
```

## Gotchas

- Always reset circuit state in `@AfterEach` or `@BeforeEach` — state persists between tests in the same JVM.
- WireMock scenarios are needed to simulate transient failures for retry testing.
- `transitionToOpenState()` forces the circuit open immediately — useful for testing fallback without needing N failures.
- Testing `TimeLimiter` requires actual async execution with `CompletableFuture`. Use `Thread.sleep()` in the stub to simulate slowness.
- Resilience4j annotation tests require the full Spring context (`@SpringBootTest`) — `@ExtendWith(MockitoExtension.class)` does not activate AOP proxies.
