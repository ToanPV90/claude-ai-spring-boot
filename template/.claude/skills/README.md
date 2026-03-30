# Skills

Skills are reusable prompts that teach Claude specific patterns for Java development.

## Structure Convention

Each skill folder contains:

| File | Purpose | Audience |
|------|---------|----------|
| `SKILL.md` | Main high-signal instructions + trigger logic | AI |
| `references/*.md` | Deep examples, gotchas, troubleshooting, API details | AI (loaded as needed) |
| `scripts/*` | Deterministic helpers and validation | AI / maintainers |
| `README.md` | Optional human documentation | Humans |

## Authoring Rules

- For the full skill-authoring workflow, frontmatter schema, trigger guidance, and review checklist, load [`write-a-skill`](write-a-skill/)
- Keep `SKILL.md` thin; split large content into `references/`
- Keep mirrored skills in `.claude/skills/` and `template/.claude/skills/` synchronized
- Run `npm run verify:skills` after skill edits
- Keep generic Java skills framework-neutral by default; route to framework-specific skills like `spring-boot-engineer` only when the framework is explicitly named

## Available Skills

### Code Quality
| Skill | Description |
|-------|-------------|
| [java-code-review](java-code-review/) | Review guidance for Java code with severity-first findings and routing to specialty skills |
| [api-contract-review](api-contract-review/) | REST contract review for HTTP semantics, compatibility, error formats, and release readiness |
| [backend-practices-review](backend-practices-review/) | Review guidance for backend trust boundaries, retry safety, dependency calls, storage/files, and lifecycle-safe defaults |
| [clean-code](clean-code/) | Readability-focused refactoring guidance for reducing complexity, duplication, and code smells |
| [audit-codex](audit-codex/) | Cross-audit workflow for sending diffs to Codex CLI and validating findings locally |

Review-oriented skills share a `review-intake-and-output.md` reference pattern so review target, completeness, severity, and dispositions stay explicit.

### Architecture & Design
| Skill | Description |
|-------|-------------|
| [design-patterns](design-patterns/) | Pattern-selection guidance for Java extension points, with focused defaults and tradeoffs |
| [java-architect](java-architect/) | Architecture guidance for service boundaries, integration choices, resilience, and ADR-style decisions |
| [maven-master](maven-master/) | Maven multi-module guidance for parent/aggregator POMs, module boundaries, dependency management, and module-aware builds |
| [request-refactor-plan](request-refactor-plan/) | Planning guidance for breaking risky refactors into safe, reviewable steps |

### Testing & TDD
| Skill | Description |
|-------|-------------|
| [tdd-guide](tdd-guide/) | Workflow guidance for strict red-green-refactor and choosing the right Java test level before framework-specific slices |

### Framework, Data & Platform
| Skill | Description |
|-------|-------------|
| [spring-boot-engineer](spring-boot-engineer/) | Implementation guidance for building Spring Boot features once Spring is explicitly named and architecture and layer boundaries are settled |
| [spring-boot-master](spring-boot-master/) | Layering guidance for controllers, services, repositories, DTO boundaries, validation, and exception structure |
| [openapi-master](openapi-master/) | OpenAPI and springdoc guidance for spec design, schema annotations, Swagger UI, and contract-first tradeoffs |
| [observability-master](observability-master/) | Spring Boot observability guidance for Actuator, Micrometer metrics, tracing, and Prometheus/Grafana integration |
| [resilience-master](resilience-master/) | Resilience4j guidance for circuit breakers, retries, timeouts, bulkheads, and fault-containment defaults |
| [liquibase-master](liquibase-master/) | Liquibase migration guidance for changelog design, rollback safety, and safe schema evolution |
| [jpa-master](jpa-master/) | JPA/Hibernate troubleshooting and decision guidance for fetching, transactions, relationships, and query shape |
| [postgres-master](postgres-master/) | PostgreSQL schema design guidance for tables, constraints, indexes, JSONB, partitioning, and safe evolution |
| [blaze-persistence](blaze-persistence/) | Blaze-Persistence guidance for entity views, keyset pagination, CriteriaBuilder queries, and JPA-centric read models |
| [jooq-master](jooq-master/) | SQL-first guidance for jOOQ code generation, reporting queries, dynamic SQL, and JPA coexistence |
| [logging-master](logging-master/) | Structured logging guidance for SLF4J, JSON logs, MDC, and boundary-level exception logging |
| [kafka-master](kafka-master/) | Spring Kafka implementation guidance for producers, consumers, retries, DLT handling, and messaging tests |
| [redis-master](redis-master/) | Redis implementation guidance for caching, RedisTemplate, TTLs, locks, pub/sub, and rate limiting |

### Security
| Skill | Description |
|-------|-------------|
| [keycloak-master](keycloak-master/) | Keycloak-specific Spring Security guidance for JWT validation, role extraction, and bearer-token authorization |

### Skill Authoring
| Skill | Description |
|-------|-------------|
| [write-a-skill](write-a-skill/) | Authoring guidance for building repo-native Claude skills with strong triggers, thin mains, and mirrored references |

## Adding a New Skill

1. Create folder: `.claude/skills/<skill-name>/`
2. Create `SKILL.md` with full repo frontmatter and explicit "Use when..." triggers
3. Add `references/` for deep material instead of bloating `SKILL.md`
4. Optionally add `scripts/` for deterministic checks or helpers
5. Optionally create `README.md` with human documentation
6. Mirror the same change into `template/.claude/skills/`
7. Run `npm run verify:skills`
8. Update this table

## Usage

Skills are automatically loaded by Claude Code based on context. You can also reference them directly:

```
> "Review this code"          # Loads java-code-review
> "Check this API"            # Loads api-contract-review
> "Review this backend flow"  # Loads backend-practices-review
> "Clean this code"           # Loads clean-code
> "Add JPA repository"        # Loads jpa-master
```
