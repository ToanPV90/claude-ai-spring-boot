# Spring Data Integration

## Core Wiring

```java
@Configuration
@EnableEntityViews(basePackages = "com.example.view")
@EnableBlazeRepositories(basePackages = "com.example.repository")
public class BlazePersistenceSpringDataConfig {
}
```

## Version and Module Alignment

- In Spring Boot 3.x, use the Jakarta-compatible Blaze-Persistence modules.
- Keep the Spring Data integration artifact aligned with the Spring Data major/minor line used by the project.
- Treat `CriteriaBuilderFactory` and `EntityViewManager` as required application-scoped infrastructure, not optional helpers.

```java
public interface OrderViewRepository extends EntityViewRepository<OrderSummaryView, Long> {

    List<OrderSummaryView> findByStatus(String status);
}
```

## Default Guidance

- Keep Blaze repositories focused on read models and projection-heavy access.
- Let JPA repositories own aggregate writes unless the view-based write path is deliberate.
- Prefer returning view types directly from repository methods instead of loading entities and mapping them afterward.

## Boot Integration Checks

- `CriteriaBuilderFactory` bean exists once
- `EntityViewManager` wiring is application-scoped
- entity-view packages are scanned
- repository interfaces make it obvious whether they return entities, views, or SQL-first projections
- startup fails fast when entity-view mappings are invalid instead of discovering mapping issues only at runtime
