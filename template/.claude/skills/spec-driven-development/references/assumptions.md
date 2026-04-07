# Assumption-Surfacing Checklist

Surface every implicit decision before locking the spec. An unverified assumption is the top cause of spec failure.

## How to Use

1. Walk through each category below.
2. Record every assumption as a row in the log table.
3. Mark status: **Confirmed** ✅, **Open** ❓, or **Rejected** ❌.
4. Do not advance past SPECIFY while any critical assumption is Open.

---

## Categories to Probe

| # | Category | Questions to Ask |
|---|----------|-----------------|
| 1 | **Database** | Which RDBMS? Schema-first or JPA-generated? Liquibase or Flyway? Existing tables or greenfield? |
| 2 | **Auth / AuthZ** | JWT resource-server or session? Keycloak, Okta, or custom? Which roles gate this feature? |
| 3 | **API Versioning** | URI path (`/v1/`), header, or none yet? Backward-compat requirements? |
| 4 | **Module Boundaries** | New Maven module or existing? Shared DTOs or module-private? |
| 5 | **External Dependencies** | Third-party APIs, message brokers, caches? SLAs and fallback behavior? |
| 6 | **Testing Infra** | Testcontainers available? CI has Docker? Dedicated test profile in `application-test.yml`? |
| 7 | **Deployment Target** | Docker image? Kubernetes? Cloud Run? Affects health probes and config. |
| 8 | **Data Volume** | Expected row counts? Need pagination? Bulk import paths? |
| 9 | **Error Handling** | Global `@ControllerAdvice`? Standard `ProblemDetail` (RFC 9457)? |
| 10 | **Observability** | Custom metrics? Trace propagation? Structured logging required? |

---

## Assumption Log

| # | Category | Assumption | Status | Resolution |
|---|----------|-----------|--------|------------|
| 1 | Database | PostgreSQL 15+ is the target RDBMS | ❓ Open | |
| 2 | Database | Liquibase manages schema migrations | ❓ Open | |
| 3 | Auth | Keycloak JWT resource-server; no custom login | ❓ Open | |
| 4 | API Versioning | No versioning prefix in first iteration | ❓ Open | |
| 5 | Module Boundaries | Feature lives in its own Maven module | ❓ Open | |
| 6 | Testing Infra | Testcontainers PostgreSQL available in CI | ❓ Open | |
| 7 | Deployment | Docker image built via `spring-boot:build-image` | ❓ Open | |

_Add rows as assumptions surface during SPECIFY and PLAN._

---

## Rules

- Every row must have a **Resolution** before the spec is considered locked.
- If an assumption is Rejected, update the spec to remove the dependency.
- Re-check the log when PLAN or TASKS reveal new constraints.
