---
name: resilience-master
description: Implementation guidance for fault tolerance in Spring Boot using Resilience4j circuit breakers, bulkheads, rate limiters, retries, and timeouts. Use when protecting external service calls, preventing cascade failures, implementing fallback strategies, or testing resilience behaviors.
license: MIT
metadata:
  author: local
  version: "1.0.0"
  domain: backend
  triggers:
    - Resilience4j
    - circuit breaker
    - CircuitBreaker
    - bulkhead
    - rate limiter
    - RateLimiter
    - retry
    - Retry
    - TimeLimiter
    - fallback
    - fault tolerance
    - cascade failure
    - half-open
    - @CircuitBreaker
    - @Bulkhead
    - @RateLimiter
    - @Retry
    - @TimeLimiter
    - resilience4j
  role: specialist
  scope: implementation
  output-format: code + guidance
  related-skills: spring-boot-engineer, kafka-master, observability-master, java-architect, tdd-guide
---

# Resilience Master

Implementation guide for protecting Spring Boot services from external failure using Resilience4j patterns without over-engineering simple integrations.

## When to Use
- A service calls an external dependency (REST, gRPC, database, Kafka) that can fail or slow down
- You need to prevent a failing dependency from cascading into a full service outage
- Rate limiting is needed to protect downstream services or comply with third-party API quotas
- You need fallback responses when a dependency is unavailable
- You are writing resilience-focused tests that simulate failures

## When Not to Use
- The task is Kafka-specific retry and DLT handling — use `kafka-master`
- The task is general Spring Boot structure or service wiring — use `spring-boot-master`
- The task is system-level architecture decisions about sync vs async — use `java-architect`
- The service has no external dependencies — do not add resilience patterns speculatively

## Version Assumptions
- Spring Boot 3.x
- Resilience4j 2.x (`resilience4j-spring-boot3`)
- Spring AOP is active (required for annotations)
- Micrometer integration available via `resilience4j-micrometer`

## Reference Guide

| Topic | Reference | Load When |
|------|-----------|-----------|
| CircuitBreaker configuration, state machine, fallback | `references/circuit-breaker.md` | Protecting calls to external services from cascade failure |
| Retry, TimeLimiter, Bulkhead, RateLimiter | `references/retry-and-timeout.md` | Configuring retry backoff, timeout bounds, or concurrency limits |
| Testing resilience behaviors with WireMock and fault injection | `references/testing.md` | Verifying fallback paths and recovery behavior |

## Symptom Triage

| Symptom | Default Check | Likely Fix |
|--------|---------------|------------|
| CircuitBreaker never opens | Is the failure rate threshold met? | Lower `failureRateThreshold` in tests or check exception type is recorded |
| `CallNotPermittedException` in tests | Is circuit in OPEN state before the call? | Reset or wait for `waitDurationInOpenState` |
| Annotation has no effect | Is the class a Spring proxy? | Ensure `@Configuration` + `@EnableAspectJAutoProxy` and call is from outside the bean |
| Retry fires on exceptions that shouldn't retry | Is the exception list configured? | Use `retryExceptions` / `ignoreExceptions` to be explicit |
| Timeout not firing | Is `TimeLimiter` wrapping a blocking call? | `TimeLimiter` only works with `CompletableFuture`; use `@TimeLimiter` + async execution |
| Bulkhead rejects legitimate traffic | Is `maxConcurrentCalls` too low? | Tune based on actual concurrency + add fallback for rejection |

## Resilience Decision Ladder

1. **Is the call to an external service that can fail?** Add `CircuitBreaker`.
2. **Does the call need to retry on transient failures?** Add `Retry` with exponential backoff.
3. **Does the call have a maximum acceptable duration?** Add `TimeLimiter`.
4. **Does the dependency need concurrency protection?** Add `Bulkhead` (thread or semaphore).
5. **Does the service need to protect a downstream quota?** Add `RateLimiter`.
6. **What happens when the circuit is open or call is rejected?** Always define a `fallbackMethod`.

## Quick Mapping

| Situation | Default Move | Prefer Instead Of |
|-----------|--------------|-------------------|
| REST call to third-party API | CircuitBreaker + Retry + TimeLimiter | Raw `RestClient` without guards |
| Transient network failures | Retry with exponential backoff + jitter | Fixed-interval retry loop |
| Slow external database | TimeLimiter + CircuitBreaker | Infinite blocking wait |
| High-concurrency shared resource | Semaphore Bulkhead | Unlimited thread access |
| API quota enforcement | RateLimiter | Manual token bucket logic |
| Circuit open scenario | Defined fallback returning cached/default | Letting exception propagate to user |

## Constraints

### MUST DO

| Rule | Preferred Pattern |
|------|-------------------|
| Always define fallback | `fallbackMethod` for every annotated call |
| Use exponential backoff with jitter | `enableExponentialBackoff: true`, `randomizedWaitFactor: 0.5` |
| Record only expected exception types | `recordExceptions` list in configuration |
| Monitor circuit state via Actuator | `resilience4j.circuitbreaker.instances.*.metrics.enabled: true` |
| Apply smallest necessary scope | Start with CircuitBreaker; add Retry/Bulkhead only if needed |

### MUST NOT DO
- Do not add resilience patterns to internal, in-process calls
- Do not use `@Retry` on methods that have non-idempotent side effects (POST creating resources)
- Do not use `TimeLimiter` on `void` synchronous methods — it requires `CompletableFuture`
- Do not configure without fallback — a circuit opening without fallback still throws to the caller
- Do not set `waitDurationInOpenState` too short in production — it defeats the purpose

## Gotchas

- Resilience4j annotations work only on Spring proxies. Self-invocation (calling from within the same bean) bypasses the pattern.
- The annotation order matters when stacking: `@CircuitBreaker` + `@Retry` — Retry wraps CircuitBreaker by default in Resilience4j.
- `TimeLimiter` does not cancel a blocking thread; it cancels the `Future`. The underlying thread may still run.
- `Bulkhead` in thread pool mode creates a separate thread pool; ensure the thread count is tuned per integration.
- Circuit breaker state is in-memory per instance. Across multiple pods, each pod has its own state — this is expected behavior.
- Retry on non-idempotent operations (e.g., payment processing) can cause duplicate transactions without idempotency keys.

## Minimal Examples

### application.yml — circuit breaker config
```yaml
resilience4j:
  circuitbreaker:
    instances:
      paymentService:
        registerHealthIndicator: true
        slidingWindowSize: 10
        failureRateThreshold: 50
        waitDurationInOpenState: 10s
        permittedNumberOfCallsInHalfOpenState: 3
        recordExceptions:
          - java.io.IOException
          - java.util.concurrent.TimeoutException
  retry:
    instances:
      paymentService:
        maxAttempts: 3
        waitDuration: 500ms
        enableExponentialBackoff: true
        exponentialBackoffMultiplier: 2
        randomizedWaitFactor: 0.5
        retryExceptions:
          - java.io.IOException
```

### Service with CircuitBreaker + Retry + fallback
```java
@Service
public class PaymentServiceClient {

    private final RestClient restClient;

    public PaymentServiceClient(RestClient restClient) {
        this.restClient = restClient;
    }

    @CircuitBreaker(name = "paymentService", fallbackMethod = "paymentFallback")
    @Retry(name = "paymentService")
    public PaymentResponse charge(PaymentRequest request) {
        return restClient.post()
            .uri("/payments")
            .body(request)
            .retrieve()
            .body(PaymentResponse.class);
    }

    private PaymentResponse paymentFallback(PaymentRequest request, Exception ex) {
        log.warn("Payment service unavailable, returning fallback. Cause: {}", ex.getMessage());
        return PaymentResponse.pending(request.orderId());
    }
}
```

### pom.xml dependency
```xml
<dependency>
    <groupId>io.github.resilience4j</groupId>
    <artifactId>resilience4j-spring-boot3</artifactId>
</dependency>
```

## What to Verify
- Fallback fires when the circuit is open (simulate with WireMock fault injection)
- Retry does not fire on non-retryable exceptions
- Circuit opens after reaching `failureRateThreshold` within the sliding window
- Resilience4j metrics appear in `/actuator/metrics` (requires `resilience4j-micrometer`)
- Unit tests verify fallback behavior; integration tests verify state transitions

## See References
- `references/circuit-breaker.md` for state machine, configuration properties, and fallback patterns
- `references/retry-and-timeout.md` for Retry backoff, TimeLimiter async usage, and Bulkhead/RateLimiter
- `references/testing.md` for WireMock fault injection, state verification, and resilience integration tests
