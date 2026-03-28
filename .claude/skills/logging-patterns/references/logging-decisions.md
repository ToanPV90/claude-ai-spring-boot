# What to Log and What Not to Log

## Log These

- business events that matter (`order_created`, `payment_completed`)
- failures with enough context to diagnose them
- external calls with duration and target system
- stable workflow steps when tracing a multi-step flow

## Do Not Log These

- passwords
- tokens
- full card numbers
- secrets from config
- raw personal data unless there is a clear, justified need and safe handling

Prefer safe substitutes such as `cardLast4`, `userId`, or a request identifier.

## Log Once at the Boundary

Avoid logging the same exception in every layer.

Prefer full exception logging at the outer boundary such as:
- controller advice
- message listener boundary
- scheduled job boundary

```java
log.error("Request failed",
    kv("path", request.getRequestURI()),
    kv("method", request.getMethod()),
    kv("errorType", exception.getClass().getSimpleName()),
    exception);
```

## Timing and Flow

When a flow spans multiple important steps, use fields such as:
- `step`
- `duration_ms`
- domain identifiers (`orderId`, `userId`)

## AI-Friendly Log Analysis

JSON logs work well with tools such as `jq`.

```bash
tail -f app.log | jq .
jq 'select(.level == "ERROR")' app.log
jq 'select(.requestId == "abc123")' app.log
jq 'select(.duration_ms > 1000)' app.log
```

Stable field names matter more than verbose messages.
