---
name: liquibase-master
description: Implementation guidance for Liquibase database migrations in Spring Boot applications, including changelog design, rollback strategies, and safe schema evolution. Use when designing migration changelogs, configuring Liquibase with Spring Boot, writing rollback procedures, or testing migrations with TestContainers.
license: MIT
metadata:
  author: local
  version: "1.0.0"
  domain: backend
  triggers:
    - Liquibase
    - database migration
    - changelog
    - changeSet
    - db.changelog
    - schema migration
    - rollback migration
    - liquibase rollback
    - spring.liquibase
    - ddl-auto validate
    - schema evolution
    - database versioning
    - LiquibaseException
  role: specialist
  scope: implementation
  output-format: code + guidance
  related-skills: jpa-master, postgres-master, spring-boot-engineer, tdd-guide
---

# Liquibase Master

Implementation guide for versioned database migrations in Spring Boot using Liquibase, keeping schema changes safe, reversible, and test-covered.

## When to Use
- You are adding, modifying, or removing database tables, columns, indexes, or constraints
- A Spring Boot service needs Liquibase configured from scratch or reconfigured
- You need to write or review rollback procedures for a migration
- You are migrating an existing database that already has data
- You need migration-focused tests using TestContainers

## When Not to Use
- The task is JPA entity design or fetch strategy — use `jpa-master`
- The task is PostgreSQL-specific indexing or JSONB schema design without migrations — use `postgres-master`
- The task is general Spring Boot application structure — use `spring-boot-master`

## Version Assumptions
- Spring Boot 3.x with `spring-boot-starter-data-jpa`
- Liquibase 4.x (included transitively via `liquibase-core`)
- `spring.jpa.hibernate.ddl-auto=validate` — Liquibase owns schema, not Hibernate

## Reference Guide

| Topic | Reference | Load When |
|------|-----------|-----------|
| Changelog structure, changeset rules, SQL vs XML format | `references/changelog-design.md` | Writing or reviewing changesets |
| Spring Boot auto-configuration, multi-module setup | `references/spring-integration.md` | Wiring Liquibase into a new or existing Spring Boot app |
| TestContainers migration tests, rollback verification | `references/testing.md` | Testing migrations in CI or verifying rollback safety |

## Symptom Triage

| Symptom | Default Check | Likely Fix |
|--------|---------------|------------|
| `LiquibaseException: Validation failed` | Is `ddl-auto=validate` mismatched with entity? | Ensure migration and entity agree on column types/names |
| Startup hangs on migration | Does changeSet hold a lock from a previous failed run? | Run `liquibase releaseLocks` or clear `DATABASECHANGELOGLOCK` |
| Missing table after migration | Was the changelog included in the master changelog? | Verify `include`/`includeAll` path in root changelog |
| Rollback fails | Did the changeSet have a `<rollback>` block? | Always write explicit rollback for non-reversible changes |
| Dev/prod schema drift | Are developers running Hibernate DDL on dev? | Set `ddl-auto=validate` in all profiles; Liquibase handles all DDL |
| Column rename applied but data lost | Was `renameColumn` used? | Use `addColumn` + data migration + `dropColumn` for safe rename |

## Migration Decision Ladder

1. **New table?** `CREATE TABLE` SQL changeset. Rollback: `DROP TABLE`.
2. **Add nullable column?** `ALTER TABLE ... ADD COLUMN` — rollback: `DROP COLUMN`.
3. **Add NOT NULL column?** Add nullable → `UPDATE` default → `ALTER COLUMN SET NOT NULL`. Three changesets.
4. **Rename column?** Never rename in-place on live data. Add column + copy + drop. Three changesets.
5. **Index on large table?** `CREATE INDEX CONCURRENTLY` with `runInTransaction:false dbms:postgresql`.
6. **Need rollback?** Write `--rollback <sql>;` for every destructive or non-reversible change.

## Quick Mapping

| Situation | Default Move | Prefer Instead Of |
|-----------|--------------|-------------------|
| Any schema change | Liquibase changeset | `ddl-auto=update` in production |
| Adding NOT NULL column | Three-step migration | Single `addColumn NOT NULL` |
| Large table index | `CREATE INDEX CONCURRENTLY` in raw SQL | `createIndex` tag (holds lock) |
| Data backfill | Separate `update` changeset | Inside the same structural changeset |
| Renaming a column | Add + copy + drop | `renameColumn` (risky on live data) |

## Constraints

### MUST DO

| Rule | Preferred Pattern |
|------|-------------------|
| Set `ddl-auto=validate` in all profiles | `spring.jpa.hibernate.ddl-auto=validate` |
| Use SQL format for all changesets | `--liquibase formatted sql` header in `.sql` files |
| Give every changeSet a unique `id` and `author` | `--changeset dev:2024-01-15-add-user-email` |
| Write rollback for destructive changes | `--rollback ALTER TABLE ... DROP COLUMN ...;` |
| Keep changesets small and focused | One logical change per changeset |
| Use `context` label to separate env-specific data | `--changeset dev:id context:dev,test` |
| Root changelog lists SQL files explicitly | `db/changelog/db.changelog-master.yaml` with `include` entries |

### MUST NOT DO
- Do not modify a changeset that has already been applied to any environment
- Do not use `ddl-auto=create` or `ddl-auto=update` with Liquibase active
- Do not put large data migrations and schema changes in the same changeset
- Do not run `CREATE INDEX` (blocking) on a large production table — use `CONCURRENTLY`
- Do not rely on Liquibase auto-rollback for SQL changesets — write it explicitly

## Gotchas

- Liquibase computes a checksum for each applied changeset. Editing an applied changeset causes startup failure with `Validation Failed`.
- `spring.liquibase.enabled=false` silently skips all migrations — guard this in integration tests.
- TestContainers uses a fresh database each time, so test a real rollback by running migrations, then rollback commands, then re-running migrations.
- When running multiple Spring Boot modules against the same database, use separate `defaultSchema` or `liquibaseSchema` per module to avoid changelog table conflicts.
- `DATABASECHANGELOGLOCK` left locked after a failed migration causes the next startup to hang. Always release locks before retrying.

## Minimal Examples

### Spring Boot application.yml
```yaml
spring:
  jpa:
    hibernate:
      ddl-auto: validate
  liquibase:
    change-log: classpath:db/changelog/db.changelog-master.yaml
    enabled: true
```

### Root changelog (YAML — lists SQL files)
```yaml
databaseChangeLog:
  - include:
      file: db/changelog/changes/V001__create_users_table.sql
  - include:
      file: db/changelog/changes/V002__add_users_email_index.sql
```

### Safe NOT NULL column (three SQL changesets)
```sql
--liquibase formatted sql

--changeset dev:2024-01-15-add-status-nullable
ALTER TABLE orders ADD COLUMN status VARCHAR(20);
--rollback ALTER TABLE orders DROP COLUMN status;

--changeset dev:2024-01-15-backfill-status
UPDATE orders SET status = 'PENDING' WHERE status IS NULL;
--rollback UPDATE orders SET status = NULL WHERE status = 'PENDING';

--changeset dev:2024-01-15-add-status-not-null
ALTER TABLE orders ALTER COLUMN status SET NOT NULL;
--rollback ALTER TABLE orders ALTER COLUMN status DROP NOT NULL;
```

### Non-blocking index (PostgreSQL)
```sql
--liquibase formatted sql

--changeset dev:2024-01-16-idx-orders-customer-id runInTransaction:false dbms:postgresql
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orders_customer_id ON orders(customer_id);
--rollback DROP INDEX CONCURRENTLY IF EXISTS idx_orders_customer_id;
```

## What to Verify
- `./mvnw spring-boot:run` starts cleanly with no Liquibase validation errors
- Every changeset that alters or drops data has an explicit `rollback` block
- Integration tests use `@SpringBootTest` + TestContainers with `spring.liquibase.enabled=true`
- Running all migrations against a fresh database produces the same schema as production

## See References
- `references/changelog-design.md` for changeset rules, formats, rollback patterns, and data migrations
- `references/spring-integration.md` for Spring Boot configuration, multi-module setup, and profile-aware changelogs
- `references/testing.md` for TestContainers migration tests and rollback verification
