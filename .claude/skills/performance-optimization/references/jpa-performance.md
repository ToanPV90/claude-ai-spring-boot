# JPA Performance Patterns

## Detecting N+1 Queries

```yaml
# PROFILING ONLY — never in production
spring.jpa.properties.hibernate.generate_statistics: true
logging.level.org.hibernate.stat: DEBUG
```

If JDBC statement count far exceeds expected queries, you have N+1.

## Fix: @EntityGraph

```java
@EntityGraph(attributePaths = {"items", "items.product"})
Optional<Order> findWithItemsById(Long id);
```

## Fix: JOIN FETCH

```java
@Query("SELECT o FROM Order o JOIN FETCH o.items i JOIN FETCH i.product WHERE o.id = :id")
Optional<Order> findWithItemsAndProductsById(@Param("id") Long id);
```

**Warning:** Never combine collection `JOIN FETCH` with `Pageable` — Hibernate paginates in memory. Use a two-step query:

```java
@Query("SELECT o.id FROM Order o WHERE o.status = :status")
Page<Long> findIdsByStatus(@Param("status") Status status, Pageable pageable);

@EntityGraph(attributePaths = {"items"})
@Query("SELECT o FROM Order o WHERE o.id IN :ids")
List<Order> findWithItemsByIdIn(@Param("ids") List<Long> ids);
```

## DTO Projections

```java
// Interface projection — Hibernate generates optimized SQL
public interface OrderSummary {
    Long getId();
    String getStatus();
    BigDecimal getTotal();
}

Slice<OrderSummary> findAllByStatus(Status status, Pageable pageable);
```

```java
// Constructor expression
@Query("SELECT new com.example.dto.OrderSummaryDTO(o.id, o.status, o.total) " +
       "FROM Order o WHERE o.customerId = :customerId")
List<OrderSummaryDTO> findSummariesByCustomer(@Param("customerId") UUID customerId);
```

## Batch Inserts

```yaml
spring.jpa.properties.hibernate:
  jdbc.batch_size: 50
  order_inserts: true
  order_updates: true
```

```java
// Entity MUST use SEQUENCE — IDENTITY disables batching
@Id
@GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "event_seq")
@SequenceGenerator(name = "event_seq", sequenceName = "event_id_seq", allocationSize = 50)
private Long id;
```

`GenerationType.IDENTITY` forces individual inserts to read back generated IDs. Use `SEQUENCE` with `allocationSize` matching `batch_size`.
