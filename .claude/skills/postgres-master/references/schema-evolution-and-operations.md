# Schema Evolution and Operations

## Safe Evolution Defaults

- Prefer additive changes first, then backfills, then constraint tightening, then cleanup.
- Use `create index concurrently` when avoiding write blocking matters.
- Use `not valid` + `validate constraint` when large-table check/FK validation should not block writes up front.
- Assume large-table rewrites are risky until proven otherwise.

## Migration Questions

- Will this default or constraint rewrite the whole table?
- Does this rollout need a two-step deploy for application compatibility?
- Are old readers and writers still safe during the transition?
- Is the migration reversible if the release must stop mid-flight?
- Can this change be staged with backfill + validation instead of one blocking step?

## Row-Level Security and Extensions

- Use row-level security only when the access model really belongs in the database.
- Treat extensions as part of platform design, not incidental query code.
- Make extension dependencies explicit in setup and operations docs.

## Operational Gotchas

- Identity and sequence gaps are normal.
- MVCC means deletes and updates accumulate dead tuples until vacuum catches up.
- Concurrent index creation cannot run inside a normal transaction block.
- Volatile defaults like `now()` or generated UUID functions can force a table rewrite during `add column ... default ... not null` changes.

## Route Elsewhere

- If the problem becomes application migration sequencing or service ownership, route to `java-architect`.
- If the problem becomes framework-specific implementation wiring for config or repositories, route to the owning implementation skill; in this repo that means `spring-boot-engineer` when Spring Boot is explicit.
