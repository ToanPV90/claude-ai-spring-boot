# Criteria Builder

## Setup

```java
@Configuration
public class BlazePersistenceConfig {

    @Bean
    CriteriaBuilderFactory criteriaBuilderFactory(EntityManagerFactory entityManagerFactory) {
        CriteriaBuilderConfiguration configuration = Criteria.getDefault();
        return configuration.createCriteriaBuilderFactory(entityManagerFactory);
    }
}
```

Create `CriteriaBuilderFactory` once at application scope.

If the application uses entity views, `EntityViewManager` should also be configured once at application scope and validated at startup rather than created ad hoc per request.

## Dynamic Query Composition

```java
public List<OrderSummaryView> search(OrderSearchCriteria criteria) {
    CriteriaBuilder<Order> cb = cbf.create(entityManager, Order.class)
        .where("archived").eq(false);

    if (criteria.status() != null) {
        cb.where("status").eq(criteria.status());
    }
    if (criteria.customerName() != null) {
        cb.where("customer.name").like(false).value("%" + criteria.customerName() + "%");
    }

    cb.orderByAsc("id");

    return evm.applySetting(EntityViewSetting.create(OrderSummaryView.class), cb)
        .getResultList();
}
```

## Spring Boot Wiring Notes

- Use the Jakarta/Spring 6 compatible Blaze-Persistence artifacts in Spring Boot 3.x applications.
- Keep `CriteriaBuilderFactory` and `EntityViewManager` as singleton application beans.
- Make the view package scan explicit so startup validation catches bad mappings early.

## Filters and Sorters

If the endpoint is really UI-driven search over a view, prefer explicit view-level filtering/sorting conventions over scattering stringly-typed dynamic query assembly through services.

Use manual criteria composition when the query is still domain-specific and readable. If the filter/sort surface becomes generic UI infrastructure, keep that abstraction explicit and test it as a view concern.

## Prefer Blaze Criteria Over Specifications When

- projections are the main output, not entities
- filters and joins are dynamic enough that Specifications become awkward
- the query stays entity-centric and does not need SQL-first reporting features

If the query still fits simple aggregate reads or normal `JpaSpecificationExecutor` usage, stay with `jpa-patterns`.

## Route Elsewhere

- plain entity CRUD and fetch tuning → `jpa-patterns`
- SQL-first analytics, window functions, CTE-heavy reporting → `jooq-patterns`
