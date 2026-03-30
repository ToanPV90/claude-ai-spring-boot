---
name: observability-master
description: Implementation guidance for Spring Boot observability with Micrometer metrics, Spring Boot Actuator, OpenTelemetry distributed tracing, and Prometheus/Grafana integration. Use when configuring health endpoints, adding custom metrics, setting up distributed tracing, or wiring Actuator for production monitoring.
license: MIT
metadata:
  author: local
  version: "1.0.0"
  domain: backend
  triggers:
    - Micrometer
    - Spring Boot Actuator
    - Actuator endpoints
    - metrics
    - custom metric
    - Counter
    - Gauge
    - Timer
    - DistributionSummary
    - OpenTelemetry
    - distributed tracing
    - trace
    - span
    - Prometheus
    - Grafana
    - health endpoint
    - liveness probe
    - readiness probe
    - management.endpoints
    - micrometer-tracing
    - OTLP
  role: specialist
  scope: implementation
  output-format: code + guidance
  related-skills: spring-boot-engineer, logging-master, spring-boot-master, kafka-master
---

# Observability Master

Implementation guide for making Spring Boot applications observable through metrics, health checks, and distributed tracing without drifting into general logging policy or infrastructure provisioning.

## When to Use
- The task is configuring Actuator health, liveness, or readiness endpoints
- You need to add custom Micrometer counters, gauges, or timers to a Spring Boot service
- A service needs distributed tracing wired via OpenTelemetry or Micrometer Tracing
- You are setting up Prometheus scraping or Grafana dashboards for the application
- Probe configuration for Kubernetes liveness/readiness is needed

## When Not to Use
- The main task is structured logging, MDC context, or JSON log format — use `logging-master`
- The task is general Spring Boot application structure — use `spring-boot-master`
- The main problem is infrastructure setup for Prometheus/Grafana servers — that is ops, not application code

## Version Assumptions
- Spring Boot 3.x
- Micrometer 1.12+
- `spring-boot-starter-actuator` included
- `micrometer-registry-prometheus` for Prometheus scraping
- `micrometer-tracing-bridge-otel` + `opentelemetry-exporter-otlp` for tracing

## Reference Guide

| Topic | Reference | Load When |
|------|-----------|-----------|
| Actuator configuration, health groups, endpoint exposure | `references/actuator.md` | Configuring health, info, readiness/liveness, or securing endpoints |
| Micrometer custom metrics (Counter, Gauge, Timer) | `references/metrics.md` | Adding business-level or technical metrics to a service |
| OpenTelemetry tracing, MDC bridge, OTLP export | `references/tracing.md` | Wiring distributed tracing or correlating traces with logs |

## Symptom Triage

| Symptom | Default Check | Likely Fix |
|--------|---------------|------------|
| `/actuator/health` returns 404 | Is actuator on classpath and endpoint exposed? | Add `spring-boot-starter-actuator`; set `management.endpoints.web.exposure.include` |
| Liveness/readiness not separated | Are health groups configured? | Add `management.endpoint.health.group.liveness/readiness` |
| Prometheus metrics not appearing | Is `micrometer-registry-prometheus` on classpath? | Add dependency; expose `/actuator/prometheus` |
| No trace IDs in logs | Is MDC bridge configured? | Add `micrometer-tracing-bridge-otel`; set `logging.pattern.correlation` |
| Custom metric not appearing | Is `MeterRegistry` injected via constructor? | Inject `MeterRegistry` and register in constructor or `@PostConstruct` |
| High cardinality tags | Are request paths or user IDs used as tag values? | Never use unbounded values as metric tags; use bounded categorical tags |

## Observability Decision Ladder

1. **Need health checks for K8s probes?** Configure liveness/readiness groups in Actuator.
2. **Need to count business events (orders placed, payments failed)?** Use `Counter`.
3. **Need to measure latency?** Use `Timer` or `@Timed` on service methods.
4. **Need to track a current value (queue size, active connections)?** Use `Gauge`.
5. **Need distributed tracing?** Add `micrometer-tracing-bridge-otel` + OTLP exporter.
6. **Need traces correlated with logs?** Add the MDC log correlation pattern.

## Quick Mapping

| Situation | Default Move | Prefer Instead Of |
|-----------|--------------|-------------------|
| K8s liveness/readiness | Actuator health groups with probes | Single `/health` endpoint for all |
| Business event counting | `MeterRegistry.counter(...)` in service | Custom log parsing |
| Endpoint latency | `@Timed` on service method or `Timer.record(...)` | Manual stopwatch logging |
| Distributed trace context | `micrometer-tracing-bridge-otel` | Custom thread-local propagation |
| Prometheus scraping | `/actuator/prometheus` + registry | Custom metrics servlet |
| Securing actuator in production | `requestMatchers("/actuator/**")` in `SecurityFilterChain` | Exposing all endpoints without auth |

## Constraints

### MUST DO

| Rule | Preferred Pattern |
|------|-------------------|
| Separate liveness and readiness | `management.endpoint.health.group.liveness/readiness` |
| Secure sensitive actuator endpoints | Permit only `health` and `info` publicly |
| Use bounded tags only | Categorical values: `status`, `type`, `result` |
| Register metrics in constructor | Inject `MeterRegistry` via constructor injection |
| Add `management.endpoints.web.exposure.include` explicitly | Never rely on the default wildcard in production |

### MUST NOT DO
- Do not use unbounded values (request paths, user IDs, entity IDs) as metric tag values
- Do not expose `/actuator/env`, `/actuator/beans`, or `/actuator/heapdump` publicly in production
- Do not use `@Timed` on private methods — Spring AOP only intercepts public calls on Spring beans
- Do not mix tracing concern with logging concern — use the MDC bridge, keep them separate

## Gotchas

- `management.endpoints.web.exposure.include=*` exposes sensitive endpoints in production. Be explicit.
- Micrometer `Gauge` references must prevent garbage collection — hold a strong reference to the state object.
- `@Timed` only works when the bean is a Spring-managed proxy. Calling from the same class bypasses it.
- High-cardinality tags (user IDs, order IDs) cause Prometheus cardinality explosion and OOM.
- OpenTelemetry trace context is propagated in headers (W3C `traceparent`) — ensure all HTTP clients forward these headers.
- Liveness probe failure triggers a pod restart; readiness probe failure removes the pod from load balancer. Do not conflate them.

## Minimal Examples

### application.yml — Actuator, Prometheus, tracing
```yaml
management:
  endpoints:
    web:
      exposure:
        include: health,info,prometheus,metrics
  endpoint:
    health:
      show-details: when-authorized
      group:
        liveness:
          include: livenessState
        readiness:
          include: readinessState,db,redis
  tracing:
    sampling:
      probability: 1.0   # 100% in dev; lower in production
```

### Custom counter
```java
@Service
public class OrderService {

    private final OrderRepository orderRepository;
    private final Counter ordersCreatedCounter;

    public OrderService(OrderRepository orderRepository, MeterRegistry meterRegistry) {
        this.orderRepository = orderRepository;
        this.ordersCreatedCounter = meterRegistry.counter("orders.created", "status", "success");
    }

    @Transactional
    public OrderResponse createOrder(CreateOrderRequest request) {
        Order order = orderRepository.save(new Order(request));
        ordersCreatedCounter.increment();
        return OrderResponse.from(order);
    }
}
```

### Timer for latency
```java
Timer.Sample sample = Timer.start(meterRegistry);
try {
    return externalService.call();
} finally {
    sample.stop(meterRegistry.timer("external.service.duration", "service", "payment"));
}
```

### pom.xml dependencies
```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-actuator</artifactId>
</dependency>
<dependency>
    <groupId>io.micrometer</groupId>
    <artifactId>micrometer-registry-prometheus</artifactId>
</dependency>
<dependency>
    <groupId>io.micrometer</groupId>
    <artifactId>micrometer-tracing-bridge-otel</artifactId>
</dependency>
<dependency>
    <groupId>io.opentelemetry</groupId>
    <artifactId>opentelemetry-exporter-otlp</artifactId>
</dependency>
```

## What to Verify
- `/actuator/health` returns `UP` with liveness and readiness groups configured
- `/actuator/prometheus` returns Micrometer metrics in Prometheus format
- Custom business metrics appear in `/actuator/metrics` after triggering the code path
- Trace IDs appear in log output when a request is processed
- Sensitive actuator endpoints (`env`, `beans`, `heapdump`) are not publicly accessible

## See References
- `references/actuator.md` for health groups, endpoint exposure, and security configuration
- `references/metrics.md` for Counter, Gauge, Timer, DistributionSummary, and tag best practices
- `references/tracing.md` for OpenTelemetry setup, OTLP export, and MDC log correlation
