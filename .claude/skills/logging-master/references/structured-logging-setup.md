# Structured Logging Setup

## Why Structured JSON

JSON logs are easier for machines and AI tools to parse because important fields are explicit instead of buried in text.

Prefer fields like:
- `timestamp`
- `level`
- `logger`
- `message`
- `requestId`
- `step`
- `duration_ms`

## Spring Boot 3.4+

```yaml
logging:
  structured:
    format:
      console: logstash
```

Supported formats include `logstash`, `ecs`, and `gelf`.

## Profile-Based Switching

Use JSON by default and keep a human-readable profile for local troubleshooting when needed.

```yaml
spring:
  profiles:
    default: json-logs

---
spring:
  config:
    activate:
      on-profile: json-logs
logging:
  structured:
    format:
      console: logstash

---
spring:
  config:
    activate:
      on-profile: human-logs
logging:
  pattern:
    console: "%d{HH:mm:ss.SSS} %-5level [%thread] %logger{36} - %msg%n"
```

## Spring Boot Before 3.4

Use Logstash Logback Encoder.

```xml
<dependency>
    <groupId>net.logstash.logback</groupId>
    <artifactId>logstash-logback-encoder</artifactId>
    <version>7.4</version>
</dependency>
```

```xml
<appender name="JSON" class="ch.qos.logback.core.ConsoleAppender">
    <encoder class="net.logstash.logback.encoder.LogstashEncoder">
        <includeMdcKeyName>requestId</includeMdcKeyName>
        <includeMdcKeyName>userId</includeMdcKeyName>
    </encoder>
</appender>
```

## AI-Friendly Shape

Prefer logs like:

```json
{
  "timestamp": "2026-01-29T10:15:30.123Z",
  "level": "INFO",
  "logger": "com.example.OrderService",
  "message": "Order created",
  "requestId": "req-abc123",
  "orderId": 12345,
  "duration_ms": 45,
  "step": "payment_completed"
}
```

This is better than text logs when you need filtering, jq queries, or AI-assisted analysis.
