---
name: blaze-persistence
description: Implementation guidance for Blaze-Persistence in Spring Boot when JPA queries need entity views, keyset pagination, or richer criteria building without switching to SQL-first data access. Use when building or reviewing `@EntityView`, `EntityViewManager`, Blaze criteria queries, keyset pagination, or Spring Data Blaze repositories.
license: MIT
metadata:
  author: local
  version: "1.1.0"
  domain: backend
  triggers:
    - Blaze-Persistence
    - blaze-persistence
    - @EntityView
    - @UpdatableEntityView
    - @Mapping
    - EntityView
    - EntityViewManager
    - EntityViewSetting
    - BlazeRepository
    - CriteriaBuilderFactory
    - keyset pagination
    - KeysetPage
    - DTO mapping boilerplate
    - projection-heavy query
    - advanced JPA query
  role: specialist
  scope: implementation
  output-format: code + guidance
  related-skills: jpa-master, jooq-master, postgres-master, spring-boot-engineer, spring-boot-master, java-code-review, tdd-guide
---

# Blaze-Persistence

Decision guide for using Blaze-Persistence as the JPA-centric middle path between plain Spring Data JPA and SQL-first jOOQ.

## Version Assumptions

- Spring Boot 3.x
- Hibernate ORM 6.x / Jakarta Persistence
- Blaze-Persistence 1.6+
- PostgreSQL as the default target dialect unless a project says otherwise

## When to Use
- The task needs `@EntityView` projections instead of loading managed entity graphs
- JPA Specifications or JPQL are getting too contorted for dynamic filtering, sorting, or projection-heavy reads
- The user needs keyset/seek pagination for large result sets
- Spring Data integration should return read models through Blaze repositories instead of entities
- The codebase should stay JPA/Hibernate-centric while gaining richer query and projection capabilities

## When Not to Use
- The task is ordinary aggregate CRUD, fetch tuning, lazy loading, or transaction/relationship behavior — use `jpa-master`
- The task is SQL-first reporting, CTE-heavy analytics, or database-native query design — use `jooq-master`
- The task is controller/service/repository ownership or DTO boundary design — use `spring-boot-master`
- The task is broad architecture/decomposition tradeoffs — use `java-architect`
- The task is review-only risk analysis rather than implementation guidance — use `java-code-review`

## Reference Guide

| Topic | Reference | Load When |
|------|-----------|-----------|
| Entity views and projection design | `references/entity-views.md` | Building `@EntityView`, subviews, view mappings, or updatable views |
| Criteria builder and dynamic queries | `references/criteria-builder.md` | Composing dynamic filters, joins, sorting, or CriteriaBuilderFactory setup |
| Fetch strategies | `references/fetch-strategies.md` | Choosing between join-style fetching and safer collection strategies for subviews |
| Keyset pagination | `references/keyset-pagination.md` | Replacing offset pagination or integrating keyset paging with Spring Data/Web |
| Spring Data integration | `references/spring-data-integration.md` | Wiring Blaze repositories, `EntityViewManager`, or Spring Boot configuration |
| Coexistence and testing | `references/coexistence-and-testing.md` | Mixing Blaze with JPA/jOOQ or adding focused integration tests |

## Symptom Triage

| Symptom | Likely Cause | Default Move |
|--------|--------------|--------------|
| JPA projection code keeps expanding with custom JPQL constructor expressions | Read model is still entity-centric, but DTO mapping has become noisy | Switch to entity views |
| Offset pagination is too slow on large tables | Large ordered result set is paying growing offset cost | Use Blaze keyset pagination |
| Specifications are too awkward for a projection-heavy search endpoint | Dynamic filters and projection design are now fighting each other | Use Blaze criteria builder + entity views |
| The service should keep JPA entities for writes but expose optimized read models | Aggregate writes and query-side reads want different shapes | Use Blaze for read paths, JPA for aggregates |
| The query needs SQL-first reporting features outside the entity model | The problem is no longer entity-centric | Stop and route to `jooq-master` |

## Persistence Decision Ladder

1. If the caller needs a mutable aggregate, stay with JPA.
2. If the caller needs a JPA-backed read model with rich projection support, use Blaze entity views.
3. If dynamic filtering and projection composition are the main pain point, use Blaze criteria builder.
4. Pick fetch strategies deliberately for subviews and collections instead of relying on the default shape blindly.
5. If pagination depth is the bottleneck, prefer keyset pagination over large offsets.
6. If the query is fundamentally SQL-shaped or database-native, switch to `jooq-master` instead of forcing Blaze to act like jOOQ.

## Quick Mapping

| Need | Default Choice |
|-----|----------------|
| Read-only DTO over entities | Blaze entity view |
| Dynamic JPA-backed search query | Blaze criteria builder |
| Nested collection-heavy read model | Blaze + deliberate fetch strategy |
| Large scrolling result set | Blaze keyset pagination |
| Aggregate write model | JPA |
| SQL-first analytics / CTE-heavy report | jOOQ |

## Constraints

### MUST DO

| Rule | Preferred Pattern |
|------|-------------------|
| Keep Blaze on the read/query side unless updatable views are explicitly justified | Entity views for read models, JPA entities for aggregates |
| Configure `CriteriaBuilderFactory` and `EntityViewManager` once at application scope | Spring singleton beans |
| Include `@IdMapping` on entity views whenever possible | Stable identity is required for subviews, collections, and view reuse |
| Return explicit projections or view types from Blaze-backed repositories | Avoid leaking entities when a view is the real contract |
| Choose fetch strategy intentionally for to-many subviews | Use collection-friendly strategies when JOIN-style fetching would explode row counts |
| Keep the boundary to JPA and jOOQ explicit | JPA for aggregates, Blaze for entity-centric read models, jOOQ for SQL-first work |

### MUST NOT DO
- Do not replace simple JPA repository methods with Blaze just for novelty.
- Do not force Blaze into SQL-first reporting where jOOQ is a cleaner fit.
- Do not treat entity views as a substitute for deciding API boundaries; controller/service ownership still belongs elsewhere.
- Do not bury Blaze wiring in ad hoc per-request factory creation.
- Do not let large to-many subviews default to an accidental fetch shape without checking row explosion and paging behavior.

## Gotchas
- Entity views are strongest for read models; use updatable views only when the write-path tradeoff is explicit.
- `@IdMapping` is effectively the default for real-world views; leaving it out weakens reuse in collections and nested view graphs.
- Keyset pagination requires stable sort order and suitable indexes; it is not a drop-in replacement for every paged endpoint.
- Collection-heavy subviews need deliberate fetch-strategy choices; default join-style fetching can multiply rows fast.
- Blaze criteria builder reduces JPA query contortions, but it does not remove the need to decide whether the problem is really JPA-shaped or SQL-shaped.
- Spring Data + Blaze works best when repositories return view types directly instead of mapping entities afterward.

## Minimal Examples

```java
@EntityView(Order.class)
public interface OrderSummaryView {

    @IdMapping
    Long getId();

    String getStatus();

    BigDecimal getTotal();
}
```

```java
CriteriaBuilder<Order> cb = cbf.create(entityManager, Order.class)
    .where("status").eq(status)
    .orderByAsc("id");

List<OrderSummaryView> results = evm.applySetting(
        EntityViewSetting.create(OrderSummaryView.class),
        cb
    )
    .getResultList();
```

## What to Verify
- Blaze is being used for the right problem shape: projection-heavy JPA queries, not generic CRUD or SQL-first analytics
- View types expose only the fields the caller actually needs
- To-many subviews have an intentional fetch strategy and do not accidentally explode the result set
- Keyset pagination uses stable ordering and realistic integration tests
- Spring wiring creates Blaze factories/managers once and reuses them across the application
- JPA / Blaze / jOOQ ownership is explicit when multiple persistence approaches coexist

## See References
- `references/entity-views.md` for view design, subviews, and updatable-view guidance
- `references/criteria-builder.md` for dynamic query composition and setup
- `references/fetch-strategies.md` for JOIN/SELECT/SUBSELECT/MULTISET tradeoffs
- `references/keyset-pagination.md` for seek pagination and Spring web integration
- `references/spring-data-integration.md` for repository wiring and Boot configuration
- `references/coexistence-and-testing.md` for JPA/jOOQ boundaries and testing defaults
