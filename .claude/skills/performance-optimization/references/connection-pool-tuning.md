# HikariCP Connection Pool Tuning

## Baseline Configuration

```yaml
spring:
  datasource:
    hikari:
      maximum-pool-size: 10        # Start here; adjust after load testing
      minimum-idle: 5              # Keep warm connections ready
      connection-timeout: 30000    # 30s — fail fast when pool is exhausted
      idle-timeout: 600000         # 10min — release idle connections
      max-lifetime: 1800000        # 30min — rotate before DB-side timeout
      leak-detection-threshold: 60000  # Log warning if connection held > 60s
```

## Sizing

Start at **10**, load-test, adjust. Most apps perform best with 10–20 connections.

| App Profile | Start | Note |
|------------|-------|------|
| Low-traffic CRUD | 5–10 | Few concurrent queries |
| Moderate API | 10–15 | Typical microservice |
| High-throughput batch | 15–25 | Parallel batch writers |

## Metrics to Monitor

```yaml
management:
  metrics:
    enable:
      hikaricp: true
```

Key Micrometer metrics:

| Metric | Alert When | Meaning |
|--------|-----------|---------|
| `hikaricp.connections.active` | Near `maximum-pool-size` | Pool saturation imminent |
| `hikaricp.connections.pending` | > 0 sustained | Threads waiting for connections |
| `hikaricp.connections.timeout` | Any occurrence | Request failed — no connection available |
| `hikaricp.connections.usage` (timer) | p95 > 1s | Connections held too long — slow queries |

## Leak Detection

```yaml
spring.datasource.hikari.leak-detection-threshold: 60000  # 60s
```

When a connection is held longer than this threshold, HikariCP logs a stack trace showing where it was acquired. Common causes:
- Missing `@Transactional` boundary (connection held for entire request)
- Streaming results without closing the stream
- Synchronous HTTP call inside an open transaction

## Common Pitfalls

- **Increasing pool size to fix slow queries** — fix the queries; more connections move the bottleneck to the DB.
- **Ignoring `max-lifetime`** — DB/firewall closes stale connections; rotate proactively.
- **Not monitoring pool metrics** — blind tuning is guessing. Expose to Micrometer/Prometheus.
- **Pool per module in a monolith** — share one pool; multiple pools multiply DB connection count.
