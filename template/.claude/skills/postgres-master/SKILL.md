---
name: postgres-master
description: Design guidance for PostgreSQL tables, schemas, constraints, indexes, JSONB usage, and safe evolution before application code is written. Use when designing or reviewing PostgreSQL table structure, choosing column types or indexes, modeling JSONB and constraints, planning partitioning, or shaping migration-safe schema changes.
license: MIT
metadata:
  author: local
  version: "1.1.1"
  domain: backend
  triggers:
    - PostgreSQL schema
    - PostgreSQL table design
    - Postgres indexes
    - JSONB
    - GIN index
    - create index concurrently
    - ON CONFLICT
    - partitioning
    - row-level security
    - foreign key index
    - PostgreSQL constraints
    - schema evolution
    - MVCC
    - fillfactor
    - timestamptz
  role: specialist
  scope: architecture
  output-format: guidance + schema design
  related-skills: jpa-master, blaze-persistence, jooq-master, spring-boot-master, spring-boot-engineer, java-architect, java-code-review
---

# PostgreSQL Master

Decision guide for PostgreSQL-first schema design in Java systems.

## When to Use
- The task is designing new PostgreSQL tables, schemas, constraints, or indexes
- The user needs help choosing column types, defaults, nullability, or key strategy
- The design involves JSONB, arrays, ranges, partitioning, or row-level security
- The team is planning heavy insert/update/upsert workloads or safe schema evolution
- The user wants to review whether a PostgreSQL schema matches real query and write paths
- The user needs PostgreSQL-specific guidance on identifier naming, FK indexes, `ON CONFLICT`, or `CREATE INDEX CONCURRENTLY`

## When Not to Use
- The task is JPA mapping, fetch behavior, transactions, or aggregate semantics; use `jpa-master`
- The task is entity views, keyset pagination over JPA entities, or Blaze criteria composition; use `blaze-persistence`
- The task is SQL query implementation, code generation, or reporting queries; use `jooq-master`
- The task is controller/service/repository ownership or DTO boundaries; use `spring-boot-master`
- The task is generic application implementation rather than schema design; use the appropriate implementation skill, and for Spring Boot that is `spring-boot-engineer`
- The task is service decomposition, migration rollout ownership, or broader platform tradeoffs; use `java-architect`
- The task is review-only bug triage rather than design guidance; use `java-code-review`

## Version Assumptions
- PostgreSQL 15+ by default unless a project says otherwise
- Java applications using PostgreSQL as the primary relational store; if the surrounding stack is Spring Boot, keep the repo's Spring Boot defaults

## Reference Guide

| Topic | File | Load When |
|------|------|-----------|
| Types, keys, nullability, and constraints | `references/data-types-and-constraints.md` | Choosing column types, PK/FK strategy, defaults, checks, or enum/JSONB boundaries |
| Indexing and query-shaped access paths | `references/indexing-and-access-paths.md` | Designing B-tree/GIN/GiST/BRIN indexes, FK indexes, partial/expression indexes |
| JSONB and advanced PostgreSQL types | `references/jsonb-and-advanced-types.md` | Deciding on JSONB, arrays, ranges, text search, network types, generated columns |
| Partitioning and heavy-write patterns | `references/partitioning-and-write-patterns.md` | Designing for insert-heavy, update-heavy, time-based, or upsert-heavy workloads |
| Safe schema evolution and operations | `references/schema-evolution-and-operations.md` | Planning migrations, constraints, concurrent indexes, RLS, and extension usage |

## Symptom Triage

| Symptom | Default Move |
|--------|--------------|
| Team is debating `UUID` vs `BIGINT` IDs | Start with `references/data-types-and-constraints.md` |
| Query is slow but table design is still in flux | Review access paths in `references/indexing-and-access-paths.md` before adding random indexes |
| Optional attributes are piling up | Reassess with `references/jsonb-and-advanced-types.md` instead of blindly defaulting to JSONB |
| Table is growing rapidly by time or tenant | Review partitioning guidance before scaling the table shape |
| Migration plan risks table rewrites or downtime | Use `references/schema-evolution-and-operations.md` first |
| Deletes or joins on child tables are unexpectedly slow | Check foreign-key indexing before blaming PostgreSQL |
| Business rules depend on “only one missing value” semantics | Revisit `NULLS NOT DISTINCT` before assuming `UNIQUE` is enough |

## Postgres Design Ladder

1. Start from access paths and write patterns, not from a generic ER diagram.
2. Normalize first; denormalize only after a measured bottleneck appears.
3. Pick semantically correct types and nullability before adding indexes.
4. Add indexes for real filters, joins, sorts, and conflict targets.
5. Keep identifiers unquoted and `snake_case`; PostgreSQL lowercases unquoted names by default.
6. Introduce JSONB, partitioning, or RLS deliberately — not as defaults.

## Quick Mapping

| Need | Default Choice |
|-----|----------------|
| Stable OLTP table with relational joins | Normalized table + PK/FK + B-tree indexes |
| Optional, sparse, semi-structured attributes | JSONB with explicit constraints and targeted indexes |
| Large append-only or time-filtered table | Declarative partitioning with partition-key-aware indexes |
| Frequent upsert by natural key | Unique constraint + `ON CONFLICT` target |
| Exact money values | `NUMERIC(p,s)` |
| Event timestamps | `TIMESTAMPTZ` |
| Case-insensitive lookup | Expression index on `lower(column)` unless a stronger database-level type/constraint is required |

## Constraints

### MUST DO

| Rule | Preferred Pattern |
|------|-------------------|
| Design around actual query and write paths | Index filters, joins, sort keys, and conflict targets intentionally |
| Add explicit indexes for foreign keys when joins, deletes, or updates depend on them | PostgreSQL does not auto-index FK columns |
| Prefer semantically strong defaults | `TIMESTAMPTZ`, `TEXT`, `NUMERIC`, `BIGINT GENERATED ALWAYS AS IDENTITY` |
| Keep identifiers predictable | `snake_case`, unquoted identifiers, and explicit names for important constraints/indexes |
| Plan schema evolution for large tables conservatively | Additive changes first, `NOT VALID` / validation patterns, concurrent indexes where needed |
| Keep schema ownership explicit | Database design here, ORM semantics in `jpa-master`, SQL implementation in `jooq-master` |

### MUST NOT DO
- Do not default to quoted or mixed-case identifiers
- Do not default to `VARCHAR(n)` or `TIMESTAMP WITHOUT TIME ZONE` when `TEXT` or `TIMESTAMPTZ` better match the semantics
- Do not use JSONB as a lazy substitute for relational modeling when the shape is stable and relational
- Do not assume `UNIQUE` means only one `NULL` unless you intentionally use `NULLS NOT DISTINCT`
- Do not add partitioning or exotic indexes without a clear workload reason

## Gotchas
- PostgreSQL does not auto-index foreign keys.
- Quoted or mixed-case identifiers make every future query and migration noisier; prefer lowercase `snake_case` names.
- `UNIQUE` still allows multiple `NULL` values unless you opt into `NULLS NOT DISTINCT`.
- Sequence and identity gaps are normal and should not drive design workarounds.
- MVCC means update-heavy wide rows and bad fillfactor choices can quietly create bloat.
- JSONB is powerful, but once core business fields hide there, constraints and query performance become harder to reason about.
- Volatile defaults, table rewrites, and non-concurrent index creation can turn a “small migration” into a production event.

## Minimal Examples

```sql
create table users (
  user_id bigint generated always as identity primary key,
  email text not null,
  created_at timestamptz not null default now(),
  unique nulls not distinct (email)
);

create index users_created_at_idx on users (created_at);
```

```sql
create table orders (
  order_id bigint generated always as identity primary key,
  user_id bigint not null references users(user_id),
  status text not null,
  total numeric(12,2) not null check (total > 0),
  created_at timestamptz not null default now()
);

create index orders_user_id_idx on orders (user_id);
create index orders_created_at_idx on orders (created_at);
```

## What to Verify
- PK/FK/unique/check/nullability choices match the business invariants
- Indexes line up with real filters, joins, sorts, and upsert targets
- Identifier naming and constraint/index names stay predictable and migration-friendly
- JSONB or partitioning is justified by workload shape rather than novelty
- JPA/jOOQ/Blaze boundaries remain explicit after the schema decisions
- Migration and rollout steps avoid avoidable rewrites or blocking operations

## See References
- `references/data-types-and-constraints.md`
- `references/indexing-and-access-paths.md`
- `references/jsonb-and-advanced-types.md`
- `references/partitioning-and-write-patterns.md`
- `references/schema-evolution-and-operations.md`
