---
name: kafka-patterns
description: >
  Patterns and best practices for Spring Kafka, KafkaTemplate, @KafkaListener,
  Kafka consumer, Kafka producer, EmbeddedKafka, dead letter topic, @RetryableTopic,
  event-driven architecture, and DLT configuration in Spring Boot 3.x applications.
license: MIT
metadata:
  author: local
  version: "1.0.0"
  domain: messaging
  triggers: Spring Kafka, KafkaTemplate, @KafkaListener, Kafka consumer, Kafka producer, EmbeddedKafka, dead letter topic, @RetryableTopic, event-driven, DLT
  role: specialist
  scope: implementation
  output-format: code
  related-skills: spring-boot-engineer, tdd-guide, logging-patterns, spring-boot-patterns
---

# Kafka Patterns

## Reference Guide

| Topic    | Reference              | Load When                                                   |
|----------|------------------------|-------------------------------------------------------------|
| Producer | references/producer.md | KafkaTemplate, idempotent producer, transactions, headers   |
| Consumer | references/consumer.md | @KafkaListener, error handling, DLT, @RetryableTopic, batch |
| Testing  | references/testing.md  | EmbeddedKafka, TestContainers Kafka, consumer verification  |

## Quick Start

**Dependency (pom.xml):**
```xml
<dependency>
    <groupId>org.springframework.kafka</groupId>
    <artifactId>spring-kafka</artifactId>
</dependency>
```

**Configuration (application.yml):**
```yaml
spring:
  kafka:
    bootstrap-servers: localhost:9092
    consumer:
      group-id: my-service
      auto-offset-reset: earliest
      enable-auto-commit: false
      key-deserializer: org.apache.kafka.common.serialization.StringDeserializer
      value-deserializer: org.springframework.kafka.support.serializer.JsonDeserializer
    producer:
      key-serializer: org.apache.kafka.common.serialization.StringSerializer
      value-serializer: org.springframework.kafka.support.serializer.JsonSerializer
```

**Minimal Producer** — see `references/producer.md` for full idempotent config:
```java
public record OrderCreatedEvent(String orderId, String customerId, BigDecimal total) {}

@Service
public class OrderEventPublisher {
    private final KafkaTemplate<String, OrderCreatedEvent> kafkaTemplate;
    public OrderEventPublisher(KafkaTemplate<String, OrderCreatedEvent> kafkaTemplate) {
        this.kafkaTemplate = kafkaTemplate;
    }
    public void publish(OrderCreatedEvent event) {
        kafkaTemplate.send("orders", event.orderId(), event)
            .whenComplete((result, ex) -> {
                if (ex != null) log.error("Failed [{}]", event.orderId(), ex);
                else log.info("Sent offset={}", result.getRecordMetadata().offset());
            });
    }
}
```

**Minimal Consumer** — see `references/consumer.md` for error handler + DLT config:
```java
@KafkaListener(topics = "orders", groupId = "my-service",
               containerFactory = "manualAckKafkaListenerContainerFactory")
public void consume(ConsumerRecord<String, OrderCreatedEvent> record, Acknowledgment ack) {
    try { orderService.process(record.value()); ack.acknowledge(); }
    catch (Exception ex) { ack.nack(Duration.ofSeconds(1)); }
}
```

## Key Design Decisions
- Always use String keys (UUID values) for partition-based ordering
- Always set `acks=all` + `enable.idempotence=true` in production
- Never use auto-commit — always `MANUAL_IMMEDIATE`
- Dead Letter Topic naming convention: `{original-topic}.DLT`
- Testing: EmbeddedKafka for unit/slice, TestContainers Kafka for integration

## Constraints

**MUST DO:**

| Rule                   | Correct Pattern                                               |
|------------------------|---------------------------------------------------------------|
| acks=all + idempotence | `ACKS_CONFIG=all`, `ENABLE_IDEMPOTENCE_CONFIG=true` in ProducerFactory |
| Manual ack             | `Acknowledgment.acknowledge()` in `@KafkaListener`           |
| Check send result      | `.whenComplete()` on `KafkaTemplate.send()`                  |
| DefaultErrorHandler    | Configure bean with `ExponentialBackOff` + DLT recoverer     |
| String keys            | `UUID.randomUUID().toString()` as partition key              |

**MUST NOT DO:**
- `enable-auto-commit: true`
- `SeekToCurrentErrorHandler` (removed in Spring Kafka 3.x)
- `Thread.sleep()` in tests — use `CountDownLatch` or Awaitility
- `@KafkaListener` without explicit `groupId`
- `KafkaTemplate.send()` without handling the `CompletableFuture`
