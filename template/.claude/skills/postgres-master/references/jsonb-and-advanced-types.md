# JSONB and Advanced Types

## JSONB Default Rule

- Prefer normal columns and tables for stable, relational business fields.
- Use JSONB for optional, sparse, or semi-structured attributes whose shape varies meaningfully.
- Add constraints or generated columns when JSONB fields become operationally important.

## JSONB Patterns

- Prefer `jsonb` over `json` unless original formatting or key order truly matters.
- Use GIN indexes for containment and key-existence lookups.
- Consider `jsonb_path_ops` when containment-heavy workloads dominate and key-existence operators are secondary.
- Promote frequently filtered scalar JSONB fields into generated columns or expression indexes.

## Arrays, Ranges, and Specialized Types

- Arrays are good for ordered scalar lists; they are not replacements for relational associations.
- Range types are good for intervals and overlap constraints.
- `tsvector` + GIN is the PostgreSQL-native default for full-text search.
- `inet`/`cidr` are better than plain text when the data is genuinely network-shaped.
- Network, text-search, and extension-backed types should only appear when the workload truly uses them.

## Generated Columns

- Use generated columns when a derived value must be queryable and indexable.
- Keep the generating expression stable and easy to reason about.

## Route Elsewhere

- If the design question is really about API projection shape, route to `blaze-persistence`.
- If the problem is JSONB query implementation or PostgreSQL-native query code, route to `jooq-patterns`.
