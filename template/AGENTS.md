# PROJECT KNOWLEDGE BASE

**Generated from:** create-claude-spring-boot template
**Purpose:** Spring Boot application with Claude AI agents/skills pre-configured

## OVERVIEW
Spring Boot 3.x Maven project with TDD workflow, Claude AI integration, and enterprise-ready patterns.

## STRUCTURE
```
{project-name}/
├── pom.xml                # Maven config (groupId: vn.lukepham.projects)
├── AGENTS.md              # This file: project knowledge base
├── CLAUDE.md              # AI behavior rules (plan mode, verification, TDD)
└── .claude/
    ├── agents/            # 8 specialized AI agents
    │   ├── java-architect.md
    │   ├── spring-boot-engineer.md
    │   ├── test-automator.md
    │   ├── security-engineer.md
    │   ├── devops-engineer.md
    │   ├── docker-expert.md
    │   ├── kubernetes-specialist.md
    │   └── code-reviewer.md
└── skills/            # 32 skills across 8 categories
        ├── backend-practices-review/ # Cross-cutting backend production-safety review
        ├── spring-boot-master/   # Core Spring Boot structure guidance
        ├── spring-boot-engineer/   # Spring Boot 3.x configs
        ├── openapi-master/        # OpenAPI specs and springdoc
        ├── observability-master/  # Actuator, metrics, tracing
        ├── resilience-master/     # Resilience4j fault tolerance
        ├── liquibase-master/      # Liquibase migrations and rollback
        ├── java-architect/         # Enterprise Java patterns
        ├── maven-master/           # Maven multi-module structure
        ├── jpa-master/           # JPA/Hibernate persistence guidance
        ├── postgres-master/        # PostgreSQL schema and index design
        ├── blaze-persistence/      # Entity views and keyset pagination
        ├── kafka-master/         # Event-driven delivery with Kafka
        ├── redis-master/         # Caching and coordination with Redis
        ├── keycloak-master/      # Keycloak-backed OAuth2/OIDC security
        ├── security-and-hardening/ # OWASP, input validation, Spring Security hardening
        ├── tdd-guide/              # Test-driven development
        ├── clean-code/             # DRY, KISS, YAGNI, Chesterton's Fence
        ├── java-code-review/       # Code review checklists
        ├── design-patterns/        # GoF patterns (Java)
        ├── jooq-master/          # Type-safe SQL and reporting with jOOQ
        ├── logging-master/       # SLF4J, MDC, structured logging
        ├── api-contract-review/    # REST API review
        ├── request-refactor-plan/  # Refactor planning
        ├── audit-codex/            # Cross-audit via Codex
        ├── spec-driven-development/  # Spec before code workflow
        ├── planning-and-task-breakdown/ # Task decomposition and sizing
        ├── incremental-implementation/ # Thin vertical slices
        ├── debugging-and-error-recovery/ # Systematic root-cause debugging
        ├── performance-optimization/ # Measure-first performance tuning
        ├── documentation-and-adrs/   # ADRs and documentation standards
        ├── ci-cd-and-automation/     # CI/CD pipelines and quality gates
        └── write-a-skill/          # Meta: create new skills
```

## WHERE TO LOOK
| Task | Location | Notes |
|------|----------|-------|
| AI workflow rules | `CLAUDE.md` | Plan mode, verification, TDD |
| Agents (all) | `.claude/agents/*.md` | 8 agents, invoke with @mention |
| Backend practice review | `.claude/skills/backend-practices-review/` | Trust boundaries, retries, storage/files, and lifecycle safety |
| Spring Boot structure | `.claude/skills/spring-boot-master/` | Controllers, services, repos |
| Spring Boot 3.x configs | `.claude/skills/spring-boot-engineer/` | WebFlux, Security, JPA setup |
| OpenAPI docs | `.claude/skills/openapi-master/` | springdoc, Swagger UI, contract-first tradeoffs |
| Observability | `.claude/skills/observability-master/` | Actuator, Micrometer, tracing, Prometheus |
| Resilience | `.claude/skills/resilience-master/` | Circuit breakers, retries, timeouts, bulkheads |
| Liquibase migrations | `.claude/skills/liquibase-master/` | changelogs, rollback, schema evolution |
| JPA/Hibernate | `.claude/skills/jpa-master/` | N+1 fixes, lazy loading, transactions |
| Maven module structure | `.claude/skills/maven-master/` | Parent POMs, modules, BOMs, build commands |
| PostgreSQL design | `.claude/skills/postgres-master/` | Tables, constraints, indexes, JSONB, partitioning |
| Blaze-Persistence | `.claude/skills/blaze-persistence/` | Entity views, keyset pagination, CriteriaBuilder |
| Kafka messaging | `.claude/skills/kafka-master/` | Producers, consumers, DLT, retry |
| Redis caching | `.claude/skills/redis-master/` | @Cacheable, pub/sub, rate limiting |
| Security (OAuth2) | `.claude/skills/keycloak-master/` | JWT, realm roles, @PreAuthorize |
| TDD workflow | `.claude/skills/tdd-guide/` | Red-green-refactor, TestContainers |
| Clean Code | `.claude/skills/clean-code/` | DRY, KISS, YAGNI, naming |
| Code review | `.claude/skills/java-code-review/` | Null safety, concurrency checks |
| Design patterns | `.claude/skills/design-patterns/` | Factory, Builder, Strategy, etc. |
| Type-safe SQL | `.claude/skills/jooq-master/` | jOOQ for complex queries |
| Logging | `.claude/skills/logging-master/` | SLF4J, MDC, structured JSON |
| API review | `.claude/skills/api-contract-review/` | HTTP semantics, versioning |
| Refactor planning | `.claude/skills/request-refactor-plan/` | Safe staged refactor plans and rollout steps |
| Codex audit | `.claude/skills/audit-codex/` | External Codex-based second-opinion review |
| Security hardening | `.claude/skills/security-and-hardening/` | OWASP, input validation, Spring Security, secrets |
| Spec before code | `.claude/skills/spec-driven-development/` | Feature specs, assumptions, gated phases |
| Task breakdown | `.claude/skills/planning-and-task-breakdown/` | Decompose features, sizing, dependency order |
| Incremental delivery | `.claude/skills/incremental-implementation/` | Vertical slices, scope discipline, feature flags |
| Debugging workflow | `.claude/skills/debugging-and-error-recovery/` | Reproduce, localize, fix root cause, guard |
| Performance tuning | `.claude/skills/performance-optimization/` | Measure first, N+1, caching, pool sizing |
| ADRs & documentation | `.claude/skills/documentation-and-adrs/` | Architecture decisions, JavaDoc, module docs |
| CI/CD pipelines | `.claude/skills/ci-cd-and-automation/` | GitHub Actions, quality gates, Docker builds |
| Create new skill | `.claude/skills/write-a-skill/` | Author Claude skills with thin mains and references |

Generic Java skills should stay framework-neutral by default. Route to `spring-boot-engineer` only when Spring or Spring Boot-specific implementation work is explicitly requested.

## MAVEN CONVENTIONS
- **Group ID**: `vn.lukepham.projects` (hardcoded)
- **Root artifact**: Reactor artifact should match the project directory name
- **Child modules**: Use explicit suffix-based artifact IDs such as `my-project-common` and `my-project-service`
- **Versioning**: Semantic (major.minor.patch) — bump PATCH on release
- **Java**: 17+ (records, sealed types, pattern matching)
- **Spring Boot**: 3.x preferred
- **Wrapper**: Use `./mvnw` commands from the root reactor POM

## CODE CONVENTIONS
**Mandatory:**
- **No Lombok** — explicit getters/setters/constructors
- Service and handwritten DAO layers should use explicit interfaces with `Impl` implementations
- **TDD required** — tests first, then code (see CLAUDE.md)
- **Both positive & negative tests** for all code
- **Latest dependencies** — keep versions current

**Style:**
- Records for immutable DTOs
- Constructor injection (no @Autowired fields)
- Prefer a Maven multi-module layout for Java projects: root parent/aggregator POM plus child modules
- Layer separation inside each application module: Controller → Service → Repository
- Spring Security owns authentication through `SecurityFilterChain` / resource-server filters; controllers expose business APIs rather than `/login` flows by default
- Minimize code — keep changes simple

## COMMANDS (8 slash commands)

| Command | Purpose |
|---------|---------|
| `/spec` | Write a structured specification before coding |
| `/plan` | Break work into sized tasks with dependency ordering |
| `/build` | Implement next task incrementally with TDD |
| `/test` | TDD workflow; Prove-It pattern for bug fixes |
| `/review` | Five-axis code review (correctness, concurrency, security, performance, maintainability) |
| `/simplify` | Reduce complexity without changing behavior |
| `/debug` | Systematic root-cause debugging with six-step triage |
| `/launch` | Pre-launch checklist for production deployment |

## ANTI-PATTERNS (THIS PROJECT)
- Never use Lombok
- Never skip tests
- Never commit without verification
- Never generate code without corresponding tests
- Never use field injection
- Never expose entities through API
- Never use ddl-auto:create in production

## COMMANDS
```bash
# Build & Test
./mvnw clean package               # Build with tests
./mvnw test                        # Run all tests
./mvnw test -Dtest=ClassName       # Single test class
./mvnw test -Dtest=ClassName#method  # Single test method
./mvnw package -DskipTests         # Build without tests (discouraged)

# Maven wrapper (if not present)
mvn wrapper:wrapper                 # Generate mvnw
```

## NOTES
- This template includes NO application source code — you start from scratch
- Docker Compose for dependencies: create `docker-compose.yml` as needed
- GitHub Actions CI: create `.github/workflows/` as needed
- 31 skills have `references/` subdirs with supplementary documentation
