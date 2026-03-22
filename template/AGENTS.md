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
    │   └── ...                # See agents/ for full list
    └── skills/            # Spring Boot skills & patterns
        ├── spring-boot-patterns/  # Core patterns
        ├── jpa-patterns/          # JPA/Hibernate
        ├── kafka-patterns/        # Event-driven
        ├── redis-patterns/        # Caching
        ├── keycloak-patterns/     # OAuth2/OIDC
        └── ...                    # 17 skills total (see .claude/skills/)
```

## WHERE TO LOOK
| Task | Location | Notes |
|------|----------|-------|
| AI workflow rules | `CLAUDE.md` | Plan mode, verification, TDD |
| Specialized agents | `.claude/agents/*.md` | java-architect, spring-boot-engineer, etc. |
| Spring Boot patterns | `.claude/skills/spring-boot-patterns/` | Controllers, services, repos |
| JPA patterns | `.claude/skills/jpa-patterns/` | N+1 fixes, lazy loading |
| Security patterns | `.claude/skills/keycloak-patterns/` | OAuth2, JWT |
| Testing patterns | `.claude/skills/tdd-guide/` | Red-green-refactor |
| Clean Code | `.claude/skills/clean-code/` | DRY, KISS, YAGNI |

## MAVEN CONVENTIONS
- **Group ID**: `vn.lukepham.projects` (hardcoded)
- **Artifact name**: Must match project directory name
- **Versioning**: Semantic (major.minor.patch) — bump PATCH on release
- **Java**: 17+ (records, sealed types, pattern matching)
- **Spring Boot**: 3.x preferred
- **Wrapper**: Use `./mvnw` commands (Maven wrapper included)

## CODE CONVENTIONS
**Mandatory:**
- **No Lombok** — explicit getters/setters/constructors
- **TDD required** — tests first, then code (see CLAUDE.md)
- **Both positive & negative tests** for all code
- **Latest dependencies** — keep versions current

**Style:**
- Records for immutable DTOs
- Constructor injection (no @Autowired fields)
- Layer separation: Controller → Service → Repository
- Minimize code — keep changes simple

## ANTI-PATTERNS (THIS PROJECT)
**From CLAUDE.md (strictly enforced):**
- Never use Lombok
- Never skip tests
- Never commit without verification
- Never generate code without corresponding tests
- Never use field injection

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

## AGENTS & SKILLS QUICK START
**Load agent for task:**
```
claude> @java-architect implement WebFlux reactive endpoint
claude> @test-automator write integration tests with TestContainers
claude> @security-engineer add OAuth2 resource server
```

**Load skill for guidance:**
```
claude> use spring-boot-patterns for REST controller
claude> use jpa-patterns to fix N+1 query
claude> use tdd-guide for red-green-refactor
```

## NOTES
- This template includes NO application source code — you start from scratch
- Docker Compose for dependencies: create `docker-compose.yml` as needed
- GitHub Actions CI: create `.github/workflows/` as needed
- See `.claude/skills/README.md` for skill catalog
