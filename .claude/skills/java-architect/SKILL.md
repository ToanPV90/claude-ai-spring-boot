---
name: java-architect
description: Architecture guidance for enterprise Java and Spring systems with an emphasis on service boundaries, integration choices, resilience, security posture, and delivery tradeoffs. Use when deciding how a Spring Boot or cloud-native Java system should be structured before turning the work into concrete implementation.
license: MIT
metadata:
  author: local
  version: "1.2.0"
  domain: backend
  triggers:
    - Java architecture
    - Spring architecture
    - microservices architecture
    - service boundaries
    - system design
    - reactive vs blocking
    - Spring Cloud
    - enterprise Java
    - architecture tradeoffs
    - ADR
  role: specialist
  scope: architecture
  output-format: guidance + decisions
  related-skills: maven-master, spring-boot-patterns, spring-boot-engineer, design-patterns, jpa-patterns, keycloak-patterns, java-code-review
---

# Java Architect

Decision guide for shaping Java and Spring systems before committing to concrete implementation, framework wiring, or subsystem-specific optimization.

## When to Use
- The task is about service boundaries, module decomposition, sync vs async communication, or system-level tradeoffs
- A Spring Boot solution needs architectural defaults for data access, security posture, resilience, or deployment shape
- You need to choose between reactive and blocking models, monolith vs microservice boundaries, or shared library vs service ownership
- The user wants an architectural recommendation, ADR direction, or migration path before implementation starts
- The task includes module decomposition, parent/aggregator POM choices, or build-structure ownership — route to `maven-master`

## When Not to Use
- The task is mainly generating or modifying Spring Boot code — use `spring-boot-engineer`
- The task is parent POM, reactor/module layout, `dependencyManagement`, or `pluginManagement` structure — use `maven-master`
- The task is layering controllers, services, repositories, DTOs, or exception handling inside one application/module — use `spring-boot-patterns`
- The task is JPA query tuning, fetch strategy, or persistence troubleshooting — use `jpa-patterns`
- The task is mostly code review or bug-risk analysis — use `java-code-review`
- The task is implementation-level security wiring for OAuth2/JWT/roles — use `keycloak-patterns`

## Reference Guide

| Topic | Reference | Load When |
|------|-----------|-----------|
| Spring Boot setup, project structure, platform defaults | `references/spring-boot-setup.md` | Deciding package structure, starter selection, configuration defaults, and platform conventions |
| Reactive architecture and WebFlux/R2DBC tradeoffs | `references/reactive-webflux.md` | Choosing reactive vs blocking execution models or shaping reactive flows |
| JPA optimization and read/write data design | `references/jpa-optimization.md` | Evaluating repository strategy, projections, query tuning, or persistence performance tradeoffs |
| Spring Security architecture | `references/spring-security.md` | Choosing authentication, authorization, filter-chain, and token-validation approaches |
| Testing strategy for architecture decisions | `references/testing-patterns.md` | Selecting test layers, contract boundaries, integration coverage, and test infrastructure |

## Symptom Triage

| Symptom | Default Check | Likely Direction |
|--------|---------------|------------------|
| Service boundaries feel arbitrary | Are capabilities split by team convenience instead of domain ownership? | Re-draw boundaries around business capabilities and data ownership |
| Reactive code is hard to justify | Is the main need concurrency/streaming, or just normal request-response CRUD? | Default to blocking unless reactive constraints are real |
| Shared libraries keep leaking business rules | Are multiple services depending on a “common” module with changing domain logic? | Keep shared modules narrow; move business rules back to owning service |
| Security is spreading through every layer | Are controllers/services manually parsing roles or tokens? | Centralize with filter chain, converters, and policy boundaries |
| Data access design keeps oscillating | Are repositories doing both transactional writes and reporting-heavy reads? | Split write model from read/reporting model; route SQL-first cases as needed |

## Architecture Decision Ladder

1. **What business capability owns this behavior and data?** Start with the domain boundary, not the transport.
2. **Is one deployable unit enough?** Prefer a modular monolith until scale, coupling, or team autonomy justify service splits.
3. **Does the runtime need reactive behavior?** Choose reactive only for concrete throughput, latency, streaming, or connection-pressure reasons.
4. **Which integration style fits the failure model?** Use sync calls for immediate consistency and events for decoupling/time-shifted workflows.
5. **Which concerns should stay out of this decision?** Route layering to `spring-boot-patterns`, implementation to `spring-boot-engineer`, and subsystem tuning to specialist skills.

## Quick Mapping

| Situation | Default Choice | Prefer Instead Of |
|-----------|----------------|-------------------|
| Early product with one domain team | Modular monolith with clear Maven modules and layered packages | Premature microservices |
| High fan-out I/O or streaming workloads | Reactive/WebFlux only where needed | Blanket reactive adoption |
| Security across many entry points | Central security configuration + method policy | Ad hoc checks in controllers |
| Reporting-heavy reads beside transactional writes | Separate read model/query path | Forcing every read through the write model |
| Repeated architecture decisions | ADR + explicit tradeoffs | Tribal knowledge |

## Constraints

### MUST DO

| Rule | Preferred Pattern |
|------|-------------------|
| Start with domain boundaries | Model services/modules around business capability and ownership |
| Make tradeoffs explicit | Record key decisions with an ADR or equivalent lightweight note |
| Prefer the simpler deployable shape first | Monolith or modular monolith before microservices by default |
| Align consistency model with the use case | Sync for immediate consistency, async for decoupling and retries |
| Route subsystem depth outward | Use specialist skills for Maven structure, JPA, security wiring, and implementation detail |

### MUST NOT DO
- Do not treat architecture work as a request to generate every class and endpoint inline
- Do not split services only because microservices sound more scalable
- Do not recommend reactive stacks when the real workload is ordinary CRUD
- Do not let shared libraries become hidden cross-service domain ownership
- Do not duplicate detailed subsystem guidance already owned by `spring-boot-engineer`, `jpa-patterns`, or `keycloak-patterns`

## Gotchas

- “Enterprise architecture” advice becomes noise if it skips the actual tradeoff and jumps to buzzwords.
- A clean package structure does not prove the domain boundaries are right.
- Reactive designs often fail because teams adopt Reactor everywhere instead of only where the runtime constraint exists.
- Microservices reduce some coupling while increasing operational coupling; treat that as a cost, not a free upgrade.
- Architecture recommendations should shape implementation, not duplicate full implementation templates.

## Minimal Examples

### ADR framing
```markdown
# ADR-007: Keep Order and Billing in One Service for Phase 1

## Context
Order placement and billing changes are still tightly coupled and owned by one team.

## Decision
Keep a modular monolith boundary now; publish domain events internally for later extraction.

## Consequences
- Simpler deployment and transactions today
- Clear extraction seam later if team or scale changes
```

### Boundary recommendation
```text
Order write model stays in the core service.
Reporting reads move to a separate query path.
OAuth2/JWT wiring routes to keycloak-patterns.
Controller/service/repository shape routes to spring-boot-patterns.
```

## What to Verify
- The recommendation names the real tradeoff, not just the chosen technology
- Domain and data ownership are explicit
- Reactive, microservice, and event-driven choices are justified by workload or org needs
- Subsystem-specific implementation detail is routed to the right skill instead of duplicated here
- The output leaves a clear path for `spring-boot-engineer` or `spring-boot-patterns` to implement next

## See References
- `maven-master` for Maven multi-module structure, parent/aggregator roles, and module-aware build rules
- `references/spring-boot-setup.md` for Spring project structure and platform defaults inside a module or service
- `references/reactive-webflux.md` for reactive architecture and execution-model tradeoffs
- `references/jpa-optimization.md` for persistence strategy and performance depth
- `references/spring-security.md` for security architecture choices
- `references/testing-patterns.md` for test strategy around architecture decisions
