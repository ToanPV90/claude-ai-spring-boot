# Fetch Strategies

## Default Rule

Treat fetch strategy as a deliberate design choice for subviews and collections, not as an implementation detail.

- Small `@ToOne` subviews are usually fine with join-style fetching.
- To-many subviews need explicit scrutiny because the wrong default can multiply rows quickly.
- If the result shape is mostly about large collection navigation or SQL-shaped aggregation, re-check whether Blaze is still the right tool.

## Practical Strategy Guide

| Situation | Default Move | Watch For |
|-----------|--------------|-----------|
| Small `@ToOne` subview | Join-style fetching is usually fine | Accidental over-fetch if the view keeps growing |
| Small to-many collection on a detail view | A secondary collection-oriented fetch can be fine | Hidden N+1 or row multiplication if reused broadly |
| Large to-many collection in list/search results | Prefer a collection-safe strategy instead of relying on join-style fetching | Huge result sets, duplicate parent rows, unstable paging |
| The query needs SQL-first aggregation to shape nested collections | Reassess and possibly route to `jooq-master` | Forcing Blaze to solve a reporting problem |

## Rules

- Pick fetch strategy with the final view shape in mind, not just the entity association.
- Keep to-many subviews out of list endpoints unless the fetch shape and index support are intentional.
- Re-check paging whenever a view adds nested collections.
- If the query plan starts to look like reporting SQL rather than entity-centric projection, route outward.

## Gotchas

- Join-style fetching on large to-many subviews can multiply rows enough to dominate the endpoint.
- A view that is safe for a detail endpoint can be unsafe when reused in a paged list.
- Keyset or offset paging can look correct in small tests and still break under duplicated parent rows.

## Route Elsewhere

- Plain fetch tuning on entities and aggregate graphs → `jpa-master`
- SQL-first nested shaping, reporting, or database-native aggregation → `jooq-master`
