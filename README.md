# Claude Code Template for Spring Boot Application

This template provides a structured starting point for Spring Boot applications, optimized for Claude AI's code completion capabilities. It includes essential configurations and best practices to streamline development and enhance productivity.

## Quick Start

**New project:**

```bash
npx create-claude-spring-boot my-project
cd my-project
claude .
```

**Existing project** (run inside your project directory):

```bash
cd my-existing-project
npx create-claude-spring-boot
claude .
```

The existing-project mode refreshes the shipped `.claude/agents/` and `.claude/skills/` trees even if your project already has a `.claude/` directory. It preserves existing `settings.local.json`, preserves custom local skill folders that are not managed by the template, and removes stale managed files that were shipped by an older scaffold version. It still skips `pom.xml`, `CLAUDE.md`, and `AGENTS.md` if they already exist.

**Install from GitHub (no npm publish needed):**

```bash
# One-time global install directly from GitHub
npm install -g github:ToanPV90/claude-ai-spring-boot
create-claude-spring-boot my-project

# Or use npx directly from GitHub (no install step)
npx github:ToanPV90/claude-ai-spring-boot my-project

# Existing project — refresh managed Claude skills/agents in current directory
npx github:ToanPV90/claude-ai-spring-boot
```

**Fully offline (after cloning the repo):**

```bash
git clone git@github.com:ToanPV90/claude-ai-spring-boot.git
node claude-ai-spring-boot/bin/create.js my-project
```

```shell
.
├── .claude/
│   ├── agents/               # 8 specialized agents
│   ├── settings.local.json
│   └── skills/
│       ├── README.md
│       ├── api-contract-review/
│       ├── audit-codex/
│       ├── backend-practices-review/
│       ├── blaze-persistence/
│       ├── clean-code/
│       ├── design-patterns/
│       ├── java-architect/
│       ├── java-code-review/
│       ├── jpa-master/
│       ├── jooq-master/
│       ├── kafka-master/
│       ├── keycloak-master/
│       ├── liquibase-master/
│       ├── logging-master/
│       ├── maven-master/
│       ├── observability-master/
│       ├── openapi-master/
│       ├── postgres-master/
│       ├── redis-master/
│       ├── request-refactor-plan/
│       ├── resilience-master/
│       ├── spring-boot-engineer/
│       ├── spring-boot-master/
│       ├── tdd-guide/
│       └── write-a-skill/
├── CLAUDE.md
├── README.md
├── pom.xml                # Root parent + aggregator POM
├── common/
│   └── pom.xml            # Shared contracts / reusable types
└── service/
    └── pom.xml            # Deployable Spring Boot application module
```

The generated skill tree now ships with **25 skills**. **24** of them use `references/` for deeper examples and troubleshooting so the main `SKILL.md` files stay thin and high-signal. Generic Java skills stay framework-neutral by default, and framework-specific skills such as `spring-boot-engineer` should only take over when the request explicitly names Spring Boot or another framework-specific stack. The catalog now also includes `backend-practices-review` for auditing recurring backend production risks such as weak trust boundaries, retry-unsafe mutations, fragile dependency calls, unsafe file handling, and missing lifecycle/cleanup discipline, while the review-oriented skills share a common intake/output contract so review target, completeness, severity, and disposition stay explicit. Within Spring Boot modules, prefer a layered structure (`Controller → Service → Repository`) and let Spring Security authenticate through the filter chain / resource-server support instead of teaching custom `/login` controllers for bearer-token APIs.
