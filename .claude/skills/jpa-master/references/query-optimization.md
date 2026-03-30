# Query Optimization and Read Models

## Start with the Read Shape

Before writing a repository method, decide what the caller actually needs:
- a managed entity aggregate
- a lightweight read model
- a filtered/paged search result
- a bulk update/delete operation

If the answer is not “a mutable aggregate root,” start with a projection.

## Projection Patterns

### Interface projection
```java
public interface OrderSummary {
    Long getId();
    String getCustomerName();
    BigDecimal getTotal();
}

public interface OrderRepository extends JpaRepository<Order, Long> {

    @Query("select o.id as id, o.customer.name as customerName, o.total as total from Order o where o.status = :status")
    List<OrderSummary> findSummaries(@Param("status") OrderStatus status);
}
```

### DTO / record projection
```java
public record OrderRow(Long id, String customerName, BigDecimal total) {
}

@Query("select new com.example.orders.OrderRow(o.id, o.customer.name, o.total) from Order o where o.status = :status")
List<OrderRow> findRows(@Param("status") OrderStatus status);
```

Use projections when:
- rendering list/detail screens
- returning API responses
- avoiding lazy traversal of entity graphs

## Pagination

```java
public interface OrderRepository extends JpaRepository<Order, Long> {
    Page<Order> findByStatus(OrderStatus status, Pageable pageable);
}
```

Always page list endpoints that can grow large. Validate both the content query and the count query when custom JPQL is involved.

Avoid collection fetch joins in paged queries.

When offset pagination becomes expensive on large ordered result sets, consider keyset/seek pagination via `blaze-persistence`.

## Specifications

Use `JpaSpecificationExecutor` when you need dynamic filters but still want JPA semantics.

```java
public interface OrderRepository extends JpaRepository<Order, Long>, JpaSpecificationExecutor<Order> {
}
```

```java
public final class OrderSpecifications {

    private OrderSpecifications() {
    }

    public static Specification<Order> hasStatus(OrderStatus status) {
        return (root, query, cb) -> status == null ? null : cb.equal(root.get("status"), status);
    }

    public static Specification<Order> customerNameContains(String value) {
        return (root, query, cb) -> value == null ? null :
            cb.like(cb.lower(root.get("customer").get("name")), "%" + value.toLowerCase() + "%");
    }
}
```

If the query stays entity-centric but Specifications plus projections are becoming awkward, consider `blaze-persistence` entity views and criteria builder.

If the query is turning into SQL-heavy reporting, window functions, or database-specific expressions, switch to `jooq-master`.

## Bulk Operations

Bulk updates and deletes are better than loading thousands of entities only to mutate each one.

```java
public interface OrderRepository extends JpaRepository<Order, Long> {

    @Modifying
    @Query("update Order o set o.status = :status where o.createdAt < :threshold")
    int archiveOlderThan(@Param("status") OrderStatus status, @Param("threshold") LocalDateTime threshold);
}
```

Remember that bulk operations bypass the normal persistence-context lifecycle. Clear or refresh managed entities if later code in the same transaction depends on fresh state.

## Index-Aware Thinking

If a repository method filters heavily on a field, make sure the database schema supports that access path.

```java
@Entity
@Table(indexes = @Index(name = "idx_order_customer_email", columnList = "customerEmail"))
public class Order {
    private String customerEmail;
}
```

## Verification

- compare entity return types vs projection return types for the same use case
- inspect generated SQL for custom queries
- verify pagination and sorting under realistic data volume
- add integration coverage for bulk updates so stale entity assumptions do not leak in
