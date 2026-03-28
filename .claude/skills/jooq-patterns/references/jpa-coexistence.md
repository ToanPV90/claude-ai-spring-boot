# JPA Coexistence

## Use Both Deliberately

JPA and jOOQ can live in the same application when they serve different access patterns.

```java
public interface OrderRepository extends JpaRepository<Order, Long> {
    Optional<Order> findByIdAndStatus(Long id, OrderStatus status);
}

@Repository
public class OrderReportRepository {

    private final DSLContext dsl;

    public OrderReportRepository(DSLContext dsl) {
        this.dsl = dsl;
    }

    public List<OrderReport> generateMonthlyReport(YearMonth month) {
        // reporting query with window functions, CTEs, or database-specific expressions
    }
}
```

## Shared Transactions

```java
@Service
public class OrderService {

    private final OrderRepository orderRepository;
    private final OrderReportRepository reportRepository;

    public OrderService(OrderRepository orderRepository, OrderReportRepository reportRepository) {
        this.orderRepository = orderRepository;
        this.reportRepository = reportRepository;
    }

    @Transactional
    public void processAndReport(Long orderId) {
        Order order = orderRepository.findById(orderId).orElseThrow();
        order.complete();

        reportRepository.generateMonthlyReport(YearMonth.now());
    }
}
```

## Ownership Rules

- JPA owns aggregates, cascades, and entity lifecycle.
- jOOQ owns SQL-heavy reads, reporting, and bulk operations.
- The service layer owns the transaction boundary when both participate.
- Shared `DataSource` and Spring transaction management are the default; avoid custom dual-transaction machinery.

## Route Elsewhere

- If the problem is fetch behavior, lazy loading, entity graphs, or aggregate write semantics, go to `jpa-patterns`.
- If the bigger decision is whether a service should stay monolithic or split, go to `java-architect`.
