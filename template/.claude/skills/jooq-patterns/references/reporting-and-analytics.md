# Reporting and Analytics

## Aggregations

```java
public List<StatusRevenue> revenueByStatus() {
    return dsl.select(
            ORDERS.STATUS,
            count().as("orderCount"),
            sum(ORDERS.TOTAL).as("totalRevenue"),
            avg(ORDERS.TOTAL).as("avgOrderValue"))
        .from(ORDERS)
        .groupBy(ORDERS.STATUS)
        .orderBy(sum(ORDERS.TOTAL).desc())
        .fetchInto(StatusRevenue.class);
}

public record StatusRevenue(String status, int orderCount, BigDecimal totalRevenue, BigDecimal avgOrderValue) {
}
```

### Aggregate `FILTER` Clauses

On PostgreSQL, filtered aggregates are often clearer than wrapping every aggregate in `CASE` expressions.

```java
public OrderStatusBreakdown summarizeStatuses() {
    return dsl.select(
            count().as("totalOrders"),
            count().filterWhere(ORDERS.STATUS.eq("COMPLETED")).as("completedOrders"),
            sum(ORDERS.TOTAL).filterWhere(ORDERS.STATUS.eq("COMPLETED")).as("completedRevenue"))
        .from(ORDERS)
        .fetchOneInto(OrderStatusBreakdown.class);
}
```

## Window Functions

```java
public List<CustomerRanking> rankCustomers() {
    return dsl.select(
            CUSTOMERS.NAME,
            sum(ORDERS.TOTAL).as("totalSpent"),
            rank().over(orderBy(sum(ORDERS.TOTAL).desc())).as("rank"),
            rowNumber().over(orderBy(sum(ORDERS.TOTAL).desc())).as("rowNum"))
        .from(CUSTOMERS)
        .join(ORDERS).on(ORDERS.CUSTOMER_ID.eq(CUSTOMERS.ID))
        .groupBy(CUSTOMERS.ID, CUSTOMERS.NAME)
        .fetchInto(CustomerRanking.class);
}
```

## Common Table Expressions

```java
public List<MonthlyTrend> monthlyRevenueTrend() {
    var monthly = name("monthly").fields("month", "revenue").as(
        select(
            trunc(ORDERS.CREATED_AT, DatePart.MONTH).as("month"),
            sum(ORDERS.TOTAL).as("revenue"))
        .from(ORDERS)
        .where(ORDERS.STATUS.eq("COMPLETED"))
        .groupBy(trunc(ORDERS.CREATED_AT, DatePart.MONTH))
    );

    return dsl.with(monthly)
        .select(
            monthly.field("month"),
            monthly.field("revenue"),
            lag(monthly.field("revenue", BigDecimal.class))
                .over(orderBy(monthly.field("month"))).as("prevMonth"))
        .from(monthly)
        .orderBy(monthly.field("month"))
        .fetchInto(MonthlyTrend.class);
}
```

## Reporting Defaults

- Use dedicated read models or records for report rows.
- Keep report repositories separate from aggregate-write repositories.
- Prefer database-native features when they simplify the query dramatically.
- Verify grouping, ranking, and time bucketing against realistic data, not toy fixtures.

## Single-Query Pagination Metadata

When the endpoint needs both page rows and the total count, `count().over()` can avoid a second count query.

```java
public List<OrderPageRow> searchWithTotal(Pageable pageable) {
    return dsl.select(
            ORDERS.ID,
            ORDERS.STATUS,
            ORDERS.TOTAL,
            count().over().as("totalRows"))
        .from(ORDERS)
        .orderBy(ORDERS.CREATED_AT.desc(), ORDERS.ID.desc())
        .limit(pageable.getPageSize())
        .offset(pageable.getOffset())
        .fetchInto(OrderPageRow.class);
}
```

## Gotchas

- Reporting queries often look like “just another repository method” until they accumulate CTEs, ranking, and time-series logic; split them out early.
- Do not funnel report rows back into mutable domain entities.
- Ensure paginated reporting queries have deterministic ordering before adding `offset` or keyset semantics.
