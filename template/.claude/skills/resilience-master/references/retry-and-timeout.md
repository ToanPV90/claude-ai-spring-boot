# Retry, TimeLimiter, Bulkhead, RateLimiter

## Retry

### Configuration

```yaml
resilience4j:
  retry:
    instances:
      inventoryService:
        maxAttempts: 3
        waitDuration: 500ms
        enableExponentialBackoff: true
        exponentialBackoffMultiplier: 2        # 500ms → 1000ms → 2000ms
        randomizedWaitFactor: 0.5              # adds jitter ±50%
        retryExceptions:
          - java.io.IOException
          - java.util.concurrent.TimeoutException
        ignoreExceptions:
          - vn.lukepham.projects.exception.BusinessException
```

### Usage

```java
@Retry(name = "inventoryService", fallbackMethod = "inventoryFallback")
public InventoryStatus checkStock(String productId) {
    return inventoryClient.getStock(productId);
}

private InventoryStatus inventoryFallback(String productId, Exception ex) {
    log.warn("Inventory service unavailable after retries for product {}", productId);
    return InventoryStatus.unknown(productId);
}
```

### Stacking with CircuitBreaker

```java
@CircuitBreaker(name = "inventoryService", fallbackMethod = "inventoryFallback")
@Retry(name = "inventoryService")
public InventoryStatus checkStock(String productId) {
    return inventoryClient.getStock(productId);
}
```

**Order:** Retry wraps CircuitBreaker. Each retry attempt goes through the circuit breaker check.

### ⚠ Non-idempotent operations

**Never** add `@Retry` to methods with non-idempotent side effects:
```java
// BAD — creates duplicate payments on retry
@Retry(name = "paymentService")
public PaymentResponse charge(PaymentRequest request) { ... }
```

Use idempotency keys instead:
```java
@Retry(name = "paymentService")
public PaymentResponse charge(PaymentRequest request) {
    // request.idempotencyKey() ensures payment is only charged once
    return gateway.chargeWithIdempotencyKey(request);
}
```

## TimeLimiter

TimeLimiter only works with `CompletableFuture`. It interrupts the future, not the underlying thread.

### Configuration

```yaml
resilience4j:
  timelimiter:
    instances:
      reportService:
        timeoutDuration: 3s
        cancelRunningFuture: true
```

### Usage with @Async

```java
@Service
public class ReportServiceClient {

    @TimeLimiter(name = "reportService", fallbackMethod = "reportFallback")
    @Async
    public CompletableFuture<Report> generateReport(ReportRequest request) {
        return CompletableFuture.supplyAsync(() -> reportClient.generate(request));
    }

    private CompletableFuture<Report> reportFallback(ReportRequest request,
                                                      TimeoutException ex) {
        return CompletableFuture.completedFuture(Report.empty());
    }
}
```

**Important:** `@TimeLimiter` without `@Async` on a synchronous method has no effect. The annotation requires a `Future` return type.

## Bulkhead

Two types:
- **Semaphore** (default): limits concurrent calls via a counting semaphore. Same thread.
- **Thread Pool**: executes calls in a separate thread pool. Isolates thread resources.

### Semaphore Bulkhead

```yaml
resilience4j:
  bulkhead:
    instances:
      externalApi:
        maxConcurrentCalls: 10
        maxWaitDuration: 100ms    # time to wait for a permit before failing
```

```java
@Bulkhead(name = "externalApi", fallbackMethod = "bulkheadFallback")
public ApiResponse callExternalApi(ApiRequest request) {
    return externalApiClient.call(request);
}

private ApiResponse bulkheadFallback(ApiRequest request, BulkheadFullException ex) {
    return ApiResponse.serviceUnavailable();
}
```

### Thread Pool Bulkhead

```yaml
resilience4j:
  thread-pool-bulkhead:
    instances:
      slowService:
        maxThreadPoolSize: 5
        coreThreadPoolSize: 2
        queueCapacity: 10
        keepAliveDuration: 20ms
```

```java
@Bulkhead(name = "slowService",
          type = Bulkhead.Type.THREADPOOL,
          fallbackMethod = "slowServiceFallback")
public CompletableFuture<SlowResult> callSlowService(SlowRequest request) {
    return CompletableFuture.supplyAsync(() -> slowClient.call(request));
}
```

## RateLimiter

```yaml
resilience4j:
  ratelimiter:
    instances:
      thirdPartyApi:
        limitForPeriod: 100         # 100 calls per refresh period
        limitRefreshPeriod: 1s      # refresh every second
        timeoutDuration: 500ms      # wait up to 500ms for a permit
```

```java
@RateLimiter(name = "thirdPartyApi", fallbackMethod = "rateLimitFallback")
public ThirdPartyResponse callApi(ThirdPartyRequest request) {
    return thirdPartyClient.call(request);
}

private ThirdPartyResponse rateLimitFallback(ThirdPartyRequest request,
                                              RequestNotPermitted ex) {
    log.warn("Rate limit exceeded for thirdPartyApi");
    throw new ServiceUnavailableException("Rate limit reached, try again later");
}
```

## Gotchas

- `@Retry` on non-idempotent operations causes duplicate side effects. Always use idempotency keys.
- `TimeLimiter` **does not stop the underlying thread** — it only cancels the `Future`. A blocked JDBC call will still hold a connection.
- Semaphore `Bulkhead` and `CircuitBreaker` can be stacked; Thread Pool `Bulkhead` requires `CompletableFuture` return type.
- `RateLimiter` is in-memory per JVM. Across multiple pods, each has its own limiter — for global rate limiting use Redis or an API gateway.
- `BulkheadFullException` and `RequestNotPermitted` are separate exception types — provide fallbacks for each if both are stacked.
- `waitDuration` in Retry + `timeoutDuration` in TimeLimiter interact: if retry retries 3 times with 2s waits and TimeLimiter is 3s, the first retry may already time out.
