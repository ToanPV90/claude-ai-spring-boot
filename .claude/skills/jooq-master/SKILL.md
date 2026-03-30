---
name: jooq-master
description: Implementation guidance for using jOOQ as the SQL-first companion to Spring Boot and JPA when queries become reporting-heavy, database-specific, or too dynamic for ORM-first access. Use when building or reviewing type-safe SQL queries, jOOQ code generation, reporting reads, batch SQL, or JPA-and-jOOQ coexistence patterns.
license: MIT
metadata:
  author: local
  version: "1.1.1"
  domain: backend
  triggers:
    - jOOQ
    - DSLContext
    - org.jooq
    - Condition
    - Record
    - fetchInto
    - type-safe SQL
    - complex SQL
    - reporting query
    - CTE
    - window function
    - dynamic SQL
    - database-first
    - jOOQ code generation
  role: specialist
  scope: implementation
  output-format: code + guidance
  related-skills: jpa-master, blaze-persistence, postgres-master, spring-boot-engineer, spring-boot-master, java-architect, tdd-guide, java-code-review
---

# jOOQ Master

Use jOOQ when the read or write shape is fundamentally SQL-shaped, not aggregate-shaped.

## Version Assumptions

- Spring Boot 3.x
- jOOQ 3.20+
- PostgreSQL as the default target dialect unless a project says otherwise

## When to Use

- JPQL or Specifications are getting contorted for reporting or search use cases
- You need window functions, CTEs, database-specific operators, or SQL-heavy projections
- The query should return a read model rather than a managed entity graph
- Bulk updates or inserts are large enough that ORM lifecycle overhead is wasteful
- You want JPA for aggregates but jOOQ for reporting and query-heavy paths in the same service

## When Not to Use

- The task is ordinary CRUD on a mutable aggregate root; prefer `jpa-master`
- The task is projection-heavy but still entity-centric with keyset/entity-view needs; prefer `blaze-persistence`
- The task is PostgreSQL schema, index, constraint, or partition design; prefer `postgres-master`
- The task is controller/service/repository ownership or DTO boundary design; prefer `spring-boot-master`
- The task is system-level persistence strategy or service decomposition; prefer `java-architect`
- The task is test-first workflow rather than jOOQ specifics; prefer `tdd-guide`
- The task is review-only bug/risk analysis; prefer `java-code-review`

## Reference Guide

| Topic | File | Load When |
|------|------|-----------|
| Setup and code generation | `references/setup-and-codegen.md` | Adding Spring Boot starter config, Maven codegen, dialect setup, generated package conventions |
| CRUD and dynamic queries | `references/crud-and-dynamic-queries.md` | Building repositories, projections, pagination, dynamic `Condition` lists, sort mapping |
| Reporting and analytics | `references/reporting-and-analytics.md` | Using aggregations, window functions, CTEs, or SQL-first read models |
| Advanced SQL and database-specific patterns | `references/advanced-sql.md` | Needing `EXISTS`, `UNION ALL`, `ON CONFLICT`, locking clauses, or PostgreSQL-specific jOOQ features |
| JPA coexistence | `references/jpa-coexistence.md` | Mixing JPA and jOOQ in one service, sharing transactions, deciding which tool owns a use case |
| Testing | `references/testing.md` | Writing `@SpringBootTest` + Testcontainers jOOQ tests, verifying SQL-heavy behavior |

## Symptom Triage

| Symptom | Default Move |
|--------|--------------|
| JPA query keeps growing joins, projections, and edge cases | Move the read path to jOOQ |
| Need ranking, lag/lead, or month-over-month analytics | Use `references/reporting-and-analytics.md` |
| Need optional filters with type-safe sorting/paging | Use `references/crud-and-dynamic-queries.md` |
| Want both JPA aggregates and SQL-heavy reports in one service | Use `references/jpa-coexistence.md` |
| Need to wire starter/codegen/dialect correctly | Use `references/setup-and-codegen.md` |

## SQL Decision Ladder

1. Start with the caller's read shape: aggregate, projection, search result, or report.
2. If the caller needs a mutable aggregate, stay with JPA.
3. If the caller needs a SQL-shaped read model, switch to jOOQ early.
4. Select only the fields the caller needs; do not fetch entire rows by habit.
5. Keep SQL in generated table/field references, not raw strings.

## Quick Mapping

| Need | Default |
|-----|---------|
| Mutable aggregate CRUD | JPA |
| Read model / report row | jOOQ projection |
| Dynamic filtering + paging | jOOQ `Condition` list |
| Window functions / CTEs | jOOQ |
| Shared transactional workflow | JPA + jOOQ in same `@Transactional` service |
| Bulk insert/update | jOOQ batch / bulk SQL |

## Constraints

### MUST DO

| Rule | Why |
|------|-----|
| Generate jOOQ classes from the real schema or migrations | The type-safety benefit depends on generation |
| Always terminate fluent DML/DDL chains with `.execute()`, `.fetch()`, or another terminal operation | jOOQ builds queries fluently and silently until a terminal operation runs them |
| Use constructor injection in production code | Matches repo-wide Spring conventions |
| Keep repositories SQL-focused and return explicit projections or read models | Prevents ORM-style leakage into jOOQ code |
| Share transactions intentionally when combining JPA and jOOQ | Mixed data access should still honor one boundary |
| Prefer `EXISTS` / `NOT EXISTS` for existence checks and nullable anti-joins | They match SQL intent better than `COUNT(*) > 0` or `NOT IN` with nullable columns |

### MUST NOT DO

- Do not embed raw SQL strings when generated references can express the query safely.
- Do not move simple entity CRUD to jOOQ just for consistency.
- Do not return giant generic records when the caller only needs a few fields.
- Do not duplicate JPA tuning guidance here; route fetch and aggregate behavior to `jpa-master`.
- Do not default to `UNION` when `UNION ALL` is the real requirement.

## Gotchas

- jOOQ is not a replacement for aggregate modeling; it is a better fit for SQL-shaped reads and bulk writes.
- A query becoming dynamic does not automatically mean it should stay in JPA; dynamic SQL is one of jOOQ's strengths.
- Code generation drift quietly breaks confidence; regenerate whenever schema changes.
- Sharing JPA and jOOQ in one transaction is fine, but only if ownership is clear and read/write paths are deliberate.
- `NOT IN` behaves badly when nullable columns participate; prefer `NOT EXISTS` instead.
- Aggregate filters written with `CASE` often read worse than PostgreSQL's `FILTER (WHERE ...)` syntax in jOOQ.

## Minimal Examples

```java
public List<OrderSummary> findOrders(OrderSearchCriteria criteria) {
    List<Condition> conditions = new ArrayList<>();
    if (criteria.status() != null) {
        conditions.add(ORDERS.STATUS.eq(criteria.status()));
    }
    if (criteria.minTotal() != null) {
        conditions.add(ORDERS.TOTAL.ge(criteria.minTotal()));
    }

    return dsl.select(ORDERS.ID, ORDERS.STATUS, ORDERS.TOTAL)
        .from(ORDERS)
        .where(DSL.and(conditions))
        .fetchInto(OrderSummary.class);
}
```

```java
@Transactional
public void completeOrder(Long id) {
    Order order = orderRepository.findById(id).orElseThrow();
    order.complete();
    reportRepository.refreshDailySummary(id);
}
```

## What to Verify

- the query returns a projection or report row when an entity is unnecessary
- sorting, paging, and optional filters map only to known fields
- code generation matches the current schema
- JPA vs jOOQ ownership is explicit when both appear in the same feature
- tests exercise SQL-heavy paths with realistic database behavior

## See References

- [Setup and Code Generation](references/setup-and-codegen.md)
- [CRUD and Dynamic Queries](references/crud-and-dynamic-queries.md)
- [Reporting and Analytics](references/reporting-and-analytics.md)
- [Advanced SQL](references/advanced-sql.md)
- [JPA Coexistence](references/jpa-coexistence.md)
- [Testing](references/testing.md)
