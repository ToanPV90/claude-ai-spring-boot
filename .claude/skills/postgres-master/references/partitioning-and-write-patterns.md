# Partitioning and Write Patterns

## Partitioning Defaults

- Partition only when table size, pruning patterns, or maintenance needs justify it.
- Use declarative partitioning, usually by time or another strong routing key.
- Choose a partition key that matches the dominant pruning pattern.
- Remember that partitioned unique constraints usually need the partition key included.

## Insert-Heavy Tables

- Keep index count minimal.
- Prefer bulk inserts or `copy`-style loading where appropriate.
- Consider unlogged or staging tables only for rebuildable data.
- Avoid unnecessary surrogate complexity for append-only or event workloads.

## Update-Heavy Tables

- Watch row width and bloat.
- Keep frequently updated fields out of heavily indexed wide rows when possible.
- Use fillfactor intentionally when update churn is real.
- Favor HOT-friendly updates by avoiding unnecessary changes to indexed columns.

## Upserts and Conflict Targets

- Design explicit unique keys for `on conflict` workflows.
- Prefer updating only the columns that truly need to change.
- Distinguish between latest-state OLTP tables and append-only event histories before defaulting to upserts.
- Keep conflict targets aligned with the real natural key, not just a convenient surrogate.

## Route Elsewhere

- If concurrency control becomes aggregate or transaction behavior, route to `jpa-master`.
- If the question becomes SQL implementation or locking statements, route to `jooq-master`.
