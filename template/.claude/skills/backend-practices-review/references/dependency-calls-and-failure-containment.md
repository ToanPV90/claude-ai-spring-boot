# Dependency Calls and Failure Containment

## Default Position

Backend review should challenge every remote dependency call in the request path.

Ask:
- does the user need this result before the response returns?
- what timeout and retry policy exists?
- what happens when the dependency slows down or fails repeatedly?

## Timeout and Retry Posture

### Always Set Explicit Timeouts

```java
// BAD: no timeout — can hang indefinitely
@Service
public class PaymentService {
    private final RestClient restClient;

    public PaymentService(RestClient.Builder builder) {
        this.restClient = builder.baseUrl("https://api.payment.com").build();
    }
}

// GOOD: explicit connect and read timeouts
@Service
public class PaymentService {

    private final RestClient restClient;

    public PaymentService(RestClient.Builder builder, PaymentProperties props) {
        this.restClient = builder
            .baseUrl(props.baseUrl())
            .requestFactory(clientHttpRequestFactory(props))
            .build();
    }

    private ClientHttpRequestFactory clientHttpRequestFactory(PaymentProperties props) {
        var factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(props.connectTimeout());
        factory.setReadTimeout(props.readTimeout());
        return factory;
    }
}

@ConfigurationProperties(prefix = "app.payment")
public record PaymentProperties(
    String baseUrl,
    Duration connectTimeout,
    Duration readTimeout
) {}
```

```yaml
app:
  payment:
    base-url: https://api.payment.com
    connect-timeout: 5s
    read-timeout: 10s
```

### Retry with Backoff — Not Infinite Loops

```java
@Service
public class NotificationService {

    private static final Logger log = LoggerFactory.getLogger(NotificationService.class);

    private final RestClient restClient;

    public NotificationService(RestClient.Builder builder) {
        this.restClient = builder.baseUrl("https://api.notify.com").build();
    }

    public void sendWithRetry(Notification notification) {
        int maxAttempts = 3;
        Duration delay = Duration.ofMillis(500);

        for (int attempt = 1; attempt <= maxAttempts; attempt++) {
            try {
                restClient.post()
                    .uri("/send")
                    .body(notification)
                    .retrieve()
                    .toBodilessEntity();
                return;
            } catch (RestClientException e) {
                if (attempt == maxAttempts) {
                    log.error("Notification failed after {} attempts", maxAttempts, e);
                    throw e;
                }
                log.warn("Notification attempt {}/{} failed, retrying in {}ms",
                    attempt, maxAttempts, delay.toMillis());
                try {
                    Thread.sleep(delay.toMillis());
                } catch (InterruptedException ie) {
                    Thread.currentThread().interrupt();
                    throw new RuntimeException(ie);
                }
                delay = delay.multipliedBy(2); // exponential backoff
            }
        }
    }
}
```

## Failure Containment

### Graceful Degradation for Non-Critical Dependencies

```java
@Service
public class ProductServiceImpl implements ProductService {

    private static final Logger log = LoggerFactory.getLogger(ProductServiceImpl.class);

    private final ProductRepository productRepository;
    private final RecommendationClient recommendationClient;

    public ProductServiceImpl(ProductRepository productRepository,
                              RecommendationClient recommendationClient) {
        this.productRepository = productRepository;
        this.recommendationClient = recommendationClient;
    }

    @Override
    @Transactional(readOnly = true)
    public ProductDetailResponse getProductDetail(Long productId) {
        Product product = productRepository.findById(productId)
            .orElseThrow(() -> new ResourceNotFoundException("Product", productId));

        // Non-critical: recommendations failing should not break the page
        List<ProductSummary> recommendations = fetchRecommendationsSafely(productId);

        return ProductDetailResponse.from(product, recommendations);
    }

    private List<ProductSummary> fetchRecommendationsSafely(Long productId) {
        try {
            return recommendationClient.getRecommendations(productId);
        } catch (Exception e) {
            log.warn("Recommendations unavailable for product={}", productId, e);
            return List.of(); // degrade gracefully
        }
    }
}
```

### Circuit Breaker Pattern (with Resilience4j)

```java
@Service
public class InventoryService {

    private final RestClient restClient;
    private final CircuitBreaker circuitBreaker;

    public InventoryService(RestClient.Builder builder,
                            CircuitBreakerRegistry registry) {
        this.restClient = builder.baseUrl("https://api.inventory.com").build();
        this.circuitBreaker = registry.circuitBreaker("inventory");
    }

    public InventoryStatus checkStock(String productId) {
        return circuitBreaker.executeSupplier(() ->
            restClient.get()
                .uri("/stock/{id}", productId)
                .retrieve()
                .body(InventoryStatus.class)
        );
    }
}
```

```yaml
resilience4j:
  circuitbreaker:
    instances:
      inventory:
        sliding-window-size: 10
        failure-rate-threshold: 50
        wait-duration-in-open-state: 30s
        permitted-number-of-calls-in-half-open-state: 3
```

## Boundedness

Dependency safety also includes bounded resource use.

### Limit Concurrency Against External Dependencies

```java
@Configuration
public class RestClientConfig {

    @Bean
    public RestClient inventoryRestClient(RestClient.Builder builder) {
        var connectionManager = PoolingHttpClientConnectionManagerBuilder.create()
            .setMaxConnTotal(50)        // total connections
            .setMaxConnPerRoute(20)     // per-host limit
            .build();

        var httpClient = HttpClients.custom()
            .setConnectionManager(connectionManager)
            .build();

        return builder
            .baseUrl("https://api.inventory.com")
            .requestFactory(new HttpComponentsClientHttpRequestFactory(httpClient))
            .build();
    }
}
```

### Bound Batch Sizes in External Calls

```java
// BAD: send all IDs to external service in one call — unbounded
List<Price> prices = pricingClient.getPrices(allProductIds);

// GOOD: chunk requests to avoid overwhelming the dependency
public List<Price> getPricesInBatches(List<String> productIds) {
    return Lists.partition(productIds, 50).stream()
        .map(pricingClient::getPrices)
        .flatMap(List::stream)
        .toList();
}
```

If logging, tracing, or broker semantics dominate the problem, route to `logging-master` or `kafka-master`.

## Anti-Patterns

- Inline network calls hidden inside transactional service methods
- Library-default timeouts that are effectively "wait forever"
- Infinite retries or retries without jitter/backoff
- Treating provider outages as generic 500s with no recovery story
- Retrying non-idempotent calls (POST that creates resources)
- No connection pool limit against external services — one slow dependency drains all threads
