---
name: tdd-guide
description: Workflow guidance for practicing Test-Driven Development in Java Spring Boot using a strict red-green-refactor loop and behavior-first test selection. Use when building or fixing Spring Boot code test-first, choosing the right test slice, or keeping implementation work anchored to a failing test.
license: MIT
metadata:
  author: local
  version: "1.1.0"
  domain: testing
  triggers:
    - TDD
    - test-driven development
    - red-green-refactor
    - failing test
    - test first
    - integration test
    - unit test
    - MockMvc
    - TestContainers
    - @WebMvcTest
    - @DataJpaTest
  role: workflow
  scope: process
  output-format: code + guidance
  related-skills: spring-boot-engineer, java-architect, java-code-review, kafka-patterns, redis-patterns, jpa-patterns
---

# TDD Guide — Java Spring Boot

Own the workflow, not every framework-specific testing recipe.

## When to Use

- The user wants strict red-green-refactor discipline
- A new feature or bug fix should start from a failing test
- You need to choose between controller, service, repository, and full integration tests
- The work risks drifting into code-first implementation instead of behavior-first slices

## When Not to Use

- The task is Kafka-specific test mechanics; use `kafka-patterns`
- The task is Redis-specific caching or RedisTemplate tests; use `redis-patterns`
- The task is JPA fetch/query troubleshooting rather than TDD workflow; use `jpa-patterns`
- The task is generic implementation scaffolding after the test type is already chosen; use `spring-boot-engineer`

## Reference Guide

| Topic | File | Load When |
|------|------|-----------|
| Spring Boot TDD examples and patterns | `references/patterns.md` | You need concrete `@WebMvcTest`, `@DataJpaTest`, service, or integration examples |
| Test type selection | `references/test-type-selection.md` | You need more detail on which test slice to choose and what each one should prove |
| Common TDD gotchas | `references/gotchas.md` | The work is drifting into code-first, fragile tests, or over-broad integration coverage |

## Symptom Triage

| Symptom | Default Move |
|--------|--------------|
| Started writing production code before a failing test exists | Stop and write the smallest failing behavior test first |
| Unsure what test layer to start with | Use `references/test-type-selection.md` |
| New feature touches HTTP contract | Start with `@WebMvcTest` |
| Complex persistence/query behavior is the risk | Start with `@DataJpaTest` or route to `jpa-patterns` |
| Async Kafka/Redis behavior is the risk | Keep the workflow here, but load the specialist testing reference |

## Red-Green-Refactor Ladder

1. Pick one behavior slice.
2. Write the smallest test that describes that behavior.
3. Run it and confirm it fails for the right reason.
4. Add the minimum production code to go green.
5. Assess refactoring only after green; skip it if there is no clear value.
6. Repeat for the next behavior slice.

## Quick Mapping

| Concern | Default Test |
|--------|---------------|
| HTTP routing / validation / response shape | `@WebMvcTest` |
| Pure business logic | JUnit 5 + Mockito |
| Custom repository/query behavior | `@DataJpaTest` + real database |
| End-to-end feature wiring | `@SpringBootTest` + TestContainers |
| Kafka flow | Workflow here + `kafka-patterns/references/testing.md` |
| Redis flow | Workflow here + `redis-patterns/references/testing.md` |

## Constraints

### MUST DO

| Rule | Why |
|------|-----|
| Start with a failing test before production code | TDD without RED is just delayed testing |
| Confirm the failure is meaningful | Avoid false-red tests that fail for the wrong reason |
| Choose the narrowest test that covers the behavior | Keeps feedback fast and failure diagnosis clear |
| Reassess refactoring after green | Preserves the real red-green-refactor loop |

### MUST NOT DO

- Do not write “future-proof” production code before a failing test needs it.
- Do not use `Thread.sleep()` to wait for async behavior.
- Do not let specialist testing examples bloat this workflow skill; route out to the owning skill.
- Do not treat full integration tests as the default starting point for every feature.

## Gotchas

- A green test that proves the wrong thing is not progress.
- Teams often skip the REFACTOR check entirely once a test passes; this skill requires the assessment, even when the answer is “no refactor needed.”
- Workflow guidance should stay here, but framework-specific test mechanics should live in the specialist skill that owns that subsystem.

## Minimal Workflow

```text
RED   -> write one failing behavior test
GREEN -> implement the minimum code to pass
REFACTOR -> improve only if it clearly helps
```

## What to Verify

- every production change in the slice traces back to a prior failing test
- the chosen test layer is the narrowest one that still proves the behavior
- negative paths exist alongside the happy path
- async or infrastructure-heavy tests use the owning specialist reference instead of ad hoc mechanics

## See References

- [Patterns](references/patterns.md)
- [Test Type Selection](references/test-type-selection.md)
- [Gotchas](references/gotchas.md)
