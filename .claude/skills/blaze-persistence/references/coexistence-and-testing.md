# Coexistence and Testing

## JPA + Blaze

- JPA owns aggregates, cascades, and entity lifecycle.
- Blaze owns projection-heavy read models, keyset pagination, and richer entity-centric query composition.
- Keep the service layer responsible for deciding whether a use case returns an aggregate or a view.

## Blaze + jOOQ

- Blaze is still entity-centric.
- jOOQ is a better fit when the problem is SQL-first, report-row-first, or database-native.
- If the query wants CTE-heavy reporting, window functions, or database-specific operators as the main design axis, route to `jooq-patterns`.

## Testing Defaults

Use integration tests for Blaze features that depend on real JPA mappings, sorting, pagination, or generated SQL shape.

```java
@SpringBootTest
@Transactional
class OrderViewRepositoryTest {

    @Autowired
    private OrderViewRepository repository;

    @Test
    void returnsProjectedViews() {
        List<OrderSummaryView> views = repository.findByStatus("OPEN");
        assertThat(views).isNotEmpty();
    }
}
```

Verify:
- the repository returns view types, not entities
- pagination remains stable under realistic ordering
- coexistence with JPA repositories is explicit inside the service layer
- to-many subviews have a tested fetch strategy when row multiplication would be risky

## Startup Validation and Tooling

- Treat startup-time entity-view validation as a feature; incorrect mappings should fail early.
- Keep build-time tooling aligned with the Blaze version if the project uses generated metamodel or annotation-processing support.
- If a view becomes painful to validate or serialize, re-check whether the abstraction still belongs in Blaze.
