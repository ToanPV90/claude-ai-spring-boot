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

The existing-project mode injects `.claude/` (agents + skills) into your project. It skips `pom.xml`, `CLAUDE.md`, and `AGENTS.md` if they already exist.

**Install from GitHub (no npm publish needed):**

```bash
# One-time global install directly from GitHub
npm install -g github:ToanPV90/claude-ai-spring-boot
create-claude-spring-boot my-project

# Or use npx directly from GitHub (no install step)
npx github:ToanPV90/claude-ai-spring-boot my-project

# Existing project — inject .claude/ into current directory
npx github:ToanPV90/claude-ai-spring-boot
```

**Fully offline (after cloning the repo):**

```bash
git clone git@github.com:ToanPV90/claude-ai-spring-boot.git
node claude-ai-spring-boot/bin/create.js my-project
```

```shell
.
├── .claude
│   ├── agents
│   │   ├── code-reviewer.md
│   │   ├── devops-engineer.md
│   │   ├── docker-expert.md
│   │   ├── java-architect.md
│   │   ├── kubernetes-specialist.md
│   │   ├── security-engineer.md
│   │   ├── spring-boot-engineer.md
│   │   └── test-automator.md
│   ├── settings.local.json
│   └── skills
│       ├── README.md
│       ├── api-contract-review
│       │   └── SKILL.md
│       ├── clean-code
│       │   └── SKILL.md
│       ├── design-patterns
│       │   └── SKILL.md
│       ├── java-architect
│       │   ├── SKILL.md
│       │   └── references
│       │       ├── jpa-optimization.md
│       │       ├── reactive-webflux.md
│       │       ├── spring-boot-setup.md
│       │       ├── spring-security.md
│       │       └── testing-patterns.md
│       ├── java-code-review
│       │   └── SKILL.md
│       ├── jpa-patterns
│       │   └── SKILL.md
│       ├── logging-patterns
│       │   └── SKILL.md
│       ├── spring-boot-engineer
│       │   ├── SKILL.md
│       │   └── references
│       │       ├── cloud.md
│       │       ├── data.md
│       │       ├── security.md
│       │       ├── testing.md
│       │       └── web.md
│       └── spring-boot-patterns
│           └── SKILL.md
├── CLAUDE.md
├── README.md
└── pom.xml
```
