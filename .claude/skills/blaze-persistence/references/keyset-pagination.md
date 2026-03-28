# Keyset Pagination

## When to Use It

Use keyset pagination when offset pagination becomes expensive on large, ordered result sets.

Keyset pagination works best when:
- the endpoint sorts by a stable, indexed column set
- the client moves forward/backward through a result stream
- large offsets would make `LIMIT/OFFSET` progressively slower

## Example

```java
CriteriaBuilder<Order> cb = cbf.create(entityManager, Order.class)
    .where("archived").eq(false)
    .orderByAsc("createdAt")
    .orderByAsc("id");

PagedList<OrderSummaryView> page = evm.applySetting(
        EntityViewSetting.create(OrderSummaryView.class, 0, 20),
        cb
    )
    .withKeysetExtraction(true)
    .getResultList();
```

## Rules

- Use a deterministic ordering; ties need a stable secondary sort such as `id`.
- Match the ordering to an index when possible.
- Do not claim keyset pagination solves random page jumping; it optimizes directional navigation.
- Keep the cursor / keyset material explicit in the application contract instead of pretending it behaves like page-number pagination.

## Spring Integration

If the application exposes pageable endpoints through Spring MVC or Spring Data integration, keep the pagination contract explicit and test the actual next-page flow.

- Make the next/previous-page contract explicit in controller and client code.
- Verify that the sort order is stable enough to extract and reuse the next keyset.
- Do not mix keyset pagination with unstable sorts or large join-multiplied result sets and assume it will remain correct.
