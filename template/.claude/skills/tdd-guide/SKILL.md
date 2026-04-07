---
name: tdd-guide
description: Workflow guidance for practicing Test-Driven Development in Java using a strict red-green-refactor loop and behavior-first test selection. Use when building or fixing Java code test-first, choosing the right test level, or keeping implementation work anchored to a failing test.
license: MIT
metadata:
  author: local
  version: "1.2.0"
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
  related-skills: spring-boot-engineer, java-architect, java-code-review, kafka-master, redis-master, jpa-master
---

# TDD Guide — Java

Own the workflow, not every framework-specific testing recipe. Stay Java-first until a specific stack is explicit.

## When to Use

- The user wants strict red-green-refactor discipline
- A new feature or bug fix should start from a failing test
- You need to choose between unit, repository, integration, and framework-specific tests
- The work risks drifting into code-first implementation instead of behavior-first slices

## When Not to Use

- The task is Kafka-specific test mechanics; use `kafka-master`
- The task is Redis-specific caching or RedisTemplate tests; use `redis-master`
- The task is JPA fetch/query troubleshooting rather than TDD workflow; use `jpa-master`
- The task is explicit Spring Boot implementation scaffolding after the test type is already chosen; use `spring-boot-engineer`

## Reference Guide

| Topic | File | Load When |
|------|------|-----------|
| Spring Boot TDD examples and patterns (only when Spring Boot is explicit) | `references/patterns.md` | You need concrete `@WebMvcTest`, `@DataJpaTest`, service, or integration examples after the work is already Spring-specific |
| Test type selection | `references/test-type-selection.md` | You need more detail on which test slice to choose and what each one should prove |
| Common TDD gotchas | `references/gotchas.md` | The work is drifting into code-first, fragile tests, or over-broad integration coverage |

## Symptom Triage

| Symptom | Default Move |
|--------|--------------|
| Started writing production code before a failing test exists | Stop and write the smallest failing behavior test first |
| Unsure what test layer to start with | Use `references/test-type-selection.md` |
| New feature touches an HTTP contract in Spring Boot | Start with `@WebMvcTest` |
| Complex persistence/query behavior is the risk | Start with `@DataJpaTest` or route to `jpa-master` |
| Async Kafka/Redis behavior is the risk | Keep the workflow here, but load the specialist testing reference |

## Red-Green-Refactor Ladder

1. Pick one behavior slice.
2. Write the smallest test that describes that behavior.
3. Run it and confirm it fails for the right reason.
4. Add the minimum production code to go green.
5. Assess refactoring only after green; skip it if there is no clear value.
6. Repeat for the next behavior slice.

## Prove-It Pattern for Bug Fixes

When fixing a bug, never fix first. Follow this strict order:

1. **Reproduce** — Write a test that triggers the exact bug. It MUST fail (RED).
2. **Fix** — Apply the minimal production change to make the reproduction test pass (GREEN).
3. **Verify** — Confirm the fix does not break existing tests.
4. **Refactor** — Clean up only if clearly needed.

A bug fix without a prior failing reproduction test is an unproven guess. The reproduction test is the proof that the bug existed and the proof that it is gone.

## Test Size Mapping

| Size | Scope | I/O | Typical Duration | Java / Spring Boot Example |
|------|-------|-----|------------------|---------------------------|
| **Small** | Single JVM, single thread | No I/O, no network, no disk | Milliseconds | Pure unit tests — JUnit 5, plain Java classes |
| **Medium** | Multi-process or single JVM with localhost I/O | Localhost only (embedded DB, in-process servlet) | Seconds | `@DataJpaTest`, `@WebMvcTest`, `@JdbcTest` |
| **Large** | External systems, real infrastructure | Network, containers, external services | Seconds to minutes | `@SpringBootTest` + Testcontainers, WireMock |

Default to the smallest size that proves the behavior. Promote to a larger size only when the risk lives in the boundary the larger test covers.

## Quick Mapping

| Concern | Default Test |
|--------|---------------|
| HTTP routing / validation / response shape in Spring Boot | `@WebMvcTest` |
| Pure business logic | JUnit 5 (prefer real implementations; use mocks sparingly — see Mock Skepticism below) |
| Custom repository/query behavior | `@DataJpaTest` + real database |
| End-to-end feature wiring | `@SpringBootTest` + TestContainers |
| Kafka flow | Workflow here + `kafka-master/references/testing.md` |
| Redis flow | Workflow here + `redis-master/references/testing.md` |

## Mock Skepticism

Prefer real implementations over test doubles. When a real dependency is too slow or non-deterministic, reach for the lightest alternative first:

**Real → Fake (in-memory) → Stub → Mock**

| Level | When to use | Example |
|-------|------------|---------|
| **Real** | Fast, deterministic, no external I/O | Domain services, value objects, utility classes |
| **Fake (in-memory)** | Real impl is slow but contract is simple | In-memory repository, H2 instead of Postgres for unit scope |
| **Stub** | Only the return value matters | `when(clock.instant()).thenReturn(fixed)` |
| **Mock (verify interactions)** | Behavior at a slow/non-deterministic boundary is the thing under test | Verify an email service was called with correct args |

Mocks that verify internal wiring rather than boundary behavior make tests brittle and coupled to implementation. If a refactor breaks a mock-heavy test but the feature still works, the test was wrong, not the refactor.

## Constraints

### MUST DO

| Rule | Why |
|------|-----|
| Start with a failing test before production code | TDD without RED is just delayed testing |
| Confirm the failure is meaningful | Avoid false-red tests that fail for the wrong reason |
| Choose the narrowest test that covers the behavior | Keeps feedback fast and failure diagnosis clear |
| Reassess refactoring after green | Preserves the real red-green-refactor loop |
| Keep tests self-contained and readable (DAMP over DRY) | Duplication in tests is acceptable when it makes each test independently understandable; a reader should grasp a test without chasing shared helpers |

### MUST NOT DO

- Do not write “future-proof” production code before a failing test needs it.
- Do not use `Thread.sleep()` to wait for async behavior.
- Do not let specialist testing examples bloat this workflow skill; route out to the owning skill.
- Do not treat full integration tests as the default starting point for every feature.

## Common Rationalizations

| Rationalization | Reality |
|----------------|---------|
| "I'll test it all at the end" | Bugs compound; late testing finds symptoms, not root causes, and the cost to fix grows with every layer built on top |
| "This code is too simple to test" | Simple code grows complex. The test documents intent and catches regressions when the next person changes it |
| "Writing tests slows me down" | Writing tests slows you down today; debugging untested code slows the whole team down next week |
| "I'll just manually verify it" | Manual verification is non-repeatable, invisible to CI, and forgotten after the first deploy |
| "Mocks make this test easy" | Mocks make the test easy to write but hard to trust — a passing mock test does not prove the system works |
| "The integration test covers this already" | Integration tests are slow and failures are hard to diagnose; a fast unit test pinpoints the broken behavior |

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
