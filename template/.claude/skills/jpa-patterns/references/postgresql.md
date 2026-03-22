# PostgreSQL-Specific JPA Patterns

## JSONB with Hibernate 6 (Spring Boot 3.x)

No external library needed — Hibernate 6 supports JSONB natively:

```java
@Entity
@Table(name = "products")
public class Product {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // Hibernate 6 / Spring Boot 3.x: use @JdbcTypeCode(SqlTypes.JSON)
    // NOT @Type(JsonBinaryType.class) from Hypersistence Utils
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(columnDefinition = "jsonb")
    private ProductMetadata metadata;

    // getters/setters
}

public record ProductMetadata(String category, List<String> tags, Map<String, String> attributes) {}
```

**pom.xml:** No extra dependency — `spring-boot-starter-data-jpa` includes Hibernate 6.

## Querying JSONB

JPQL cannot express JSONB operators. Use native queries:

```java
public interface ProductRepository extends JpaRepository<Product, Long> {

    // Query by JSON field value
    @Query(value = "SELECT * FROM products WHERE metadata->>'category' = :category",
           nativeQuery = true)
    List<Product> findByMetadataCategory(@Param("category") String category);

    // JSON containment (@> operator)
    @Query(value = "SELECT * FROM products WHERE metadata @> CAST(:json AS jsonb)",
           nativeQuery = true)
    List<Product> findByMetadataContaining(@Param("json") String json);

    // Usage: findByMetadataContaining("{\"category\": \"electronics\"}")
}
```

## Upsert (INSERT ... ON CONFLICT)

```java
public interface OrderRepository extends JpaRepository<Order, Long> {

    @Modifying
    @Transactional
    @Query(value = """
        INSERT INTO orders (external_id, status, customer_id, created_at)
        VALUES (:externalId, :status, :customerId, NOW())
        ON CONFLICT (external_id)
        DO UPDATE SET status = EXCLUDED.status
        """, nativeQuery = true)
    void upsertByExternalId(
        @Param("externalId") String externalId,
        @Param("status") String status,
        @Param("customerId") Long customerId
    );
}
```

Use case: idempotent event processing — same event received twice produces consistent state.

## PostgreSQL Advisory Locks (Distributed Mutex)

For idempotent job scheduling without a separate Redis dependency:

```java
@Service
public class JobLockService {

    private final JdbcTemplate jdbcTemplate;

    public JobLockService(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    /**
     * Try to acquire advisory lock for the duration of the current transaction.
     * Lock is automatically released when transaction commits or rolls back.
     * @param lockKey stable long identifier for the job (e.g., hash of job name)
     * @return true if lock acquired, false if another node holds it
     */
    @Transactional
    public boolean tryExecuteWithLock(long lockKey, Runnable job) {
        Boolean acquired = jdbcTemplate.queryForObject(
            "SELECT pg_try_advisory_xact_lock(?)",
            Boolean.class,
            lockKey
        );
        if (Boolean.TRUE.equals(acquired)) {
            job.run();
            return true;
        }
        return false;
    }
}
```

## CREATE INDEX CONCURRENTLY in Flyway

Standard Flyway migrations run inside a transaction. `CREATE INDEX CONCURRENTLY` cannot run inside a transaction — it will fail.

**Solution:** Use a separate migration file that disables transactional execution:

```sql
-- V3__add_product_search_index.sql
-- Note: spring.flyway.executeInTransaction must be false for this migration
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_products_name_search
    ON products USING GIN (to_tsvector('english', name));
```

```yaml
# application.yml
spring:
  flyway:
    execute-in-transaction: false  # Required for CONCURRENTLY indexes
```

Or use `@NonTransactional` Flyway Java migration for more control.

## PostgreSQL Arrays with Hibernate 6

```java
@Entity
@Table(name = "articles")
public class Article {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // PostgreSQL text[] array
    @JdbcTypeCode(SqlTypes.ARRAY)
    @Column(columnDefinition = "text[]")
    private String[] tags;

    // Query: find articles with ANY matching tag
    // Use native query: WHERE :tag = ANY(tags)
}
```

```java
// Native query for array contains
@Query(value = "SELECT * FROM articles WHERE :tag = ANY(tags)", nativeQuery = true)
List<Article> findByTag(@Param("tag") String tag);
```

## Quick Reference

| Pattern | Hibernate 6 API | Notes |
|---------|----------------|-------|
| JSONB column | `@JdbcTypeCode(SqlTypes.JSON)` | No Hypersistence Utils needed |
| JSONB query | `@Query(nativeQuery=true)` + `->>`/`@>` | JPQL cannot use JSONB operators |
| Array column | `@JdbcTypeCode(SqlTypes.ARRAY)` | Use `ANY()` in native query |
| Upsert | `@Modifying @Query(nativeQuery=true)` + `ON CONFLICT` | Idempotent writes |
| Advisory lock | `pg_try_advisory_xact_lock()` via `JdbcTemplate` | No Redis needed for simple mutex |
| CONCURRENTLY index | Separate Flyway file + `execute-in-transaction: false` | Required — cannot run in transaction |
