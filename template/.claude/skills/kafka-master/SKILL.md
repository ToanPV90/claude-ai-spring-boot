---
name: kafka-master
description: Implementation guidance for Spring Kafka producers, consumers, retries, dead-letter handling, and event delivery boundaries in Spring Boot systems. Use when building or modifying Kafka-based messaging flows after the surrounding service boundaries and event model are already decided.
license: MIT
metadata:
  author: local
  version: "1.1.1"
  domain: messaging
  triggers:
    - Spring Kafka
    - KafkaTemplate
    - @KafkaListener
    - Kafka producer
    - Kafka consumer
    - dead letter topic
    - @RetryableTopic
    - DLT
    - event-driven
    - EmbeddedKafka
  role: specialist
  scope: implementation
  output-format: code + guidance
  related-skills: spring-boot-engineer, tdd-guide, logging-master, spring-boot-master, java-code-review
---

# Kafka Master

Decision guide for implementing Spring Kafka messaging reliably without drifting into generic logging, full service architecture, or review-only work.

## When to Use
- The task is to build or modify a Kafka producer, consumer, retry flow, or DLT path in a Spring Boot application
- You need to decide between manual acknowledgment, `DefaultErrorHandler`, `@RetryableTopic`, or an outbox-based delivery flow
- You are wiring `KafkaTemplate`, `@KafkaListener`, headers, partitions, or idempotent producer settings
- You need Kafka-focused tests using `EmbeddedKafka` or Testcontainers Kafka

## When Not to Use
- The main task is service decomposition, topic ownership across bounded contexts, or event-driven architecture tradeoffs — use `java-architect`
- The task is controller/service/repository layering or DTO boundaries — use `spring-boot-master`
- The main problem is generic logging policy, JSON logs, or MDC usage outside Kafka transport boundaries — use `logging-master`
- The task is review-only work rather than implementing messaging code — use `java-code-review`

## Reference Guide

| Topic | Reference | Load When |
|------|-----------|-----------|
| Producer config, idempotence, headers, outbox, event DTO shape | `references/producer.md` | Publishing events, choosing producer guarantees, or adding delivery metadata |
| Consumer ack mode, retries, DLT, concurrency, filtering | `references/consumer.md` | Implementing `@KafkaListener`, retry policy, or failure handling |
| EmbeddedKafka, Testcontainers Kafka, DLT and idempotency tests | `references/testing.md` | Verifying producer/consumer flows or writing async messaging tests |

## Symptom Triage

| Symptom | Default Check | Likely Fix |
|--------|---------------|------------|
| Messages are silently lost | Is auto-commit enabled or send result ignored? | Disable auto-commit and handle the send future |
| Retry behavior is unclear or inconsistent | Is there no explicit error handler or retry strategy? | Choose `DefaultErrorHandler` or `@RetryableTopic` deliberately |
| Duplicate delivery causes bad writes | Is the consumer/idempotency strategy missing? | Add idempotent processing or outbox/inbox safeguards |
| Ordering breaks unexpectedly | Are keys unstable or retries moving records across topics? | Use stable string keys and understand retry-topic ordering tradeoffs |
| A retry pauses unrelated traffic | Are you using `nack(...)` on a multi-partition listener? | Remember `nack` pauses the whole listener and review `pollTimeout` |
| Tests are flaky | Are tests using sleeps instead of Awaitility/latches? | Use EmbeddedKafka or Testcontainers with deterministic assertions |

## Messaging Decision Ladder

1. **Are you implementing messaging code or deciding system topology?** If topology/boundaries are unsettled, route to `java-architect` first.
2. **Do you need reliable publishing?** Start with idempotent producer settings and explicit send-result handling.
3. **Do DB writes and event publication need consistency?** Prefer the outbox pattern over pretending JPA + Kafka are one atomic transaction.
4. **Do consumers control commit timing?** Use manual acknowledgment unless a simpler case is clearly safe.
5. **Do failures need short in-memory retries or durable retry topics?** Choose `DefaultErrorHandler` for short ordered retries, `@RetryableTopic` for durable delayed retries.
6. **Do you need observability or correlation headers?** Keep transport headers here, but route general logging policy back to `logging-master`.
7. **Will retries or nack affect ordering and parallelism?** Treat `@RetryableTopic` as an ordering break and `nack(...)` as a whole-listener pause, not a single-record trick.

## Quick Mapping

| Situation | Default Move | Prefer Instead Of |
|-----------|--------------|-------------------|
| Production producer | `acks=all` + idempotence + send callback | Fire-and-forget `send()` |
| Consumer commit timing matters | Manual acknowledgment | Auto-commit |
| DB write and event publish must stay consistent | Outbox pattern | Assuming local `@Transactional` makes Kafka atomic |
| Short retry window, ordering matters | `DefaultErrorHandler` | Retry topics by default |
| Long/durable retries across restarts | `@RetryableTopic` | Sleeping or ad hoc retry loops |
| Single-record backoff with manual ack | `nack(long sleepMs)` only if whole-listener pause is acceptable | Assuming only the failed partition pauses |
| Kafka integration tests | EmbeddedKafka/Testcontainers + Awaitility | `Thread.sleep()` |

## Constraints

### MUST DO

| Rule | Preferred Pattern |
|------|-------------------|
| Use stable partition keys | String/UUID keys derived from domain identity |
| Handle producer results explicitly | `KafkaTemplate.send(...).whenComplete(...)` |
| Disable consumer auto-commit | Manual acknowledgment or an explicit commit strategy |
| Choose retry/DLT behavior deliberately | `DefaultErrorHandler` or `@RetryableTopic` with clear rules |
| Keep Kafka tests deterministic | Awaitility, latches, EmbeddedKafka/Testcontainers |
| Keep guarantees honest | Reserve exactly-once claims for Kafka-to-Kafka transactional flows, not DB side effects |

### MUST NOT DO
- Do not enable `enable-auto-commit: true` by default
- Do not use removed `SeekToCurrentErrorHandler` on Spring Kafka 3.x
- Do not pretend a JPA transaction and Kafka send are one atomic unit
- Do not use `@RetryableTopic` on batch listeners
- Do not rely on `Thread.sleep()` for asynchronous test verification
- Do not bury Kafka-specific transport rules inside generic logging or architecture guidance

## Gotchas

- Idempotent producer settings improve delivery safety but do not replace consumer-side idempotency.
- `@RetryableTopic` changes ordering characteristics because messages can move through retry topics.
- Manual acknowledgment is only safe if acknowledgment happens after successful processing.
- `nack(...)` pauses the entire listener for at least one `pollTimeout`, not just the failed record.
- `DefaultErrorHandler` handles application exceptions that extend `RuntimeException`; `Error` types still stop the consumer.
- Correlation headers are useful transport metadata, but full logging policy still belongs to `logging-master`.
- Kafka code often looks fine locally and still fails operationally if DLT handling, retries, and observability are not explicit.

## Minimal Examples

### Producer with explicit send handling
```java
kafkaTemplate.send("orders", event.orderId(), event)
    .whenComplete((result, ex) -> {
        if (ex != null) {
            log.error("Failed to publish order event {}", event.orderId(), ex);
            return;
        }
        log.info("Published order event {} to partition {} offset {}",
            event.orderId(),
            result.getRecordMetadata().partition(),
            result.getRecordMetadata().offset());
    });
```

### Consumer with manual acknowledgment
```java
@KafkaListener(topics = "orders", groupId = "order-service",
    containerFactory = "manualAckKafkaListenerContainerFactory")
public void consume(ConsumerRecord<String, OrderCreatedEvent> record, Acknowledgment ack) {
    orderService.process(record.value());
    ack.acknowledge();
}
```

## What to Verify
- Producer settings and send-result handling match the delivery guarantees you claim
- Consumer acknowledgment and retry strategy are explicit and test-covered
- DLT behavior is intentional, observable, and not hidden behind framework defaults
- Ordering and concurrency claims match the actual retry approach (`DefaultErrorHandler`, `nack`, or `@RetryableTopic`)
- Tests use deterministic waiting instead of timing guesses
- Kafka transport concerns stay here while broader logging and architecture concerns stay routed to the owning skills

## See References
- `references/producer.md` for idempotence, headers, outbox, and event DTO patterns
- `references/consumer.md` for listener containers, retries, DLT, concurrency, and filtering
- `references/testing.md` for EmbeddedKafka, Testcontainers, DLT, and idempotency tests
