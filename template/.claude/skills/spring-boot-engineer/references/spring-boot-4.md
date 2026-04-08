# Spring Boot 4 — Migration & New Features

Load this reference when working with Spring Boot 4.x projects, migrating from 3.x, or adopting new 4.x APIs.

## Jackson 3 Migration

Spring Boot 4 moves from `com.fasterxml.jackson` to `tools.jackson`. `ObjectMapper` is replaced by `JsonMapper`. Exceptions are now unchecked (`JacksonException`).

```java
import tools.jackson.databind.JsonMapper;

@Bean
public JsonMapper jsonMapper() {
    return JsonMapper.builder()
        .findAndAddModules()
        .disable(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES)
        .enable(SerializationFeature.INDENT_OUTPUT)
        .build();
}
```

All annotations keep their names but move to the new package (e.g., `tools.jackson.annotation.JsonProperty`).

## JSpecify Null Safety

Spring Boot 4 adopts JSpecify for compile-time null safety:

```java
// package-info.java
@NullMarked
package com.example.orders;
```

```java
@Service
@NullMarked
public class OrderService {
    public @Nullable Order findById(String id) { ... }
    public Order create(CreateOrderRequest request) { ... }
    public List<Order> search(@Nullable String status) { ... }
}
```

## RestTestClient

Unified testing API replacing the `MockMvc` / `WebTestClient` distinction:

| Binding Method | Use Case |
|----------------|----------|
| `bindToController(controller)` | Unit test controllers with mocks |
| `bindToRouterFunction(fn)` | Test functional endpoints |
| `bindToMockMvc(mockMvc)` | MVC integration (validation, security) |
| `bindToApplicationContext(ctx)` | Full context, no server |
| `bindToServer(uri)` | E2E against running server |

```java
// Unit test
RestTestClient client = RestTestClient.bindToController(new OrderController(orderService)).build();

// Integration (@WebMvcTest)
RestTestClient client = RestTestClient.bindToMockMvc(mockMvc).build();

// E2E
RestTestClient client = RestTestClient.bindToServer(URI.create("http://localhost:" + port)).build();
```

Fluent assertion API:
```java
client.get().uri("/api/orders").exchange()
    .expectStatus().isOk()
    .expectHeader().contentType(MediaType.APPLICATION_JSON)
    .expectBody()
    .jsonPath("$.length()").isEqualTo(10)
    .jsonPath("$[0].id").isNotEmpty();
```

## Built-in Resilience

Enable with `@EnableResilientMethods` on the main class. No external library needed.

### @Retryable
```java
@Retryable(
    maxAttempts = 3,
    backoff = @Backoff(delay = 1000, multiplier = 2, jitter = 0.1),
    retryFor = {PaymentGatewayException.class, TimeoutException.class}
)
public PaymentResult processPayment(PaymentRequest request) { ... }

@Recover
public PaymentResult recoverPayment(PaymentGatewayException ex, PaymentRequest request) { ... }
```

| Parameter | Default |
|-----------|---------|
| `maxAttempts` | 3 |
| `delay` | 1000ms |
| `multiplier` | 2.0 |
| `maxDelay` | 30000ms |
| `jitter` | 0.0 |

### @ConcurrencyLimit
```java
@ConcurrencyLimit(permits = 5)
public Report generateReport(ReportRequest request) { ... }
```

Can be combined:
```java
@Retryable(maxAttempts = 3, backoff = @Backoff(delay = 500, multiplier = 2))
@ConcurrencyLimit(permits = 10)
public ApiResponse callExternalService(ApiRequest request) { ... }
```

YAML config:
```yaml
spring:
  resilience:
    retry.default:
      max-attempts: 3
      backoff: { initial-interval: 1s, multiplier: 2, max-interval: 30s }
    concurrency.default.permits: 10
```

## HTTP Interface Clients — @ImportHttpServices

Eliminates boilerplate `HttpServiceProxyFactory` setup from Spring Boot 3.x:

```java
@HttpExchange("/api/payments")
public interface PaymentClient {
    @PostExchange
    PaymentResponse createPayment(@RequestBody PaymentRequest request);

    @GetExchange("/{id}")
    PaymentResponse getPayment(@PathVariable String id);

    @GetExchange
    List<PaymentResponse> listPayments(@RequestParam String orderId);
}

@SpringBootApplication
@ImportHttpServices(clients = {PaymentClient.class, InventoryClient.class})
public class Application { ... }
```

```yaml
spring.http.services:
  payment-client:
    base-url: https://api.payments.example.com
    connect-timeout: 5s
    read-timeout: 30s
```

## Virtual Threads (Project Loom)

First-class support:

```yaml
spring:
  threads:
    virtual:
      enabled: true
```

Per-component opt-in:
```java
@RestController
@VirtualThreads
public class OrderController { ... }
```

Virtual threads excel at blocking I/O — sequential blocking calls become efficient without reactive complexity.

## Modular Auto-Configuration

Spring Boot 4 shifts to selective auto-configuration loading:

```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-autoconfigure-web</artifactId>
</dependency>
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-autoconfigure-data-jpa</artifactId>
</dependency>
```

For immediate compatibility, use the classic module:
```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-autoconfigure-classic</artifactId>
</dependency>
```

Migration strategy: add `classic` for full compat → gradually replace with specific modules → new projects start lean.

Common modules: `web`, `data-jpa`, `data-jdbc`, `security`, `restclient`, `validation`, `cache`, `actuator`.
