# Logging Gotchas

- Forgetting `MDC.clear()` leaks one request's context into another.
- Async work without copied MDC produces broken traces and misleading debugging context.
- Logging the same exception at several layers creates alert noise and hides the real boundary.
- Structured logging still fails if field names are inconsistent between call sites.
- Kafka propagation and tracing architecture are adjacent concerns, but they are not owned by this skill.
