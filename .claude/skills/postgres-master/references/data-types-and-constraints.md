# Data Types and Constraints

## Defaults

- Prefer lowercase `snake_case` table and column names; avoid quoted or mixed-case identifiers.
- Prefer `bigint generated always as identity` for surrogate primary keys.
- Prefer `uuid` only when global uniqueness, federation, or externally opaque IDs are genuinely required.
- Prefer `text` for strings; use `check (length(col) <= n)` when business limits matter.
- Prefer `numeric(p,s)` for money and exact decimal arithmetic.
- Prefer `double precision` for approximate floating-point values; do not use floats for money.
- Prefer `timestamptz` for event time; avoid timestamp-without-time-zone defaults.
- Prefer `bytea` for binary data stored in PostgreSQL.
- Prefer `boolean not null` unless tri-state values are real business state.

## Nullability and Defaults

- Add `not null` wherever the business invariant truly requires presence.
- Use defaults for common values, but be careful with migration-time rewrites on existing large tables.
- Treat nullable columns as part of the semantic design, not a convenience toggle.

## Keys and Referential Integrity

- Every relational table that will be referenced should usually have a primary key.
- Add foreign keys deliberately, and pair them with matching indexes on the referencing side.
- Choose `on delete` behavior explicitly (`restrict`, `cascade`, `set null`, `set default`) instead of relying on assumptions.

## Checks and Unique Rules

- Use `check` constraints for row-local invariants like positive amounts or allowed ranges.
- Use `unique nulls not distinct` when the real business rule is “at most one null-like missing value” on PostgreSQL 15+.
- Keep enums for small, stable sets; use text + check or lookup tables when values evolve with business logic.
- Treat `not null` + `check` together as the normal way to enforce meaningful value rules.

## Route Elsewhere

- If the question becomes aggregate ownership, cascades, or entity lifecycle, route to `jpa-patterns`.
- If the question becomes projection shape or read-model design over entities, route to `blaze-persistence`.
- If the question becomes query implementation, route to `jooq-patterns`.
