---
name: maven-master
description: Design guidance for Maven multi-module Java projects with clear parent POM, module boundaries, dependency management, and build conventions. Use when structuring a Java/Spring repository into Maven modules, defining aggregator vs parent POM roles, or standardizing module-level build and dependency rules.
license: MIT
metadata:
  author: local
  version: "1.0.0"
  domain: architecture
  triggers:
    - Maven multi-module
    - Maven modules
    - parent pom
    - aggregator pom
    - dependencyManagement
    - pluginManagement
    - reactor build
    - multi-module Spring Boot
    - BOM module
    - Maven project structure
  role: specialist
  scope: architecture
  output-format: guidance + structure
  related-skills: java-architect, spring-boot-patterns, spring-boot-engineer, postgres-master, jooq-patterns, java-code-review
---

# Maven Master

Decision guide for structuring Java and Spring projects as Maven multi-module builds with explicit parent/aggregator roles, stable module boundaries, and predictable build behavior.

## When to Use
- The project should prefer Maven multi-module structure over a single flat module
- You need to define a parent POM, aggregator modules, or internal BOM/dependency management
- The codebase is splitting into shared libraries, application modules, starters, services, or platform modules
- CI, Docker, or test guidance must become module-aware instead of assuming one `pom.xml` and one `src/` tree

## When Not to Use
- The task is only controller/service/repository layering inside one module — use `spring-boot-patterns`
- The task is implementation inside already-settled modules — use `spring-boot-engineer`
- The task is high-level service decomposition or runtime architecture tradeoffs — use `java-architect`
- The task is Gradle or build-tool migration away from Maven — this skill does not own that decision

## Version Assumptions
- Maven 3.9+
- Java 21 by default for new generated projects
- Spring Boot 3.x modules where Spring Boot is involved
- Multi-module guidance assumes a root reactor POM with child module POMs checked into the same repo

## Reference Guide

| Topic | Reference | Load When |
|------|-----------|-----------|
| Parent POM, aggregator POM, BOM layering | `references/parent-and-aggregation.md` | Deciding root reactor shape or whether to separate parent, aggregator, and BOM roles |
| Module taxonomy and boundary choices | `references/module-boundaries.md` | Choosing `common`, `api`, `service`, `starter`, `platform`, or test modules |
| `dependencyManagement`, `pluginManagement`, and BOM usage | `references/dependency-and-plugin-management.md` | Centralizing versions/plugins and avoiding module drift |
| Build commands, CI, Docker, and verification patterns | `references/commands-and-ci.md` | Making commands, Dockerfiles, and pipelines module-aware |

## Symptom Triage

| Symptom | Likely Cause | Default Move |
|--------|--------------|--------------|
| One root module owns unrelated concerns | The repo is still pretending to be one deployable/application unit | Split into explicit child modules under a root reactor POM |
| Versions drift across modules | Dependencies/plugins are declared ad hoc in children | Centralize with `dependencyManagement` / `pluginManagement` |
| Shared code leaks everywhere | "common" module became a dumping ground | Re-draw module contracts around real ownership and API boundaries |
| Docker/CI assumes one `pom.xml` and one `src/` tree | Build guidance is still single-module | Make build steps target modules explicitly and copy module POMs separately |
| Parent POM is enormous and brittle | Aggregation, inheritance, and dependency catalogs are all mixed together | Separate concerns or at least document their roles explicitly |

## Module Decision Ladder

1. **Is this still one deployable unit?** Prefer a multi-module monolith before microservices when teams want clearer boundaries without distributed complexity.
2. **What belongs in the root POM?** Only shared coordinates, `dependencyManagement`, `pluginManagement`, and `<modules>`.
3. **Which modules are real contracts?** Pull out `common` or `api` modules only when multiple modules truly consume them.
4. **Should dependency catalogs be separated?** Use a BOM/dependencies module when version management deserves its own lifecycle or a clear import boundary.
5. **Are build/test commands module-aware?** Prefer `-pl`, `-am`, and aggregate verification patterns instead of assuming one flat target tree.

## Quick Mapping

| Situation | Default Choice | Prefer Instead Of |
|-----------|----------------|-------------------|
| New Spring Boot project expected to grow | Root reactor + `common` + deployable `service` module | One giant flat application module |
| Shared DTOs/contracts used by multiple modules | Dedicated `common` or `api` module | Copy-paste across service modules |
| Version alignment across many children | Parent `dependencyManagement` / optional BOM | Repeating dependency versions in each child |
| Shared plugin config | Parent `pluginManagement` | Version drift per child module |
| Partial builds in CI | `./mvnw -pl module -am test` | Rebuilding the entire reactor for every small change |

## Constraints

### MUST DO

| Rule | Preferred Pattern |
|------|-------------------|
| Keep a root reactor POM with `packaging=pom` | Parent/aggregator at repo root |
| Make child module responsibilities explicit | `common`, `api`, `service`, `starter`, `platform`, test modules only when justified |
| Centralize versions and plugin defaults | `dependencyManagement` and `pluginManagement` in the parent (or imported BOM where justified) |
| Keep build commands module-aware | Use `-pl`, `-am`, and aggregate verification intentionally |
| Align Spring layering inside modules | Layered packages still matter within each module |

### MUST NOT DO
- Do not treat Maven multi-module as a reason to split every package into its own child module
- Do not hardcode dependency versions repeatedly in child modules
- Do not create a `common` module that becomes a hidden ownership bypass for every team
- Do not let Dockerfiles or CI copy only one `pom.xml` when the project is multi-module
- Do not force Spring Boot plugin packaging on modules that are just shared libraries

## Gotchas
- A root POM can be both parent and aggregator, but those roles are still conceptually different.
- Multi-module structure does not replace layered Spring design; it adds another boundary above packages.
- A BOM/dependencies module is useful for larger OSS-style repos, but smaller apps can keep dependency management in the root parent POM.
- Reactor build order follows real inter-module dependencies, not the presence of `dependencyManagement` alone.

## Minimal Examples

### Root reactor
```xml
<packaging>pom</packaging>
<modules>
  <module>common</module>
  <module>service</module>
</modules>
```

### Child module
```xml
<parent>
  <groupId>vn.lukepham.projects</groupId>
  <artifactId>my-project</artifactId>
  <version>1.0.0</version>
</parent>
<artifactId>my-project-service</artifactId>
```

## What to Verify
- The root POM is clearly a reactor/parent, not an accidental app module
- Child modules have explicit responsibilities and naming
- Dependency/plugin versions are centralized rather than repeated
- Docker/CI/test commands match the multi-module layout
- Layered Spring guidance still applies inside each module

## See References
- `references/parent-and-aggregation.md` for parent vs aggregator vs BOM roles
- `references/module-boundaries.md` for module taxonomy and boundary rules
- `references/dependency-and-plugin-management.md` for version/plugin alignment
- `references/commands-and-ci.md` for module-aware build, Docker, and CI patterns
