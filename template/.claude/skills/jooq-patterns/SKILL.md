---
name: jooq-patterns
description: jOOQ type-safe SQL patterns for Spring Boot. Use when user needs complex queries beyond JPA, reporting, dynamic SQL, or database-first approach. Invoke for "jOOQ", "type-safe SQL", "complex query", "reporting query", or when JPA is insufficient.
license: MIT
metadata:
  author: local
  version: "1.0.0"
  domain: backend
  triggers: jOOQ, type-safe SQL, complex query, reporting query, CTE, window function, dynamic SQL, database-first
  role: specialist
  scope: implementation
  output-format: code + guidance
  related-skills: jpa-patterns, spring-boot-patterns, java-architect
---

# jOOQ Patterns Skill

Type-safe SQL with jOOQ in Spring Boot applications.

## When to Use
- Complex queries that are awkward in JPQL/Criteria API
- Reporting and analytics queries (GROUP BY, window functions, CTEs)
- Database-first development approach
- Need for type-safe, compile-time checked SQL
- Dynamic query construction with type safety
- When JPA N+1 or lazy loading becomes unmanageable

## When to Stay with JPA
- Simple CRUD operations (Spring Data JPA is simpler)
- Standard entity relationships with lazy/eager fetching
- When the team is already proficient with JPA
- jOOQ and JPA can coexist — use each where it excels

---

## Quick Reference: JPA vs jOOQ

| Aspect | JPA/Hibernate | jOOQ |
|--------|--------------|------|
| Paradigm | Object-relational mapping | SQL-first, type-safe |
| Best for | CRUD, entity graphs | Complex queries, reporting |
| Schema | Code-first or DB-first | DB-first (code generation) |
| Type safety | Runtime errors | Compile-time errors |
| SQL control | Abstracted away | Full control |
| N+1 risk | High | None (explicit queries) |
| Learning curve | Medium (gotchas) | Low (if you know SQL) |

---

## Setup with Spring Boot

### Maven Dependencies

```xml
<!-- jOOQ with Spring Boot Starter -->
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-jooq</artifactId>
</dependency>

<!-- jOOQ code generator (build-time only) -->
<plugin>
    <groupId>org.jooq</groupId>
    <artifactId>jooq-codegen-maven</artifactId>
    <executions>
        <execution>
            <goals><goal>generate</goal></goals>
        </execution>
    </executions>
    <configuration>
        <jdbc>
            <driver>org.postgresql.Driver</driver>
            <url>jdbc:postgresql://localhost:5432/mydb</url>
            <user>${db.user}</user>
            <password>${db.password}</password>
        </jdbc>
        <generator>
            <database>
                <inputSchema>public</inputSchema>
            </database>
            <generate>
                <records>true</records>
                <pojos>true</pojos>
                <daos>false</daos>
            </generate>
            <target>
                <packageName>vn.lukepham.projects.generated.jooq</packageName>
                <directory>target/generated-sources/jooq</directory>
            </target>
        </generator>
    </configuration>
</plugin>
```

### Application Configuration

```yaml
# application.yml — Spring Boot auto-configures jOOQ DSLContext
spring:
  datasource:
    url: jdbc:postgresql://localhost:5432/mydb
    username: ${DB_USER}
    password: ${DB_PASSWORD}
  jooq:
    sql-dialect: POSTGRES
```

---

## Basic CRUD

```java
import static vn.lukepham.projects.generated.jooq.Tables.*;
import static org.jooq.impl.DSL.*;

@Repository
public class OrderJooqRepository {

    private final DSLContext dsl;

    public OrderJooqRepository(DSLContext dsl) {
        this.dsl = dsl;
    }

    // SELECT
    public Optional<OrderRecord> findById(Long id) {
        return dsl.selectFrom(ORDERS)
            .where(ORDERS.ID.eq(id))
            .fetchOptional();
    }

    // SELECT with join
    public List<OrderWithCustomer> findOrdersWithCustomer(OrderStatus status) {
        return dsl.select(
                ORDERS.ID,
                ORDERS.TOTAL,
                ORDERS.STATUS,
                ORDERS.CREATED_AT,
                CUSTOMERS.NAME.as("customerName"),
                CUSTOMERS.EMAIL.as("customerEmail"))
            .from(ORDERS)
            .join(CUSTOMERS).on(ORDERS.CUSTOMER_ID.eq(CUSTOMERS.ID))
            .where(ORDERS.STATUS.eq(status.name()))
            .orderBy(ORDERS.CREATED_AT.desc())
            .fetchInto(OrderWithCustomer.class);
    }

    // INSERT
    public Long create(CreateOrderRequest request) {
        return dsl.insertInto(ORDERS)
            .set(ORDERS.CUSTOMER_ID, request.customerId())
            .set(ORDERS.TOTAL, request.total())
            .set(ORDERS.STATUS, "PENDING")
            .set(ORDERS.CREATED_AT, LocalDateTime.now())
            .returning(ORDERS.ID)
            .fetchOne()
            .getId();
    }

    // UPDATE
    public int updateStatus(Long id, String status) {
        return dsl.update(ORDERS)
            .set(ORDERS.STATUS, status)
            .set(ORDERS.UPDATED_AT, LocalDateTime.now())
            .where(ORDERS.ID.eq(id))
            .execute();
    }

    // DELETE
    public int delete(Long id) {
        return dsl.deleteFrom(ORDERS)
            .where(ORDERS.ID.eq(id))
            .execute();
    }
}
```

---

## Dynamic Queries (Type-Safe)

```java
// ✅ jOOQ shines here — JPA Criteria API is verbose and error-prone

public Page<OrderSummary> searchOrders(OrderSearchCriteria criteria, Pageable pageable) {
    // Build WHERE clause dynamically
    List<Condition> conditions = new ArrayList<>();

    if (criteria.status() != null) {
        conditions.add(ORDERS.STATUS.eq(criteria.status()));
    }
    if (criteria.minTotal() != null) {
        conditions.add(ORDERS.TOTAL.ge(criteria.minTotal()));
    }
    if (criteria.customerName() != null) {
        conditions.add(CUSTOMERS.NAME.containsIgnoreCase(criteria.customerName()));
    }
    if (criteria.fromDate() != null) {
        conditions.add(ORDERS.CREATED_AT.ge(criteria.fromDate()));
    }

    Condition whereClause = DSL.and(conditions);

    // Count query
    int total = dsl.selectCount()
        .from(ORDERS)
        .join(CUSTOMERS).on(ORDERS.CUSTOMER_ID.eq(CUSTOMERS.ID))
        .where(whereClause)
        .fetchOne(0, int.class);

    // Data query with pagination
    List<OrderSummary> results = dsl.select(
            ORDERS.ID,
            ORDERS.STATUS,
            ORDERS.TOTAL,
            CUSTOMERS.NAME)
        .from(ORDERS)
        .join(CUSTOMERS).on(ORDERS.CUSTOMER_ID.eq(CUSTOMERS.ID))
        .where(whereClause)
        .orderBy(getSortFields(pageable.getSort()))
        .limit(pageable.getPageSize())
        .offset(pageable.getOffset())
        .fetchInto(OrderSummary.class);

    return new PageImpl<>(results, pageable, total);
}

// Type-safe sort mapping
private List<SortField<?>> getSortFields(Sort sort) {
    return sort.stream()
        .map(order -> {
            Field<?> field = switch (order.getProperty()) {
                case "total" -> ORDERS.TOTAL;
                case "createdAt" -> ORDERS.CREATED_AT;
                case "customerName" -> CUSTOMERS.NAME;
                default -> ORDERS.ID;
            };
            return order.isAscending() ? field.asc() : field.desc();
        })
        .toList();
}
```

---

## Reporting & Analytics

### Aggregations

```java
// Revenue by status
public List<StatusRevenue> revenueByStatus() {
    return dsl.select(
            ORDERS.STATUS,
            count().as("orderCount"),
            sum(ORDERS.TOTAL).as("totalRevenue"),
            avg(ORDERS.TOTAL).as("avgOrderValue"))
        .from(ORDERS)
        .groupBy(ORDERS.STATUS)
        .orderBy(sum(ORDERS.TOTAL).desc())
        .fetchInto(StatusRevenue.class);
}

public record StatusRevenue(String status, int orderCount, BigDecimal totalRevenue, BigDecimal avgOrderValue) {}
```

### Window Functions

```java
// Rank customers by order value
public List<CustomerRanking> rankCustomers() {
    return dsl.select(
            CUSTOMERS.NAME,
            sum(ORDERS.TOTAL).as("totalSpent"),
            rank().over(orderBy(sum(ORDERS.TOTAL).desc())).as("rank"),
            rowNumber().over(orderBy(sum(ORDERS.TOTAL).desc())).as("rowNum"))
        .from(CUSTOMERS)
        .join(ORDERS).on(ORDERS.CUSTOMER_ID.eq(CUSTOMERS.ID))
        .groupBy(CUSTOMERS.ID, CUSTOMERS.NAME)
        .fetchInto(CustomerRanking.class);
}
```

### Common Table Expressions (CTEs)

```java
// Monthly revenue trend with month-over-month growth
public List<MonthlyTrend> monthlyRevenueTrend() {
    var monthly = name("monthly").fields("month", "revenue").as(
        select(
            trunc(ORDERS.CREATED_AT, DatePart.MONTH).as("month"),
            sum(ORDERS.TOTAL).as("revenue"))
        .from(ORDERS)
        .where(ORDERS.STATUS.eq("COMPLETED"))
        .groupBy(trunc(ORDERS.CREATED_AT, DatePart.MONTH))
    );

    return dsl.with(monthly)
        .select(
            monthly.field("month"),
            monthly.field("revenue"),
            lag(monthly.field("revenue", BigDecimal.class))
                .over(orderBy(monthly.field("month"))).as("prevMonth"))
        .from(monthly)
        .orderBy(monthly.field("month"))
        .fetchInto(MonthlyTrend.class);
}
```

---

## Batch Operations

```java
// Batch insert (much faster than JPA for bulk data)
public void batchInsert(List<CreateOrderRequest> orders) {
    var batch = dsl.batch(
        dsl.insertInto(ORDERS, ORDERS.CUSTOMER_ID, ORDERS.TOTAL, ORDERS.STATUS)
           .values((Long) null, (BigDecimal) null, (String) null)
    );

    for (var order : orders) {
        batch.bind(order.customerId(), order.total(), "PENDING");
    }

    batch.execute();
}

// Bulk update
public int archiveOldOrders(LocalDateTime before) {
    return dsl.update(ORDERS)
        .set(ORDERS.STATUS, "ARCHIVED")
        .set(ORDERS.UPDATED_AT, LocalDateTime.now())
        .where(ORDERS.STATUS.eq("COMPLETED"))
        .and(ORDERS.CREATED_AT.lt(before))
        .execute();
}
```

---

## Coexisting with JPA

```java
// ✅ Use both in the same application
// JPA for simple CRUD:
public interface OrderRepository extends JpaRepository<Order, Long> {
    Optional<Order> findByIdAndStatus(Long id, OrderStatus status);
}

// jOOQ for complex queries:
@Repository
public class OrderReportRepository {
    private final DSLContext dsl;

    public OrderReportRepository(DSLContext dsl) {
        this.dsl = dsl;
    }

    public List<OrderReport> generateMonthlyReport(YearMonth month) {
        // Complex reporting query with window functions, CTEs, etc.
    }
}

// Both use the same DataSource — Spring Boot auto-configures this
```

### Transaction Sharing

```java
// JPA and jOOQ share the same transaction
@Service
public class OrderService {

    private final OrderRepository jpaRepo;        // JPA
    private final OrderReportRepository jooqRepo;  // jOOQ

    public OrderService(OrderRepository jpaRepo, OrderReportRepository jooqRepo) {
        this.jpaRepo = jpaRepo;
        this.jooqRepo = jooqRepo;
    }

    @Transactional
    public void processAndReport(Long orderId) {
        Order order = jpaRepo.findById(orderId).orElseThrow();  // JPA
        order.setStatus(OrderStatus.COMPLETED);
        jpaRepo.save(order);                                      // JPA

        var report = jooqRepo.generateMonthlyReport(YearMonth.now());  // jOOQ
        // Both in same transaction
    }
}
```

---

## Testing jOOQ

```java
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
        // Insert test data via jOOQ
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

---

## Common Patterns

| Pattern | jOOQ Approach |
|---------|--------------|
| Dynamic filtering | Build `List<Condition>`, combine with `DSL.and()` |
| Pagination | `.limit(size).offset(offset)` + separate count query |
| Sorting | Map property names to `Field<?>`, use `.asc()` / `.desc()` |
| Projections | `fetchInto(MyRecord.class)` with Java records |
| Batch operations | `dsl.batch(...)` for bulk insert/update |
| Transactions | Same `@Transactional` as JPA (shared DataSource) |
| Code generation | `jooq-codegen-maven` from live DB or Flyway migrations |

## Anti-Patterns to Avoid

| Anti-Pattern | Problem | Better Approach |
|-------------|---------|-----------------|
| String SQL in jOOQ | Loses type safety | Use generated table/field references |
| Skipping code generation | No compile-time checks | Always generate from DB schema |
| Fetching entire rows | Wastes bandwidth | Select only needed columns |
| Ignoring fetchInto records | Manual mapping | Use Java records with `fetchInto()` |

---

## Related Skills

- `jpa-patterns` — When JPA is the better tool
- `spring-boot-patterns` — Service/repository layer patterns
- `java-architect` — When to choose jOOQ vs JPA
