# Skills

Skills are reusable prompts that teach Claude specific patterns for Java development.

## Structure Convention

Each skill folder contains:

| File | Purpose | Audience |
|------|---------|----------|
| `SKILL.md` | Instructions for Claude | AI (loaded with `view`) |
| `README.md` | Documentation, examples, tips | Humans (onboarding) |

## Available Skills

### Code Quality
| Skill | Description |
|-------|-------------|
| [java-code-review](java-code-review/) | Systematic Java code review checklist (null safety, exceptions, concurrency, performance) |
| [api-contract-review](api-contract-review/) | REST API audit: HTTP semantics, versioning, backward compatibility |
| [clean-code](clean-code/) | DRY, KISS, YAGNI, naming conventions, refactoring techniques |
| [audit-codex](audit-codex/) | Send diffs to OpenAI Codex CLI for independent audit |

### Architecture & Design
| Skill | Description |
|-------|-------------|
| [design-patterns](design-patterns/) | Factory, Builder, Strategy, Observer, Decorator, Sealed Interfaces |
| [java-architect](java-architect/) | Enterprise Java architecture, DDD, Clean Architecture, ADRs |

### Testing & TDD
| Skill | Description |
|-------|-------------|
| [tdd-guide](tdd-guide/) | Red-green-refactor loop, WebMvcTest, DataJpaTest, TestContainers integration tests |

### Framework & Data
| Skill | Description |
|-------|-------------|
| [spring-boot-engineer](spring-boot-engineer/) | Spring Boot 3.x code generation with quick-start templates |
| [spring-boot-patterns](spring-boot-patterns/) | Spring Boot best practices: controllers, services, repos, DTOs, testing |
| [jpa-patterns](jpa-patterns/) | JPA/Hibernate: N+1 prevention, lazy loading, transactions, specifications. Includes [postgresql.md](jpa-patterns/references/postgresql.md) for JSONB, upsert, advisory locks, and array patterns |
| [jooq-patterns](jooq-patterns/) | jOOQ type-safe SQL: complex queries, reporting, dynamic SQL, coexisting with JPA |
| [logging-patterns](logging-patterns/) | Structured JSON logging, SLF4J, MDC, Micrometer Observation, Kafka correlation ID propagation |
| [kafka-patterns](kafka-patterns/) | Spring Kafka: KafkaTemplate, @KafkaListener, @RetryableTopic, DLT, EmbeddedKafka testing |
| [redis-patterns](redis-patterns/) | Spring Data Redis: @Cacheable, RedisTemplate, distributed lock, pub/sub, TestContainers testing |

### Security
| Skill | Description |
|-------|-------------|
| [keycloak-patterns](keycloak-patterns/) | Keycloak + Spring Security 6: JWT validation, role mapping, @PreAuthorize, OAuth2 resource server |

## Adding a New Skill

1. Create folder: `.claude/skills/<skill-name>/`
2. Create `SKILL.md` with instructions for Claude
3. Optionally create `README.md` with human documentation
4. Update this table

## Usage

Skills are automatically loaded by Claude Code based on context. You can also reference them directly:

```
> "Review this code"          # Loads java-code-review
> "Check this API"            # Loads api-contract-review
> "Clean this code"           # Loads clean-code
> "Add JPA repository"        # Loads jpa-patterns
```
