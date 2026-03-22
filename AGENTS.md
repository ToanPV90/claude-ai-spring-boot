# PROJECT KNOWLEDGE BASE

**Generated:** 2026-03-22
**Commit:** 36f1e4e
**Branch:** main

## OVERVIEW
NPM scaffolding tool that creates Spring Boot projects with Claude AI agents/skills pre-configured. Not a Spring Boot app itself—generates them.

## STRUCTURE
```
./
├── bin/create.js          # CLI entry point (npx create-claude-spring-boot)
├── template/              # Actual Spring Boot template copied to new projects
│   ├── pom.xml            # Maven config template
│   ├── AGENTS.md          # Template project docs
│   ├── CLAUDE.md          # Template AI instructions
│   └── .claude/           # Pre-configured agents & skills
├── .claude/               # Meta-level: skills for THIS scaffolding project
└── package.json           # NPM package metadata
```

## WHERE TO LOOK
| Task | Location | Notes |
|------|----------|-------|
| Modify CLI behavior | `bin/create.js` | 63 lines, copies template/ to target |
| Update Spring Boot template | `template/*` | What users get after scaffolding |
| Add/modify agents | `.claude/agents/*.md` | 8 agent definitions |
| Add/modify skills | `.claude/skills/*/SKILL.md` | Spring Boot focused |
| Template instructions | `template/AGENTS.md`, `template/CLAUDE.md` | User-facing docs |

## KEY DISTINCTIONS
**Root vs Template:**
- **Root `.claude/`**: Meta-level skills/agents for scaffolding tool development
- **`template/.claude/`**: What users get—Spring Boot specific skills/agents
- Root AGENTS.md/CLAUDE.md: Instructions for maintaining THIS tool
- template/ versions: Instructions for generated Spring Boot projects

## CONVENTIONS
**NPM Package:**
- `package.json` bin: `create-claude-spring-boot` → `bin/create.js`
- Files published: `bin/`, `template/` only (via `files` field)
- Engines: Node.js ≥18

**Template Rules (what users get):**
- Group ID: `vn.lukepham.projects` (hardcoded)
- Artifact name: must match project directory name
- **No Lombok**—explicit getters/setters/constructors
- Semantic versioning: bump PATCH on each release
- Maven wrapper: `./mvnw` commands
- TDD mandatory: both positive/negative tests

## ANTI-PATTERNS (THIS TEMPLATE GENERATOR)
**From CLAUDE.md:**
- Never use Lombok in templates
- Never generate code without corresponding tests
- Never skip verification steps
- Minimize generated code—keep it simple

## COMMANDS
**Development:**
```bash
# Test locally
npm link                                    # Link for local testing
create-claude-spring-boot test-project     # Create test project

# Publish
npm version patch                           # Bump version
npm publish                                 # Push to registry
```

**User-facing (after install):**
```bash
npx create-claude-spring-boot my-app        # Scaffold new project
cd my-app
claude .                                     # Open in Claude
```

## NOTES
- This is a **meta-project**: creates Spring Boot templates, not an app itself
- No Java source in root—Java lives in generated projects (template/ defines structure)
- Root pom.xml is minimal (just metadata)—template/pom.xml is the real template
- CLI uses Node.js fs operations to copy `template/` recursively
- Skills in `.claude/skills/` target Spring Boot patterns (JPA, Redis, Kafka, Keycloak, etc.)

## SUBDIRECTORY DOCS
- `template/AGENTS.md` — Instructions for generated Spring Boot projects (see below)
