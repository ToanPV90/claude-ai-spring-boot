# Liquibase Spring Boot Integration

## Maven Dependency

```xml
<!-- Included transitively with spring-boot-starter-data-jpa -->
<!-- Add explicitly to control version -->
<dependency>
    <groupId>org.liquibase</groupId>
    <artifactId>liquibase-core</artifactId>
</dependency>
```

## application.yml Configuration

```yaml
spring:
  jpa:
    hibernate:
      ddl-auto: validate          # Liquibase owns DDL; Hibernate only validates

  liquibase:
    change-log: classpath:db/changelog/db.changelog-master.yaml   # YAML master that includes SQL files
    enabled: true
    default-schema: public        # PostgreSQL schema
    contexts: ${LIQUIBASE_CONTEXTS:}   # empty = all contexts run
```

### Per-profile configuration

```yaml
# application-dev.yml
spring:
  liquibase:
    contexts: dev,test            # run seed data in dev

# application-test.yml
spring:
  liquibase:
    contexts: test

# application-prod.yml
spring:
  liquibase:
    contexts: prod
  jpa:
    hibernate:
      ddl-auto: validate
```

### Disable for unit tests (slice tests that don't need DB)

```yaml
# application-test.yml
spring:
  liquibase:
    enabled: false   # for @WebMvcTest, @DataJpaTest with H2
```

Or per-test class:
```java
@SpringBootTest
@TestPropertySource(properties = "spring.liquibase.enabled=false")
class SomeSliceTest { ... }
```

## Multi-Module Setup

When multiple Spring Boot modules share one database, separate the changelog tables:

```yaml
# module-a/src/main/resources/application.yml
spring:
  liquibase:
    change-log: classpath:db/changelog/module-a-master.yaml
    liquibase-schema: liquibase_module_a    # separate schema for DATABASECHANGELOG tables
    default-schema: public

# module-b/src/main/resources/application.yml
spring:
  liquibase:
    change-log: classpath:db/changelog/module-b-master.yaml
    liquibase-schema: liquibase_module_b
    default-schema: public
```

Create the separate schemas first:
```sql
CREATE SCHEMA IF NOT EXISTS liquibase_module_a;
CREATE SCHEMA IF NOT EXISTS liquibase_module_b;
```

## Running Migrations Manually

```bash
# Apply pending migrations
./mvnw liquibase:update

# Preview SQL (dry-run)
./mvnw liquibase:updateSQL

# Rollback N changesets
./mvnw liquibase:rollback -Dliquibase.rollbackCount=1

# Rollback to date
./mvnw liquibase:rollbackToDate -Dliquibase.rollbackDate="2024-01-01"

# Status — show pending changesets
./mvnw liquibase:status

# Validate checksums
./mvnw liquibase:validate

# Release a stuck lock
./mvnw liquibase:releaseLocks
```

## Maven Plugin Configuration

```xml
<plugin>
    <groupId>org.liquibase</groupId>
    <artifactId>liquibase-maven-plugin</artifactId>
    <configuration>
        <changeLogFile>src/main/resources/db/changelog/db.changelog-master.yaml</changeLogFile>
        <url>${DB_URL}</url>
        <username>${DB_USERNAME}</username>
        <password>${DB_PASSWORD}</password>
        <driver>org.postgresql.Driver</driver>
    </configuration>
</plugin>
```

## CI/CD Integration

Run `./mvnw liquibase:validate` in CI to catch checksum drift before deployment:

```yaml
# .github/workflows/ci.yml
- name: Validate Liquibase changelogs
  run: ./mvnw liquibase:validate -Dspring.datasource.url=${{ secrets.DB_URL }}
```

## Gotchas

- `spring.jpa.hibernate.ddl-auto=validate` will fail on startup if Liquibase hasn't run yet — always ensure Liquibase runs before the JPA context initializes (it does by default with `LiquibaseAutoConfiguration`).
- Setting `spring.liquibase.enabled=false` globally in tests will hide migration regressions. Only disable for non-DB slice tests.
- `@DataJpaTest` uses H2 in-memory by default. Liquibase SQL with PostgreSQL-specific syntax will fail. Either use `@AutoConfigureTestDatabase(replace = NONE)` with TestContainers, or separate SQL changesets by `dbms: postgresql`.
- The `contexts` property is empty by default which runs ALL changesets regardless of context. Pass a value explicitly in production to exclude dev/test seed data.
