# Entity Views

## When Entity Views Are the Right Default

Use Blaze entity views when the caller needs a read model shaped like the API or UI, but the underlying data still belongs to JPA entities.

Prefer entity views for:
- list/detail screens that only need selected fields
- nested read models without loading whole aggregate graphs
- reducing JPQL constructor-expression sprawl
- avoiding post-query entity-to-DTO mapping code

## Basic View

```java
@EntityView(Order.class)
public interface OrderSummaryView {

    @IdMapping
    Long getId();

    String getStatus();

    BigDecimal getTotal();
}
```

## Subviews

```java
@EntityView(Customer.class)
public interface CustomerSummaryView {

    @IdMapping
    Long getId();

    String getName();
}

@EntityView(Order.class)
public interface OrderWithCustomerView {

    @IdMapping
    Long getId();

    CustomerSummaryView getCustomer();
}
```

## Mapping Expressions

Use `@Mapping` when the view needs a derived field but the problem is still entity-centric.

```java
@EntityView(Order.class)
public interface OrderSummaryView {

    @IdMapping
    Long getId();

    @Mapping("COALESCE(discount, 0)")
    BigDecimal getEffectiveDiscount();

    @Mapping("SIZE(lines)")
    Integer getLineCount();
}
```

Keep mapping expressions small and read-model-focused. If the expression turns into database-specific reporting logic, route to `jooq-master`.

## Limit Collection Shape Deliberately

If a view only needs the top few related items, keep that limit explicit instead of exposing the whole collection shape by habit.

## Updatable Views

Use updatable views only when the team deliberately wants write behavior through a view abstraction.

```java
@UpdatableEntityView
@EntityView(Order.class)
public interface OrderUpdateView {

    @IdMapping
    Long getId();

    String getStatus();
    void setStatus(String status);
}
```

Default rule: keep writes on JPA aggregates unless updatable views clearly simplify a bounded use case.

## Gotchas

- Always include `@IdMapping`.
- Do not leak managed entities through view methods unless that tradeoff is intentional.
- Keep view contracts small; if the view starts mirroring the whole entity graph, the abstraction is losing value.
- Derived mappings should stay projection-oriented; if they become SQL-heavy, the problem likely belongs in `jooq-master`.
- If the goal is SQL-heavy analytics rather than entity-centric read models, route to `jooq-master`.
