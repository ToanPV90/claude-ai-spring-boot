# Testing

Use integration tests against a real database for jOOQ-heavy paths.

```java
// Spring-managed integration tests may use field injection for framework fixtures.
// Keep constructor injection as the default for production repositories and services.
@SpringBootTest
@Testcontainers
class OrderJooqRepositoryTest {

    @Container
    @ServiceConnection
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16-alpine");

    @Autowired
    private OrderJooqRepository repository;

    @Autowired
    private DSLContext dsl;

    @BeforeEach
    void setup() {
        dsl.deleteFrom(ORDERS).execute();
    }

    @Test
    void searchOrders_withStatusFilter_returnsMatching() {
        dsl.insertInto(ORDERS)
            .set(ORDERS.CUSTOMER_ID, 1L)
            .set(ORDERS.TOTAL, BigDecimal.TEN)
            .set(ORDERS.STATUS, "PENDING")
            .execute();

        var criteria = new OrderSearchCriteria("PENDING", null, null, null);
        var results = repository.searchOrders(criteria, Pageable.unpaged());

        assertThat(results.getContent()).hasSize(1);
        assertThat(results.getContent().get(0).status()).isEqualTo("PENDING");
    }
}
```

## Test Defaults

- Verify SQL-heavy behavior through observable results, not just repository method invocation.
- Seed only the columns relevant to the query shape under test.
- Cover pagination, sorting, grouping, and filter combinations with realistic fixtures.
- When JPA and jOOQ share a transaction, test the full boundary at the service layer.

## Route Elsewhere

- For the red-green-refactor workflow itself, use `tdd-guide`.
- For JPA-specific repository tests, use `jpa-master` or `tdd-guide` as appropriate.
