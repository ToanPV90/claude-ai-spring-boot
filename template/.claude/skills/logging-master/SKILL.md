---
name: logging-master
description: Structured logging guidance for Java applications using SLF4J, JSON logs, MDC, and boundary-level exception logging. Use when improving logs, adding correlation IDs, making logs easier to debug, or deciding what should and should not be logged.
license: MIT
metadata:
  author: local
  version: "1.1.2"
  domain: backend
  triggers:
    - logging
    - structured logging
    - JSON logs
    - SLF4J
    - MDC
    - correlation ID
    - request tracing
    - analyze logs
    - improve logs
    - exception logging
    - log levels
    - sensitive data in logs
  role: specialist
  scope: implementation
  output-format: code + guidance
  related-skills: spring-boot-master, spring-boot-engineer, kafka-master, jpa-master
---

# Logging Master Skill

Decision guide for making application logs structured, traceable, and safe without drifting into full observability architecture.

## When to Use
- The user wants to add logging, improve log quality, or make logs easier to debug
- The application needs structured JSON logs, request correlation IDs, or better boundary logging
- You need to decide what should be logged at INFO/WARN/ERROR/DEBUG and what must never be logged
- Claude or another tool needs logs that are easy to parse and trace through a request flow

## When Not to Use
- The task is general debugging with no logging change required
- The main problem is distributed tracing, spans, or Micrometer observation design — use the owning framework/observability skill; for Spring Boot, that is `spring-boot-engineer`
- The task is Kafka-specific header propagation or consumer/producer correlation behavior — use `kafka-master`
- The task is SQL/query analysis rather than application logging — use `jpa-master`

## Reference Guide

| Topic | Reference | Load When |
|------|-----------|-----------|
| JSON logging setup, Spring Boot 3.4+, Logback fallback | `references/structured-logging-setup.md` | Configuring structured output or switching between machine and human-readable logs, including Spring Boot defaults when that stack is explicit |
| SLF4J declaration, parameterized logging, level choices | `references/slf4j-and-levels.md` | Adding log statements or choosing between INFO/WARN/ERROR/DEBUG |
| MDC request context and async propagation | `references/mdc-and-context.md` | Adding request IDs, user IDs, or keeping context across async work |
| What to log, what not to log, exception boundaries, AI log analysis | `references/logging-decisions.md` | Deciding event shape, safe fields, and boundary logging strategy |
| Failure modes and scope boundaries | `references/gotchas.md` | Avoiding duplicate exception logs, leaked secrets, or tracing scope creep |

## Symptom Triage

| Symptom | Default Check | Likely Fix |
|--------|---------------|------------|
| Logs are hard to filter or correlate | Are logs plain text without stable fields? | Enable structured JSON logging |
| Request flow is hard to follow | Is there no requestId/correlationId in MDC? | Add request filter + MDC population |
| Async logs lose request context | Is MDC copied into async execution? | Capture and restore MDC context map |
| Errors appear multiple times | Are exceptions logged in several layers? | Log once at the application boundary |
| Logs expose secrets or PII | Are raw tokens/passwords/card data logged? | Replace with safe identifiers or redacted fields |

## Logging Decision Ladder

1. **Do you need machine-readable logs?** Prefer structured JSON.
2. **Do you need to follow a request or workflow?** Add MDC-backed request or correlation IDs.
3. **Are you deciding whether to log something?** Keep business events, failures, and timings; drop secrets and noise.
4. **Are exceptions being logged in multiple layers?** Move full logging to the outer boundary.
5. **Is the problem really tracing or cross-service propagation?** Route to the owning framework or transport skill; in this repo that means `spring-boot-engineer` for Spring Boot tracing and `kafka-master` for Kafka propagation.

## Quick Mapping

| Situation | Default Move | Prefer Instead Of |
|-----------|--------------|-------------------|
| Need grep/jq-friendly logs | JSON structured logging | Free-form text messages |
| Need request correlation | MDC with requestId/correlationId | Passing IDs manually through every log call |
| Need useful failure logs | Log once at the boundary with context | Re-logging the same exception in every layer |
| Need performance hints | Include `duration_ms` and `step` fields | Narrative log text with no stable metrics |
| Need safe audit trail | Log identifiers and state transitions | Logging secrets, tokens, or full payloads |

## Constraints

### MUST DO

| Rule | Preferred Pattern |
|------|-------------------|
| Use structured fields for important identifiers | `requestId`, `step`, `duration_ms`, domain IDs |
| Prefer parameterized logging | `log.info("Order created {}", id)` or structured args |
| Keep correlation context consistent | Populate MDC at the boundary and clean it up reliably |
| Log exceptions once with context | Full stack trace at controller/message boundary, not every layer |
| Keep logs safe for production | Redact or omit secrets, tokens, and sensitive personal data |

### MUST NOT DO
- Do not concatenate strings inside log calls when parameterized logging will do
- Do not log passwords, tokens, full card numbers, or raw secrets
- Do not leave MDC state uncleared after request or async work
- Do not duplicate Kafka propagation or tracing architecture guidance here when another skill owns it
- Do not treat DEBUG logs as a substitute for meaningful business or failure events

## Gotchas

- Structured logs only help if key fields are stable; random message wording still hurts filtering and AI analysis.
- MDC does not automatically cross async boundaries; missing propagation creates misleading partial traces.
- The same exception logged in service, controller, and handler layers creates noise instead of observability.
- Human-readable logs may feel easier locally, but JSON logs are usually better for tooling and production pipelines.
- Logging skill scope stops before full tracing architecture or Kafka transport concerns.

## Minimal Examples

### Boundary log with structured fields
```java
log.error("Order processing failed",
    kv("orderId", orderId),
    kv("step", "payment"),
    kv("requestId", MDC.get("requestId")),
    exception);
```

### Request correlation with MDC
```java
String requestId = Optional.ofNullable(request.getHeader("X-Request-ID"))
    .filter(value -> !value.isBlank())
    .orElse(UUID.randomUUID().toString());

MDC.put("requestId", requestId);
try {
    chain.doFilter(request, response);
} finally {
    MDC.clear();
}
```

## What to Verify
- Logs contain stable identifiers that support filtering and trace reconstruction
- Sensitive data is absent or explicitly redacted
- Exceptions are logged once at the correct boundary
- Async work preserves or intentionally resets logging context
- Kafka/tracing guidance stays routed to the owning skills instead of being reimplemented here

## See References
- `references/structured-logging-setup.md` for Spring Boot and Logback setup
- `references/slf4j-and-levels.md` for declaration, levels, and parameterized logging
- `references/mdc-and-context.md` for request IDs and async propagation
- `references/logging-decisions.md` for what to log, what not to log, and boundary logging
- `references/gotchas.md` for logging failure modes and ownership boundaries
