# CRUD and Dynamic Queries

## Repository Shape

Keep jOOQ repositories SQL-focused and projection-oriented.

```java
@Repository
public class OrderJooqRepository {

    private final DSLContext dsl;

    public OrderJooqRepository(DSLContext dsl) {
        this.dsl = dsl;
    }

    public Optional<OrderRecord> findById(Long id) {
        return dsl.selectFrom(ORDERS)
            .where(ORDERS.ID.eq(id))
            .fetchOptional();
    }

    public Long create(CreateOrderRequest request) {
        return dsl.insertInto(ORDERS)
            .set(ORDERS.CUSTOMER_ID, request.customerId())
            .set(ORDERS.TOTAL, request.total())
            .set(ORDERS.STATUS, "PENDING")
            .set(ORDERS.CREATED_AT, LocalDateTime.now())
            .returning(ORDERS.ID)
            .fetchOne()
            .getId();
    }
}
```

## Joined Read Models

```java
public List<OrderWithCustomer> findOrdersWithCustomer(OrderStatus status) {
    return dsl.select(
            ORDERS.ID,
            ORDERS.TOTAL,
            ORDERS.STATUS,
            CUSTOMERS.NAME.as("customerName"),
            CUSTOMERS.EMAIL.as("customerEmail"))
        .from(ORDERS)
        .join(CUSTOMERS).on(ORDERS.CUSTOMER_ID.eq(CUSTOMERS.ID))
        .where(ORDERS.STATUS.eq(status.name()))
        .orderBy(ORDERS.CREATED_AT.desc())
        .fetchInto(OrderWithCustomer.class);
}
```

## Dynamic Filtering

```java
public Page<OrderSummary> searchOrders(OrderSearchCriteria criteria, Pageable pageable) {
    List<Condition> conditions = new ArrayList<>();

    if (criteria.status() != null) {
        conditions.add(ORDERS.STATUS.eq(criteria.status()));
    }
    if (criteria.minTotal() != null) {
        conditions.add(ORDERS.TOTAL.ge(criteria.minTotal()));
    }
    if (criteria.customerName() != null) {
        conditions.add(CUSTOMERS.NAME.containsIgnoreCase(criteria.customerName()));
    }

    Condition whereClause = DSL.and(conditions);

    int total = dsl.selectCount()
        .from(ORDERS)
        .join(CUSTOMERS).on(ORDERS.CUSTOMER_ID.eq(CUSTOMERS.ID))
        .where(whereClause)
        .fetchOne(0, int.class);

    List<OrderSummary> results = dsl.select(ORDERS.ID, ORDERS.STATUS, ORDERS.TOTAL, CUSTOMERS.NAME)
        .from(ORDERS)
        .join(CUSTOMERS).on(ORDERS.CUSTOMER_ID.eq(CUSTOMERS.ID))
        .where(whereClause)
        .orderBy(getSortFields(pageable.getSort()))
        .limit(pageable.getPageSize())
        .offset(pageable.getOffset())
        .fetchInto(OrderSummary.class);

    return new PageImpl<>(results, pageable, total);
}
```

### `noCondition()` Alternative

When a query is heavily conditional, `noCondition()` is the jOOQ-native starting point for composing optional predicates without juggling mutable lists.

```java
Condition condition = noCondition();

if (criteria.status() != null) {
    condition = condition.and(ORDERS.STATUS.eq(criteria.status()));
}
if (criteria.minTotal() != null) {
    condition = condition.and(ORDERS.TOTAL.ge(criteria.minTotal()));
}

return dsl.selectFrom(ORDERS)
    .where(condition)
    .fetchInto(OrderSummary.class);
```

## Sort Mapping

```java
private List<SortField<?>> getSortFields(Sort sort) {
    return sort.stream()
        .map(order -> {
            Field<?> field = switch (order.getProperty()) {
                case "total" -> ORDERS.TOTAL;
                case "createdAt" -> ORDERS.CREATED_AT;
                case "customerName" -> CUSTOMERS.NAME;
                default -> ORDERS.ID;
            };
            return order.isAscending() ? field.asc() : field.desc();
        })
        .toList();
}
```

## Defaults

- Map user-facing sort keys to known fields; never trust raw property names.
- Select only the columns the caller needs.
- Keep SQL-building logic close to the repository; do not spread `Condition` creation across controllers.

## Upsert with PostgreSQL `ON CONFLICT`

```java
public void saveDailySummary(DailySummary summary) {
    dsl.insertInto(DAILY_SUMMARY)
        .set(DAILY_SUMMARY.DAY, summary.day())
        .set(DAILY_SUMMARY.TOTAL_REVENUE, summary.totalRevenue())
        .set(DAILY_SUMMARY.ORDER_COUNT, summary.orderCount())
        .onConflict(DAILY_SUMMARY.DAY)
        .doUpdate()
        .set(DAILY_SUMMARY.TOTAL_REVENUE, summary.totalRevenue())
        .set(DAILY_SUMMARY.ORDER_COUNT, summary.orderCount())
        .execute();
}
```

## Route Elsewhere

- If the caller really needs aggregate behavior, lifecycle callbacks, or entity graphs, go back to `jpa-patterns`.
- If the bigger question is where repositories belong in the service architecture, use `spring-boot-patterns`.
