# Liquibase Changelog Design

## Format: SQL

Use **SQL** for all changesets. SQL migrations are explicit, readable, and give full DDL control (including PostgreSQL-specific syntax like `CONCURRENTLY`, `ON CONFLICT`, etc.).

```
db/
  changelog/
    db.changelog-master.yaml     # root: only include entries (YAML is fine for the master list)
    changes/
      V001__create_users_table.sql
      V002__add_orders_table.sql
      V003__add_users_email_index.sql
```

### Root master changelog (YAML — only for listing files)
```yaml
databaseChangeLog:
  - include:
      file: db/changelog/changes/V001__create_users_table.sql
  - include:
      file: db/changelog/changes/V002__add_orders_table.sql
  - include:
      file: db/changelog/changes/V003__add_users_email_index.sql
```

Avoid `includeAll` — explicit ordering prevents surprises when files are added out of sequence.

## SQL File Structure

Every SQL file starts with the Liquibase formatted-SQL header, then one or more changesets:

```sql
--liquibase formatted sql

--changeset dev:2024-01-15-create-users-table labels:schema
CREATE TABLE users (
    id          UUID                     PRIMARY KEY NOT NULL,
    name        VARCHAR(255)             NOT NULL,
    email       VARCHAR(255)             NOT NULL UNIQUE,
    created_at  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

--rollback DROP TABLE users;
```

- First line: `--liquibase formatted sql` (required)
- Changeset header: `--changeset <author>:<id>`
- Rollback line: `--rollback <SQL>;`

## ChangeSet ID Conventions

```sql
--changeset dev:2024-01-15-create-users-table
```

- Format: `YYYY-MM-DD-description` (date-prefix + kebab-case)
- Author: consistent value — team name or GitHub username
- Never reuse or modify an applied changeset ID

## Rollback Patterns

### Automatically reversible operations (still write rollback explicitly for clarity)
```sql
--liquibase formatted sql

--changeset dev:2024-01-16-add-phone-to-users
ALTER TABLE users ADD COLUMN phone VARCHAR(20);

--rollback ALTER TABLE users DROP COLUMN phone;
```

### Data migration rollback
```sql
--liquibase formatted sql

--changeset dev:2024-01-21-backfill-order-status
UPDATE orders SET status = 'PENDING' WHERE status IS NULL;

--rollback UPDATE orders SET status = NULL WHERE status = 'PENDING';
```

### Non-reversible operations (document the manual recovery)
```sql
--liquibase formatted sql

--changeset dev:2024-02-10-drop-legacy-tokens-table
DROP TABLE legacy_tokens;

--rollback -- Manual recovery required: restore from backup before this migration
```

## Safe Column Operations

### Adding a NOT NULL column (3 SQL changesets in one file or three files)

```sql
--liquibase formatted sql

-- Step 1: add nullable
--changeset dev:2024-02-01-add-status-nullable
ALTER TABLE orders ADD COLUMN status VARCHAR(20);

--rollback ALTER TABLE orders DROP COLUMN status;

-- Step 2: backfill default value
--changeset dev:2024-02-01-backfill-status
UPDATE orders SET status = 'PENDING' WHERE status IS NULL;

--rollback UPDATE orders SET status = NULL WHERE status = 'PENDING';

-- Step 3: add NOT NULL constraint
--changeset dev:2024-02-01-status-not-null
ALTER TABLE orders ALTER COLUMN status SET NOT NULL;

--rollback ALTER TABLE orders ALTER COLUMN status DROP NOT NULL;
```

### Safe column rename (3-step: add → copy data → drop)
```sql
--liquibase formatted sql

-- Step 1: add new column
--changeset dev:2024-03-01-add-order-status-column
ALTER TABLE orders ADD COLUMN order_status VARCHAR(20);

--rollback ALTER TABLE orders DROP COLUMN order_status;

-- Step 2: copy data
--changeset dev:2024-03-01-copy-status-to-order-status
UPDATE orders SET order_status = status;

--rollback UPDATE orders SET status = order_status;

-- Step 3: drop old column (deploy separately after confirming no app code uses old column)
--changeset dev:2024-03-15-drop-status-column
ALTER TABLE orders DROP COLUMN status;

--rollback ALTER TABLE orders ADD COLUMN status VARCHAR(20); UPDATE orders SET status = order_status;
```

## Non-Blocking Index (PostgreSQL)

```sql
--liquibase formatted sql

--changeset dev:2024-02-10-idx-orders-customer-id runInTransaction:false dbms:postgresql
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orders_customer_id ON orders(customer_id);

--rollback DROP INDEX CONCURRENTLY IF EXISTS idx_orders_customer_id;
```

`runInTransaction:false` is required — `CREATE INDEX CONCURRENTLY` cannot run inside a transaction.

## Context and Labels

```sql
--liquibase formatted sql

--changeset dev:2024-02-15-seed-dev-users context:dev,test
INSERT INTO users (id, name, email) VALUES
    (gen_random_uuid(), 'Dev User', 'dev@example.com'),
    (gen_random_uuid(), 'Test User', 'test@example.com');

--rollback DELETE FROM users WHERE email IN ('dev@example.com', 'test@example.com');
```

Run only specific contexts:
```bash
./mvnw liquibase:update -Dliquibase.contexts=dev
```

## Foreign Key

```sql
--liquibase formatted sql

--changeset dev:2024-01-20-add-orders-table
CREATE TABLE orders (
    id          UUID                     PRIMARY KEY NOT NULL,
    customer_id UUID                     NOT NULL,
    status      VARCHAR(20)              NOT NULL,
    total       DECIMAL(19, 4)           NOT NULL,
    created_at  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_orders_customer FOREIGN KEY (customer_id) REFERENCES customers(id)
);

CREATE INDEX idx_orders_customer_id ON orders(customer_id);

--rollback DROP TABLE orders;
```

## Preconditions

Guard changesets against double-execution using YAML-format changesets (preconditions aren't available in SQL format — move to a separate YAML changeset if needed):

```yaml
# In db.changelog-master.yaml alongside SQL includes
- changeSet:
    id: "2024-03-01-add-index-if-missing"
    author: dev
    preConditions:
      - onFail: MARK_RAN
      - not:
          - indexExists:
              tableName: orders
              indexName: idx_orders_customer_id
    changes:
      - sql:
          sql: "CREATE INDEX idx_orders_customer_id ON orders(customer_id);"
    rollback:
      - sql:
          sql: "DROP INDEX IF EXISTS idx_orders_customer_id;"
```

## Gotchas

- **Never edit applied changesets.** Liquibase stores a checksum. Edit = startup failure with `Validation Failed`.
- **`--rollback` in SQL files** must end with `;` and be on a single line (or use `--rollback` on multiple lines for multi-statement rollbacks).
- **`runInTransaction:false`** is specified inline in the changeset comment: `--changeset dev:id runInTransaction:false`.
- **`includeAll` ordering** depends on filesystem sort order — use explicit `include` for all migrations.
- **`dropTable` in rollback** permanently deletes data — confirm a backup exists before applying destructive migrations in production.
- **`DATABASECHANGELOGLOCK`** left by a crashed migration: `DELETE FROM DATABASECHANGELOGLOCK;`
- SQL changesets with PostgreSQL-specific syntax (`CONCURRENTLY`, `gen_random_uuid()`) will fail on H2. Set `dbms:postgresql` on those changesets and use a TestContainers PostgreSQL container in tests.
