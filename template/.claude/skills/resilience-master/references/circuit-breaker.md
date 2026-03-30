# Resilience4j CircuitBreaker

## Dependency

```xml
<dependency>
    <groupId>io.github.resilience4j</groupId>
    <artifactId>resilience4j-spring-boot3</artifactId>
</dependency>
<!-- Metrics integration -->
<dependency>
    <groupId>io.github.resilience4j</groupId>
    <artifactId>resilience4j-micrometer</artifactId>
</dependency>
```

## application.yml Configuration

```yaml
resilience4j:
  circuitbreaker:
    instances:
      paymentService:
        # When to open
        slidingWindowType: COUNT_BASED       # or TIME_BASED
        slidingWindowSize: 10               # last 10 calls evaluated
        failureRateThreshold: 50            # 50% failures → OPEN
        slowCallDurationThreshold: 2s       # calls > 2s counted as slow
        slowCallRateThreshold: 80           # 80% slow calls → OPEN

        # How long to stay open
        waitDurationInOpenState: 10s        # wait before trying HALF_OPEN

        # HALF_OPEN behavior
        permittedNumberOfCallsInHalfOpenState: 3
        automaticTransitionFromOpenToHalfOpenEnabled: true

        # What counts as failure
        recordExceptions:
          - java.io.IOException
          - java.util.concurrent.TimeoutException
          - feign.FeignException
        ignoreExceptions:
          - vn.lukepham.projects.exception.BusinessException  # don't count business errors

        # Metrics
        registerHealthIndicator: true
        writableStackTraceEnabled: false    # reduce log noise in OPEN state
```

## State Machine

```
CLOSED ──(failure rate > threshold)──► OPEN ──(waitDuration elapsed)──► HALF_OPEN
  ▲                                                                          │
  │                    success rate > threshold                              │
  └──────────────────────────────────────────────────────────────────────────┘
                        failure rate > threshold ──────────────────────► OPEN
```

- **CLOSED**: Normal operation. Tracks failure rate in sliding window.
- **OPEN**: All calls rejected immediately with `CallNotPermittedException`. Fallback fires.
- **HALF_OPEN**: Allows N test calls. If they succeed, transitions to CLOSED. If they fail, back to OPEN.

## Service Implementation

```java
@Service
public class PaymentServiceClient {

    private static final Logger log = LoggerFactory.getLogger(PaymentServiceClient.class);
    private final RestClient restClient;

    public PaymentServiceClient(RestClient restClient) {
        this.restClient = restClient;
    }

    @CircuitBreaker(name = "paymentService", fallbackMethod = "paymentFallback")
    public PaymentResponse charge(PaymentRequest request) {
        return restClient.post()
            .uri("/payments")
            .body(request)
            .retrieve()
            .body(PaymentResponse.class);
    }

    private PaymentResponse paymentFallback(PaymentRequest request, CallNotPermittedException ex) {
        log.warn("Circuit OPEN for paymentService, using fallback");
        return PaymentResponse.pending(request.orderId());
    }

    private PaymentResponse paymentFallback(PaymentRequest request, Exception ex) {
        log.warn("Payment service error, using fallback. Cause: {}", ex.getMessage());
        return PaymentResponse.pending(request.orderId());
    }
}
```

**Fallback method signature rules:**
- Same return type as the protected method
- Same parameters as the protected method + the exception as last parameter
- Can have multiple fallback methods for different exception types (most specific wins)

## Monitoring Circuit State

```yaml
management:
  health:
    circuitbreakers:
      enabled: true
```

Check health: `GET /actuator/health` — shows `paymentService` as UP/UNKNOWN/DOWN.

Check metrics via Prometheus:
```
resilience4j_circuitbreaker_state{name="paymentService"}
resilience4j_circuitbreaker_calls_total{name="paymentService", kind="successful"}
resilience4j_circuitbreaker_calls_total{name="paymentService", kind="failed"}
resilience4j_circuitbreaker_not_permitted_calls_total{name="paymentService"}
```

## Programmatic Access (optional)

```java
@Component
public class CircuitBreakerMonitor {

    private final CircuitBreakerRegistry registry;

    public CircuitBreakerMonitor(CircuitBreakerRegistry registry) {
        this.registry = registry;
    }

    public CircuitBreaker.State getState(String name) {
        return registry.circuitBreaker(name).getState();
    }
}
```

## Gotchas

- `@CircuitBreaker` only works on **public methods** of **Spring beans** (AOP proxy). Self-invocation bypasses it.
- `recordExceptions` defaults to all exceptions if not specified — be explicit to avoid recording business exceptions.
- `CallNotPermittedException` is thrown when the circuit is OPEN. Provide a dedicated fallback for it.
- Circuit state is per-instance, per-JVM process. In multi-pod deployments each pod has independent state — this is by design.
- `waitDurationInOpenState` too short means the circuit will flip rapidly. Start with 10–30s.
- When testing, reset circuit state between tests: `CircuitBreakerRegistry.circuitBreaker(name).reset()`.
