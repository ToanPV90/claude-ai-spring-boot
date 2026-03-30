# Testing JPA Behavior

## Use `@DataJpaTest` First

`@DataJpaTest` is the default slice for repository and mapping behavior. It loads JPA components, configures transactions for each test, and keeps the test focused on persistence.

Spring-managed persistence tests may use field injection for fixtures such as repositories and `TestEntityManager`.

```java
@DataJpaTest
class OrderRepositoryTest {

    @Autowired
    private TestEntityManager entityManager;

    @Autowired
    private OrderRepository orderRepository;

    @Test
    void findByStatus_returnsPersistedOrders() {
        Order order = new Order();
        order.setStatus(OrderStatus.PENDING);
        entityManager.persistAndFlush(order);

        List<Order> orders = orderRepository.findByStatus(OrderStatus.PENDING, Pageable.unpaged()).getContent();

        assertThat(orders).hasSize(1);
    }
}
```

## Use TestContainers for Real Database Behavior

Use PostgreSQL TestContainers when the behavior depends on the real database, query plans, JSONB, locking, or dialect-specific behavior.

```java
@DataJpaTest
@Testcontainers
class OrderRepositoryPostgresTest {

    @Container
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16-alpine");

    @DynamicPropertySource
    static void databaseProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", postgres::getJdbcUrl);
        registry.add("spring.datasource.username", postgres::getUsername);
        registry.add("spring.datasource.password", postgres::getPassword);
    }
}
```

## Test What Broke

When fixing a JPA bug, make the test name describe the persistence behavior:
- `findSummaryById_fetchesWithoutNPlusOne`
- `getOrderDetails_doesNotTriggerLazyInitializationException`
- `updateOrder_throwsOptimisticLockException_onConcurrentWrite`
- `deleteAuthor_removesOrphanedBooks_only`

## Verifying N+1 Fixes

Options:
- enable SQL logging and inspect the query sequence
- use Hibernate statistics in an integration test if your setup allows it
- keep the assertion tied to behavior, not just implementation details

```yaml
logging:
  level:
    org.hibernate.SQL: DEBUG
    org.hibernate.orm.jdbc.bind: TRACE
```

## Testing Specifications

For specification-based repositories, seed a few combinations of data and assert only the matching rows are returned.

```java
@Test
void findAll_withStatusAndCustomerName_filtersCorrectly() {
    Specification<Order> spec = Specification
        .where(OrderSpecifications.hasStatus(OrderStatus.PENDING))
        .and(OrderSpecifications.customerNameContains("acme"));

    Page<Order> results = orderRepository.findAll(spec, PageRequest.of(0, 10));

    assertThat(results.getContent()).allMatch(order -> order.getStatus() == OrderStatus.PENDING);
}
```

## Testing Optimistic Locking

Use separate transactions or entity managers so you do not accidentally reuse the same managed instance.

```java
@Test
void concurrentUpdates_triggerOptimisticLocking() {
    Order first = transactionTemplate.execute(status -> orderRepository.findById(orderId).orElseThrow());
    Order second = transactionTemplate.execute(status -> orderRepository.findById(orderId).orElseThrow());

    transactionTemplate.executeWithoutResult(status -> {
        first.setStatus(OrderStatus.APPROVED);
        orderRepository.saveAndFlush(first);
    });

    assertThatThrownBy(() -> transactionTemplate.executeWithoutResult(status -> {
        second.setStatus(OrderStatus.CANCELLED);
        orderRepository.saveAndFlush(second);
    })).isInstanceOf(ObjectOptimisticLockingFailureException.class);
}
```

## Verification Checklist

- confirm mapping changes persist and load correctly
- confirm relationship helpers keep both sides in sync
- confirm projections return only the needed shape
- confirm lazy-loading fixes work outside the original transaction boundary
- confirm SQL-heavy fixes against the real database when behavior is dialect-specific
