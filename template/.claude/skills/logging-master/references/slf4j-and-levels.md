# SLF4J and Log Levels

## Logger Declaration

This repo does **not** use Lombok. Declare loggers explicitly.

```java
private static final Logger log = LoggerFactory.getLogger(OrderService.class);
```

Do not use `@Slf4j`.

## Parameterized Logging

Prefer:

```java
log.debug("Processing order {} for user {}", orderId, userId);
```

Avoid:

```java
log.debug("Processing order " + orderId + " for user " + userId);
```

For expensive values, guard with `log.isDebugEnabled()`.

## Level Defaults

| Level | Use For |
|------|---------|
| `ERROR` | Failures that need attention |
| `WARN` | Unexpected but handled situations |
| `INFO` | Important business events or lifecycle milestones |
| `DEBUG` | Technical diagnostics needed during investigation |
| `TRACE` | Rare, extremely detailed flow logging |

## Structured Arguments

If using Logstash encoder, structured arguments are a good default.

```java
log.info("Order created",
    kv("orderId", order.getId()),
    kv("userId", user.getId()),
    kv("step", "order_created"));
```

Use stable field names so filtering and dashboards remain reliable.
