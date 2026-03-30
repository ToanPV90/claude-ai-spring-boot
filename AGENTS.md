# PROJECT KNOWLEDGE BASE

**Generated:** 2026-03-27
**Commit:** b43d366
**Branch:** main

## OVERVIEW
NPM scaffolding tool that creates Spring Boot projects with Claude AI agents/skills pre-configured. Not a Spring Boot app itself—generates them.

## STRUCTURE
```
./
├── bin/create.js          # CLI entry point (npx create-claude-spring-boot)
├── template/              # Actual Spring Boot template copied to new projects
│   ├── pom.xml            # Maven config template (__PROJECT_NAME__ placeholder)
│   ├── AGENTS.md          # Template project docs (user-facing)
│   ├── CLAUDE.md          # Template AI instructions (user-facing)
│   └── .claude/           # Pre-configured agents & mirrored skills
├── .claude/               # Meta-level skills/agents for THIS scaffolding project
└── package.json           # NPM package metadata
```

## WHERE TO LOOK
| Task | Location | Notes |
|------|----------|-------|
| Modify CLI behavior | `bin/create.js` | 100 lines, copies template/ to target |
| Update Spring Boot template | `template/*` | What users get after scaffolding |
| Add/modify agents | `.claude/agents/*.md` | 8 agent definitions |
| Add/modify skills | `.claude/skills/*/SKILL.md` | 25 skills across 6 categories |
| Template instructions | `template/AGENTS.md`, `template/CLAUDE.md` | User-facing docs |

## KEY DISTINCTIONS
**Root vs Template:**
- **Root `.claude/`**: Meta-level skills/agents for scaffolding tool development
- **`template/.claude/`**: What users get—Spring Boot specific skills/agents
- Root AGENTS.md/CLAUDE.md: Instructions for maintaining THIS tool
- template/ versions: Instructions for generated Spring Boot projects

**⚠️ Drift Risk:** Root and template `.claude/` are near-identical copies. Changes to one MUST be manually synced to the other.

## SKILLS CATALOG (25 skills, 6 categories)

**Code Quality:** java-code-review, api-contract-review, backend-practices-review, clean-code, audit-codex
**Architecture & Design:** design-patterns, java-architect, maven-master, request-refactor-plan
**Testing & TDD:** tdd-guide
**Framework, Data & Platform:** spring-boot-engineer, spring-boot-master, openapi-master, observability-master, resilience-master, liquibase-master, jpa-master, postgres-master, blaze-persistence, jooq-master, logging-master, kafka-master, redis-master
**Security:** keycloak-master
**Skill Authoring:** write-a-skill

24 skills have `references/` subdirs with supplementary docs.

Generic Java skills should stay framework-neutral by default. Route to `spring-boot-engineer` only when Spring or Spring Boot-specific implementation work is explicitly requested.

## AGENTS (8 total)

| Agent | Specialization |
|-------|---------------|
| java-architect | Enterprise Java, framework-neutral architecture, cloud-native |
| spring-boot-engineer | Spring Boot 3.x, WebFlux, Security |
| test-automator | Unit, integration, slice, contract tests |
| security-engineer | DevSecOps, cloud security, compliance |
| devops-engineer | CI/CD, monitoring, infrastructure |
| docker-expert | Docker containers for Spring Boot |
| kubernetes-specialist | K8s manifests, Helm charts |
| code-reviewer | Code quality, security, best practices |

All agents: `model: sonnet`, invoke with `@agent-name`.

## CONVENTIONS
**NPM Package:**
- `package.json` bin: `create-claude-spring-boot` → `bin/create.js`
- Files published: `bin/`, `template/` only (via `files` field)
- Engines: Node.js ≥18
- Zero npm dependencies

**Template Rules (what users get):**
- Group ID: `vn.lukepham.projects` (hardcoded)
- Root reactor artifact should match the project directory name; child module artifactIds should be explicit and suffix-based (for example `my-project-service`)
- **No Lombok**—explicit getters/setters/constructors
- Service and handwritten DAO layers should use explicit interfaces with `Impl` implementations
- Semantic versioning: bump PATCH on each release
- Maven wrapper: `./mvnw` commands from the root reactor POM
- TDD mandatory: both positive/negative tests
- Maven multi-module structure is the preferred Java project layout: root parent/aggregator POM plus child modules
- Layered Spring structure is the default inside each application module: Controller → Service → Repository
- Spring Security guidance should assume filter-chain/resource-server authentication, not custom `/login` controllers, unless a project explicitly owns first-party credential auth

## ANTI-PATTERNS (THIS TEMPLATE GENERATOR)
- Never use Lombok in templates
- Never generate code without corresponding tests
- Never skip verification steps
- Minimize generated code—keep it simple
- Never let root and template `.claude/` drift apart

## COMMANDS
**Development:**
```bash
npm link                                    # Link for local testing
create-claude-spring-boot test-project      # Create test project
npm version patch && npm publish            # Bump + publish
```

**User-facing (after install):**
```bash
npx create-claude-spring-boot my-app        # Scaffold new project
cd my-app && claude .                        # Open in Claude
```

## NOTES
- **Meta-project**: creates Spring Boot templates, not an app itself
- No Java source in root—Java lives in generated projects
- Root pom.xml is minimal (metadata only)—template/pom.xml is the real template
- CLI uses Node.js fs to copy `template/` recursively + substitute `__PROJECT_NAME__`; existing-project mode refreshes managed `.claude/agents` and `.claude/skills`, preserves local settings/custom skills, and prunes stale managed files via a tracked manifest while leaving existing root docs in place
- `settings.local.json` has hardcoded path (`/Users/pminkows/...`) — generalize before release
- Root and template skill trees should stay byte-for-byte aligned; run `npm run verify:skills` after skill edits

## SUBDIRECTORY DOCS
- `template/AGENTS.md` — Instructions for generated Spring Boot projects
