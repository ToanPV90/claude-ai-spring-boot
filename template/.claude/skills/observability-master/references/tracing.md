# Distributed Tracing with OpenTelemetry

## Dependencies

```xml
<!-- Micrometer tracing API -->
<dependency>
    <groupId>io.micrometer</groupId>
    <artifactId>micrometer-tracing-bridge-otel</artifactId>
</dependency>
<!-- OTLP exporter (Jaeger, Tempo, Honeycomb, etc.) -->
<dependency>
    <groupId>io.opentelemetry</groupId>
    <artifactId>opentelemetry-exporter-otlp</artifactId>
</dependency>
```

## application.yml

```yaml
management:
  tracing:
    sampling:
      probability: 1.0    # 100% in dev; 0.1 (10%) or less in production
  otlp:
    tracing:
      endpoint: http://localhost:4318/v1/traces   # OTLP HTTP endpoint (Jaeger, Tempo)

logging:
  pattern:
    correlation: "[%X{traceId}/%X{spanId}] "     # inject trace IDs into log lines
```

Sampling probability:
- `1.0` = 100% (all requests traced) — use in dev/test
- `0.1` = 10% — production default; tune based on volume and cost

## Log Correlation

With `micrometer-tracing-bridge-otel` on classpath, Spring Boot automatically propagates `traceId` and `spanId` into MDC.

```yaml
logging:
  pattern:
    console: "%d{yyyy-MM-dd HH:mm:ss} [%X{traceId}/%X{spanId}] %-5level %logger{36} - %msg%n"
```

Log output:
```
2024-01-15 10:23:45 [4bf92f3577b34da6a3ce929d0e0e4736/00f067aa0ba902b7] INFO  c.e.OrderService - Creating order for customer abc123
```

## Custom Spans

```java
@Service
public class InventoryService {

    private final Tracer tracer;
    private final InventoryClient client;

    public InventoryService(Tracer tracer, InventoryClient client) {
        this.tracer = tracer;
        this.client = client;
    }

    public InventoryStatus checkStock(String productId) {
        Span span = tracer.nextSpan()
            .name("inventory.check-stock")
            .tag("product.id", productId)
            .start();

        try (Tracer.SpanInScope scope = tracer.withSpan(span)) {
            return client.getStock(productId);
        } catch (Exception ex) {
            span.error(ex);
            throw ex;
        } finally {
            span.end();
        }
    }
}
```

## Propagation

Spring Boot with `micrometer-tracing-bridge-otel` automatically propagates W3C `traceparent` and `tracestate` headers for:
- `RestTemplate`
- `WebClient`
- `RestClient`

No additional configuration required for outbound HTTP calls.

For Kafka, add headers manually using `KafkaTemplate` with propagation-aware producer interceptor, or use Spring Cloud Sleuth Kafka instrumentation.

## OTLP Endpoint Examples

| Backend | OTLP Endpoint |
|---------|--------------|
| Jaeger | `http://jaeger:4318/v1/traces` |
| Grafana Tempo | `http://tempo:4318/v1/traces` |
| Honeycomb | `https://api.honeycomb.io` (with `x-honeycomb-team` header) |
| OpenTelemetry Collector | `http://otel-collector:4318/v1/traces` |

## Docker Compose (Jaeger for local dev)

```yaml
services:
  jaeger:
    image: jaegertracing/all-in-one:1.54
    ports:
      - "16686:16686"   # Jaeger UI
      - "4318:4318"     # OTLP HTTP
    environment:
      COLLECTOR_OTLP_ENABLED: "true"
```

Access Jaeger UI at `http://localhost:16686`.

## Gotchas

- `micrometer-tracing-bridge-brave` and `micrometer-tracing-bridge-otel` must not both be on the classpath — choose one.
- If sampling probability is `0.0`, no traces are exported regardless of configuration.
- `traceId` in logs is only present when a trace context is active (inside a request). Background jobs need a manual span.
- `@Async` methods break trace context propagation unless the `Executor` is instrumented. Use Spring's `SimpleAsyncTaskExecutor` with `micrometer-tracing` instrumentation.
- OTLP `endpoint` format: use `/v1/traces` suffix for HTTP OTLP. Without it, the exporter may fail silently.
- Large payloads in span attributes increase trace storage cost. Tag with IDs, not full payloads.
