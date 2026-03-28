# Indexing and Access Paths

## Start from Real Queries

- Index predicates you actually filter, join, sort, or conflict on.
- Design indexes from the most common access paths, not from generic “index every foreign key and every text field” habits.

## Default Index Types

- Use B-tree for equality, range, and ordered access.
- Use composite indexes when queries filter on a leftmost prefix.
- Use `include (...)` when index-only scans need a few extra non-key columns.
- Use expression indexes for stable derived search keys like `lower(email)`.
- Use partial indexes when the hot subset is materially smaller and commonly filtered.
- Use GIN for JSONB containment/existence, arrays, and full-text search.
- Use GiST for ranges and exclusion constraints.
- Use BRIN only for very large naturally ordered tables.

## Important PostgreSQL Defaults

- Primary keys and unique constraints create indexes automatically.
- Foreign keys do **not** create indexes automatically.
- Partitioned tables still need partition-key-aware index design.

## Common Review Questions

- Which queries must stay fast at p95/p99?
- Which joins and deletes depend on foreign-key indexing?
- Will this index support both filtering and the desired ordering?
- Would a partial or expression index match the actual query shape better?
- Does a partitioned-table uniqueness rule need the partition key included?

## Anti-Patterns

- Adding broad “maybe useful later” indexes on write-heavy tables.
- Treating composite index order as irrelevant.
- Using GIN/JSONB indexes when the field should really be a first-class column.
- Forgetting that `on conflict (...)` needs a matching unique index or constraint.
- Creating large production indexes without deciding whether `create index concurrently` is required.
