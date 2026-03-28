# Advanced SQL

## Existence Checks

Prefer `exists(...)` over `count(*) > 0` when the question is only whether at least one row matches.

```java
public boolean customerHasCompletedOrders(Long customerId) {
    return dsl.fetchExists(
        selectOne()
            .from(ORDERS)
            .where(ORDERS.CUSTOMER_ID.eq(customerId))
            .and(ORDERS.STATUS.eq("COMPLETED"))
    );
}
```

For anti-joins involving nullable columns, prefer `notExists(...)` to `NOT IN`.

## `UNION ALL` by Default

Use `UNION ALL` unless you explicitly need deduplication.

```java
public List<ActivityRow> recentActivity() {
    return dsl.select(ORDERS.ID.as("id"), inline("ORDER").as("kind"))
        .from(ORDERS)
        .unionAll(
            select(INVOICES.ID.as("id"), inline("INVOICE").as("kind"))
                .from(INVOICES)
        )
        .fetchInto(ActivityRow.class);
}
```

## PostgreSQL `FOR UPDATE`

When the workflow truly needs pessimistic locking, make it explicit in the repository instead of relying on incidental transaction timing.

```java
public Optional<OrderRecord> findForProcessing(Long id) {
    return dsl.selectFrom(ORDERS)
        .where(ORDERS.ID.eq(id))
        .forUpdate()
        .fetchOptional();
}
```

## PostgreSQL JSONB

Database-specific features are valid when they simplify a SQL-shaped use case.

```java
public List<OrderEventRow> findByEventType(String type) {
    return dsl.select(ORDER_EVENTS.ID, ORDER_EVENTS.PAYLOAD)
        .from(ORDER_EVENTS)
        .where(field("payload ->> 'type'", String.class).eq(type))
        .fetchInto(OrderEventRow.class);
}
```

## Route Elsewhere

- If JSONB or array handling becomes part of aggregate mapping semantics, reassess whether the feature should stay in `jooq-patterns` or move back toward `jpa-patterns` / `blaze-persistence`.
- If the query becomes a reusable service boundary or reporting subsystem decision, route to `java-architect`.
