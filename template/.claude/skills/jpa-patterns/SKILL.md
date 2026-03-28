---
name: jpa-patterns
description: JPA/Hibernate troubleshooting and implementation patterns for Spring Boot. Use when users mention N+1 queries, LazyInitializationException, entity mapping bugs, fetch strategy problems, transaction boundaries, or Spring Data JPA repository behavior.
license: MIT
metadata:
  author: local
  version: "1.1.0"
  domain: backend
  triggers:
    - JPA
    - Hibernate
    - Spring Data JPA
    - JpaRepository
    - @Transactional
    - @EntityGraph
    - @DataJpaTest
    - @OneToMany
    - @ManyToOne
    - @ManyToMany
    - N+1
    - LazyInitializationException
    - MultipleBagFetchException
    - detached entity passed to persist
    - OptimisticLockException
    - fetch strategy
    - entity relationships
  role: specialist
  scope: implementation
  output-format: code + guidance
  related-skills: spring-boot-patterns, java-code-review, clean-code, jooq-patterns, blaze-persistence, postgres-master
---

# JPA Patterns Skill

Practical JPA/Hibernate guidance for Spring Boot 3.x applications using Hibernate 6 and Jakarta Persistence.

## When to Use
- The user reports N+1 queries, lazy loading failures, or strange repository query behavior
- The task involves entity relationships, `JpaRepository`, `@EntityGraph`, or `@Transactional`
- The user is deciding between entities, projections, specifications, or bulk updates
- The code needs JPA-specific tests, optimistic locking, or mapping cleanup

## When Not to Use
- The work is SQL-first, reporting-heavy, CTE-heavy, or database-first — use `jooq-patterns`
- The task is generic Spring layering or controller/service structure — use `spring-boot-patterns`
- The task is broad code review rather than ORM behavior — use `java-code-review`

## Injection Rule
- Production code: use constructor injection only
- Spring-managed test classes may use field injection for framework-managed fixtures like repositories and `TestEntityManager`
- Never show `@Autowired` field injection in production service examples

## Version Assumptions
- Spring Boot 3.x
- Hibernate ORM 6.x
- Jakarta Persistence (`jakarta.persistence.*`)

## Reference Guide

| Topic | Reference | Load When |
|------|-----------|-----------|
| Fetch shaping, N+1, lazy loading | `references/fetching.md` | Too many SELECTs, `LazyInitializationException`, fetch strategy questions |
| Transactions and locking | `references/transactions.md` | `@Transactional`, propagation, flush behavior, optimistic locking |
| Entity mapping rules | `references/entity-relationships.md` | `@OneToMany`, cascades, orphanRemoval, `equals/hashCode`, auditing |
| Query design | `references/query-optimization.md` | DTO projections, pagination, bulk updates, `JpaSpecificationExecutor` |
| Testing | `references/testing.md` | `@DataJpaTest`, TestContainers, query verification, persistence slice tests |
| PostgreSQL-specific patterns | `references/postgresql.md` | JSONB, arrays, upsert, advisory locks, PostgreSQL indexing |

## Symptom Triage

| Symptom | Likely Cause | Default Fix |
|---------|--------------|-------------|
| Many repeated SELECTs | N+1 fetching | Shape the read with projection, `@EntityGraph`, `JOIN FETCH`, or batch fetching |
| `LazyInitializationException` | Lazy association accessed outside persistence context | Return a DTO/projection or fetch what you need inside a transactional read |
| Slow read endpoint | Loading full entities for a read model | Prefer projection + pagination; add indexes for frequent filters |
| Duplicates or broken pages with relation fetching | Collection fetch join + pagination | Use a two-step read or a DTO projection |
| `OptimisticLockException` | Concurrent update without retry strategy | Add `@Version` and decide whether to retry or fail fast |
| `detached entity passed to persist` | Wrong entity lifecycle assumption | Reattach/merge intentionally or load managed entities first |
| Deletes cascade too far | Misused cascade settings | Move cascade/orphan rules to the aggregate root only |

## Golden Rules

### MUST DO

| Rule | Preferred Pattern |
|------|-------------------|
| Default associations to lazy fetching | `@ManyToOne(fetch = FetchType.LAZY)` and lazy collections |
| Shape reads explicitly | DTO projection, `@EntityGraph`, fetch join, or batch fetch based on the use case |
| Paginate large result sets | `Pageable` or slice reads for list endpoints |
| Use projections for read models | Interface, record, or DTO projection over full entity graphs |
| Keep transactions as short as practical | Perform only the required database work inside the boundary, but finish entity access and mapping before leaving it |
| Protect concurrent writes | Add `@Version` where lost updates matter |
| Keep relationship state synchronized | Use helper methods on the owning aggregate |

### MUST NOT DO
- Do not switch everything to `FetchType.EAGER` to silence lazy loading problems
- Do not expose entities directly through the API layer
- Do not use `CascadeType.ALL` on `@ManyToOne`
- Do not include lazy collections in `toString()`, logging, or JSON serialization by default
- Do not combine collection fetch joins with pagination blindly
- Do not place transactional boundaries on private methods or rely on self-invocation

## Gotchas

- `@DataJpaTest` can hide dialect-specific behavior unless the test runs against the same database engine as production.
- Updating only the inverse side of a bidirectional relationship does not update the foreign key; change the owning side or use helper methods that keep both sides synchronized.
- Collection fetch joins can appear to work in development and still break pagination, counts, or duplicate handling under real data volume.
- Lazy fields referenced from logging, serialization, or debugging helpers can trigger extra queries or `LazyInitializationException` outside the transaction.
- Calling an `@Transactional` method from the same bean bypasses the Spring proxy, so the transaction boundary is never applied.

## Default Decision Ladder

1. **Read model only?** Start with a projection.
2. **Need an aggregate with a small, known association graph?** Use `@EntityGraph` or a focused fetch join.
3. **Need dynamic filtering?** Use `JpaSpecificationExecutor` if you still want JPA semantics.
4. **Need projection-heavy dynamic queries that are still entity-centric?** Escalate to `blaze-persistence` before forcing JPA constructor expressions or Specifications too far.
5. **Need large reporting or SQL-native features?** Move to `jooq-patterns`.

## Minimal Examples

### Projection-first read
```java
public record OrderSummary(Long id, String status, BigDecimal total) {}

public interface OrderRepository extends JpaRepository<Order, Long> {

    @Query("select new com.example.orders.OrderSummary(o.id, o.status, o.total) from Order o where o.id = :id")
    Optional<OrderSummary> findSummaryById(@Param("id") Long id);
}
```

### Focused fetch with `@EntityGraph`
```java
public interface AuthorRepository extends JpaRepository<Author, Long> {

    @EntityGraph(attributePaths = {"books"})
    Optional<Author> findById(Long id);
}
```

### Transactional read that maps inside the boundary
```java
@Service
public class OrderService {

    private final OrderRepository orderRepository;

    public OrderService(OrderRepository orderRepository) {
        this.orderRepository = orderRepository;
    }

    @Transactional(readOnly = true)
    public OrderSummary getOrderSummary(Long id) {
        return orderRepository.findSummaryById(id).orElseThrow();
    }
}
```

### Optimistic locking
```java
@Entity
public class Order {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Version
    private Long version;
}
```

## What to Verify
- Enable SQL logging when investigating N+1 or lazy loading problems
- Inspect generated SQL before changing fetch types globally
- Confirm paging, counts, and duplicates when relationships are involved
- Add a persistence-focused test before and after a fix for fetch, transaction, or locking bugs

## See References
- `references/fetching.md` for N+1, lazy loading, `@EntityGraph`, batch fetching, and paging caveats
- `references/transactions.md` for propagation, self-invocation, flush behavior, and optimistic locking
- `references/entity-relationships.md` for mapping rules, cascades, helper methods, and auditing
- `references/query-optimization.md` for projections, specifications, pagination, and bulk operations
- `references/testing.md` for `@DataJpaTest`, TestContainers, and persistence verification patterns
