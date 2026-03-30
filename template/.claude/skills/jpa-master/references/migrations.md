# JPA + Liquibase Coexistence

## The Golden Rule

**Liquibase owns the schema. Hibernate validates it.**

```yaml
# application.yml — all profiles, including production
spring:
  jpa:
    hibernate:
      ddl-auto: validate    # Hibernate NEVER creates/alters tables

  liquibase:
    change-log: classpath:db/changelog/db.changelog-master.yaml
    enabled: true
```

Never use `ddl-auto: create`, `create-drop`, or `update` with Liquibase active. These will conflict with or override Liquibase changes.

## Entity-to-Migration Alignment

Every JPA entity annotation must match the Liquibase migration exactly.

### UUID Primary Key

Entity:
```java
@Entity
@Table(name = "orders")
public class Order {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", nullable = false)
    private UUID id;
}
```

Migration:
```yaml
- column:
    name: id
    type: uuid
    constraints:
      primaryKey: true
      nullable: false
```

### String column with length

Entity:
```java
@Column(name = "status", nullable = false, length = 20)
private String status;
```

Migration:
```yaml
- column:
    name: status
    type: varchar(20)
    constraints:
      nullable: false
```

### BigDecimal for money

Entity:
```java
@Column(name = "total_amount", nullable = false, precision = 19, scale = 4)
private BigDecimal totalAmount;
```

Migration:
```yaml
- column:
    name: total_amount
    type: decimal(19, 4)
    constraints:
      nullable: false
```

### Instant (timestamp with timezone)

Entity:
```java
@Column(name = "created_at", nullable = false, updatable = false)
private Instant createdAt;
```

Migration:
```yaml
- column:
    name: created_at
    type: timestamp with time zone
    defaultValueComputed: CURRENT_TIMESTAMP
    constraints:
      nullable: false
```

### Enum stored as string

Entity:
```java
@Enumerated(EnumType.STRING)
@Column(name = "status", nullable = false, length = 20)
private OrderStatus status;
```

Migration:
```yaml
- column:
    name: status
    type: varchar(20)
    constraints:
      nullable: false
```

Never use `EnumType.ORDINAL` — adding enum values changes ordinals and corrupts existing data.

### Foreign key

Entity:
```java
@ManyToOne(fetch = FetchType.LAZY)
@JoinColumn(name = "customer_id", nullable = false)
private Customer customer;
```

Migration:
```yaml
- column:
    name: customer_id
    type: uuid
    constraints:
      nullable: false
      foreignKeyName: fk_orders_customer
      references: customers(id)
```

## The Workflow: Entity First or Migration First?

**Recommendation: Entity first, migration second**

1. Write the JPA entity with correct annotations
2. Run the app with `ddl-auto=create-drop` temporarily in dev (NOT production) to see what schema Hibernate would generate
3. Write the Liquibase migration to create that schema
4. Switch back to `ddl-auto=validate`
5. Run the app — if no `SchemaManagementException`, entity and migration are aligned

Alternative: Use `./mvnw liquibase:generateChangeLog` to generate a migration from an existing schema.

## Common Validation Errors and Fixes

| Error | Cause | Fix |
|-------|-------|-----|
| `Schema-validation: missing table [orders]` | Migration hasn't run or Liquibase is disabled | Run migration; check `spring.liquibase.enabled=true` |
| `Schema-validation: wrong column type for [status]` | Entity uses `varchar(255)`, migration uses `varchar(20)` | Align lengths |
| `Schema-validation: missing column [updated_at]` | Entity has `updatedAt` field, migration doesn't | Add column in new migration |
| `Schema-validation: wrong column type for [id]` | Entity uses `UUID` but migration has `varchar(36)` | Change migration to `uuid` type |

## Adding a Field to an Existing Entity

1. Add the field to the entity:
```java
@Column(name = "phone", length = 20)
private String phone;
```

2. Add a migration:
```yaml
- changeSet:
    id: "2024-02-01-add-users-phone"
    author: dev
    changes:
      - addColumn:
          tableName: users
          columns:
            - column:
                name: phone
                type: varchar(20)
    rollback:
      - dropColumn:
          tableName: users
          columnName: phone
```

3. Run `./mvnw spring-boot:run` — `ddl-auto=validate` confirms alignment.

## Removing a Field from an Entity

Safe removal order (prevents downtime):
1. Remove the field from the entity class
2. Deploy the application (no migration yet — column still exists but JPA ignores it)
3. Confirm no queries reference the column
4. Add a migration to drop the column in a follow-up deployment

## Gotchas

- `ddl-auto=validate` fails at startup if the entity and migration schema don't match — this is good. Fix the migration, not the entity.
- Adding `@Column(nullable = false)` to an existing field without a migration will cause validation failure if the column was previously nullable.
- `@Column(length = 255)` is Hibernate's default. If the migration uses `varchar(50)`, the validation will fail. Always specify `length` explicitly in `@Column` when the migration differs.
- `@GeneratedValue(strategy = IDENTITY)` requires a `SERIAL` or `BIGSERIAL` column in PostgreSQL. `GenerationType.UUID` requires a `uuid` column with no DB-side default — Hibernate generates the UUID in Java.
- `@Transient` fields are not validated against the database schema — use them safely for computed fields.
